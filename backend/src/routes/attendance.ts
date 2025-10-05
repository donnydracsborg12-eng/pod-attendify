import express from 'express';
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireBeadleOrAbove, AuthRequest } from '../middleware/auth';
import { auditMiddleware } from '../middleware/audit';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const markAttendanceSchema = Joi.object({
  sectionId: Joi.string().required(),
  date: Joi.date().required(),
  records: Joi.array().items(
    Joi.object({
      studentId: Joi.string().required(),
      status: Joi.string().valid('present', 'absent').required(),
      notes: Joi.string().allow('').optional()
    })
  ).min(1).required()
});

const getAttendanceSchema = Joi.object({
  sectionId: Joi.string().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  studentId: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// Mark attendance for a section
router.post('/mark', authenticateToken, requireBeadleOrAbove, auditMiddleware('CREATE', 'attendance_records'), async (req: AuthRequest, res, next) => {
  try {
    const { error, value } = markAttendanceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    const { sectionId, date, records } = value;

    // Verify section exists
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: { students: true }
    });

    if (!section) {
      return res.status(404).json({
        error: 'Section not found',
        code: 'SECTION_NOT_FOUND'
      });
    }

    // Check if attendance already exists for this date
    const existingAttendance = await prisma.attendanceRecord.findMany({
      where: {
        sectionId,
        date: new Date(date)
      }
    });

    if (existingAttendance.length > 0) {
      return res.status(409).json({
        error: 'Attendance already marked for this date',
        code: 'ATTENDANCE_EXISTS',
        existingRecords: existingAttendance.length
      });
    }

    // Validate all students belong to the section
    const studentIds = records.map(r => r.studentId);
    const sectionStudentIds = section.students.map(s => s.id);
    
    const invalidStudents = studentIds.filter(id => !sectionStudentIds.includes(id));
    if (invalidStudents.length > 0) {
      return res.status(400).json({
        error: 'Some students do not belong to this section',
        code: 'INVALID_STUDENTS',
        invalidStudentIds: invalidStudents
      });
    }

    // Create attendance records
    const attendanceRecords = await prisma.attendanceRecord.createMany({
      data: records.map(record => ({
        studentId: record.studentId,
        sectionId,
        date: new Date(date),
        status: record.status as 'present' | 'absent',
        submittedBy: req.user!.id,
        notes: record.notes || null
      }))
    });

    res.status(201).json({
      message: 'Attendance marked successfully',
      recordsCreated: attendanceRecords.count,
      date,
      sectionId
    });
  } catch (error) {
    next(error);
  }
});

// Get attendance records
router.get('/', authenticateToken, requireBeadleOrAbove, async (req: AuthRequest, res, next) => {
  try {
    const { error, value } = getAttendanceSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    const { sectionId, startDate, endDate, studentId, page, limit } = value;
    const skip = (page - 1) * limit;

    // Build where clause based on user role
    let whereClause: any = {};

    if (req.user!.role === 'beadle') {
      // Beadles can only see their own submissions
      whereClause.submittedBy = req.user!.id;
    }

    if (sectionId) {
      whereClause.sectionId = sectionId;
    }

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate);
      if (endDate) whereClause.date.lte = new Date(endDate);
    }

    if (studentId) {
      whereClause.studentId = studentId;
    }

    const [records, total] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: whereClause,
        include: {
          student: {
            select: {
              id: true,
              studentNumber: true,
              firstName: true,
              lastName: true,
              middleName: true
            }
          },
          section: {
            select: {
              id: true,
              name: true,
              gradeLevel: true,
              schoolYear: true
            }
          },
          submittedByUser: {
            select: {
              id: true,
              fullName: true,
              role: true
            }
          }
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit
      }),
      prisma.attendanceRecord.count({ where: whereClause })
    ]);

    res.json({
      records,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get attendance statistics
router.get('/stats', authenticateToken, requireBeadleOrAbove, async (req: AuthRequest, res, next) => {
  try {
    const { sectionId, startDate, endDate } = req.query;

    let whereClause: any = {};

    if (req.user!.role === 'beadle') {
      whereClause.submittedBy = req.user!.id;
    }

    if (sectionId) {
      whereClause.sectionId = sectionId;
    }

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate as string);
      if (endDate) whereClause.date.lte = new Date(endDate as string);
    }

    const [totalRecords, presentRecords, absentRecords] = await Promise.all([
      prisma.attendanceRecord.count({ where: whereClause }),
      prisma.attendanceRecord.count({ 
        where: { ...whereClause, status: 'present' } 
      }),
      prisma.attendanceRecord.count({ 
        where: { ...whereClause, status: 'absent' } 
      })
    ]);

    const attendanceRate = totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 0;

    res.json({
      totalRecords,
      presentRecords,
      absentRecords,
      attendanceRate: Math.round(attendanceRate * 100) / 100
    });
  } catch (error) {
    next(error);
  }
});

// Update attendance record (for coordinators and admins)
router.put('/:id', authenticateToken, requireAdviserOrAbove, auditMiddleware('UPDATE', 'attendance_records'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const updateSchema = Joi.object({
      status: Joi.string().valid('present', 'absent'),
      notes: Joi.string().allow('')
    });

    const { error, value } = updateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    // Get existing record for audit
    const existingRecord = await prisma.attendanceRecord.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            studentNumber: true
          }
        }
      }
    });

    if (!existingRecord) {
      return res.status(404).json({
        error: 'Attendance record not found',
        code: 'RECORD_NOT_FOUND'
      });
    }

    // Store old data for audit
    req.oldData = {
      status: existingRecord.status,
      notes: existingRecord.notes
    };

    const updatedRecord = await prisma.attendanceRecord.update({
      where: { id },
      data: value,
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            lastName: true,
            middleName: true
          }
        },
        section: {
          select: {
            id: true,
            name: true,
            gradeLevel: true,
            schoolYear: true
          }
        }
      }
    });

    res.json({
      message: 'Attendance record updated successfully',
      record: updatedRecord
    });
  } catch (error) {
    next(error);
  }
});

// Delete attendance record (for coordinators and admins)
router.delete('/:id', authenticateToken, requireAdviserOrAbove, auditMiddleware('DELETE', 'attendance_records'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const existingRecord = await prisma.attendanceRecord.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            studentNumber: true
          }
        }
      }
    });

    if (!existingRecord) {
      return res.status(404).json({
        error: 'Attendance record not found',
        code: 'RECORD_NOT_FOUND'
      });
    }

    await prisma.attendanceRecord.delete({
      where: { id }
    });

    res.json({
      message: 'Attendance record deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
