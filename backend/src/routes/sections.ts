import express from 'express';
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireCoordinatorOrAdmin, AuthRequest } from '../middleware/auth';
import { auditMiddleware } from '../middleware/audit';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const createSectionSchema = Joi.object({
  name: Joi.string().min(2).required(),
  gradeLevel: Joi.string().required(),
  schoolYear: Joi.string().required(),
  adviserId: Joi.string().optional()
});

const updateSectionSchema = Joi.object({
  name: Joi.string().min(2),
  gradeLevel: Joi.string(),
  schoolYear: Joi.string(),
  adviserId: Joi.string().allow(null)
});

// Get all sections
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const sections = await prisma.section.findMany({
      include: {
        adviser: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        _count: {
          select: {
            students: true,
            attendanceRecords: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ sections });
  } catch (error) {
    next(error);
  }
});

// Get section by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const section = await prisma.section.findUnique({
      where: { id },
      include: {
        adviser: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        students: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            lastName: true,
            middleName: true
          },
          orderBy: { lastName: 'asc' }
        },
        _count: {
          select: {
            attendanceRecords: true
          }
        }
      }
    });

    if (!section) {
      return res.status(404).json({
        error: 'Section not found',
        code: 'SECTION_NOT_FOUND'
      });
    }

    res.json({ section });
  } catch (error) {
    next(error);
  }
});

// Create new section
router.post('/', authenticateToken, requireCoordinatorOrAdmin, auditMiddleware('CREATE', 'sections'), async (req: AuthRequest, res, next) => {
  try {
    const { error, value } = createSectionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    const { name, gradeLevel, schoolYear, adviserId } = value;

    // Check if section name already exists
    const existingSection = await prisma.section.findUnique({
      where: { name }
    });

    if (existingSection) {
      return res.status(409).json({
        error: 'Section name already exists',
        code: 'SECTION_EXISTS'
      });
    }

    // Verify adviser exists if provided
    if (adviserId) {
      const adviser = await prisma.user.findUnique({
        where: { id: adviserId }
      });

      if (!adviser) {
        return res.status(404).json({
          error: 'Adviser not found',
          code: 'ADVISER_NOT_FOUND'
        });
      }
    }

    const section = await prisma.section.create({
      data: {
        name,
        gradeLevel,
        schoolYear,
        adviserId: adviserId || null
      },
      include: {
        adviser: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Section created successfully',
      section
    });
  } catch (error) {
    next(error);
  }
});

// Update section
router.put('/:id', authenticateToken, requireCoordinatorOrAdmin, auditMiddleware('UPDATE', 'sections'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { error, value } = updateSectionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    // Get existing section for audit
    const existingSection = await prisma.section.findUnique({
      where: { id }
    });

    if (!existingSection) {
      return res.status(404).json({
        error: 'Section not found',
        code: 'SECTION_NOT_FOUND'
      });
    }

    // Check if new name conflicts with existing sections
    if (value.name && value.name !== existingSection.name) {
      const conflictingSection = await prisma.section.findUnique({
        where: { name: value.name }
      });

      if (conflictingSection) {
        return res.status(409).json({
          error: 'Section name already exists',
          code: 'SECTION_EXISTS'
        });
      }
    }

    // Verify adviser exists if provided
    if (value.adviserId) {
      const adviser = await prisma.user.findUnique({
        where: { id: value.adviserId }
      });

      if (!adviser) {
        return res.status(404).json({
          error: 'Adviser not found',
          code: 'ADVISER_NOT_FOUND'
        });
      }
    }

    // Store old data for audit
    req.oldData = {
      name: existingSection.name,
      gradeLevel: existingSection.gradeLevel,
      schoolYear: existingSection.schoolYear,
      adviserId: existingSection.adviserId
    };

    const updatedSection = await prisma.section.update({
      where: { id },
      data: value,
      include: {
        adviser: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    res.json({
      message: 'Section updated successfully',
      section: updatedSection
    });
  } catch (error) {
    next(error);
  }
});

// Delete section
router.delete('/:id', authenticateToken, requireCoordinatorOrAdmin, auditMiddleware('DELETE', 'sections'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const existingSection = await prisma.section.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            students: true,
            attendanceRecords: true
          }
        }
      }
    });

    if (!existingSection) {
      return res.status(404).json({
        error: 'Section not found',
        code: 'SECTION_NOT_FOUND'
      });
    }

    // Check if section has students or attendance records
    if (existingSection._count.students > 0 || existingSection._count.attendanceRecords > 0) {
      return res.status(409).json({
        error: 'Cannot delete section with existing students or attendance records',
        code: 'SECTION_HAS_DATA',
        studentsCount: existingSection._count.students,
        attendanceRecordsCount: existingSection._count.attendanceRecords
      });
    }

    await prisma.section.delete({
      where: { id }
    });

    res.json({
      message: 'Section deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get section students
router.get('/:id/students', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const section = await prisma.section.findUnique({
      where: { id },
      include: {
        students: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            lastName: true,
            middleName: true,
            createdAt: true
          },
          orderBy: { lastName: 'asc' }
        }
      }
    });

    if (!section) {
      return res.status(404).json({
        error: 'Section not found',
        code: 'SECTION_NOT_FOUND'
      });
    }

    res.json({
      section: {
        id: section.id,
        name: section.name,
        gradeLevel: section.gradeLevel,
        schoolYear: section.schoolYear
      },
      students: section.students
    });
  } catch (error) {
    next(error);
  }
});

export default router;
