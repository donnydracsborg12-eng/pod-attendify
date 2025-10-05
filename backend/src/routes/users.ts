import express from 'express';
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { auditMiddleware } from '../middleware/audit';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  fullName: Joi.string().min(2).required(),
  role: Joi.string().valid('beadle', 'adviser', 'coordinator', 'admin').required()
});

const updateUserSchema = Joi.object({
  email: Joi.string().email(),
  fullName: Joi.string().min(2),
  role: Joi.string().valid('beadle', 'adviser', 'coordinator', 'admin'),
  isActive: Joi.boolean()
});

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { page = 1, limit = 20, role, isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    if (role) {
      whereClause.role = role;
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              sectionsAsAdviser: true,
              attendanceRecords: true,
              uploadedFiles: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.user.count({ where: whereClause })
    ]);

    res.json({
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get user by ID
router.get('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        sectionsAsAdviser: {
          select: {
            id: true,
            name: true,
            gradeLevel: true,
            schoolYear: true
          }
        },
        _count: {
          select: {
            attendanceRecords: true,
            uploadedFiles: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Create new user (admin only)
router.post('/', authenticateToken, requireAdmin, auditMiddleware('CREATE', 'users'), async (req: AuthRequest, res, next) => {
  try {
    const { error, value } = createUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    const { email, password, fullName, role } = value;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        code: 'USER_EXISTS'
      });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        role
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    res.status(201).json({
      message: 'User created successfully',
      user
    });
  } catch (error) {
    next(error);
  }
});

// Update user (admin only)
router.put('/:id', authenticateToken, requireAdmin, auditMiddleware('UPDATE', 'users'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    // Get existing user for audit
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if email is already taken by another user
    if (value.email && value.email !== existingUser.email) {
      const conflictingUser = await prisma.user.findFirst({
        where: {
          email: value.email,
          id: { not: id }
        }
      });

      if (conflictingUser) {
        return res.status(409).json({
          error: 'Email already in use',
          code: 'EMAIL_EXISTS'
        });
      }
    }

    // Store old data for audit
    req.oldData = {
      email: existingUser.email,
      fullName: existingUser.fullName,
      role: existingUser.role,
      isActive: existingUser.isActive
    };

    const updatedUser = await prisma.user.update({
      where: { id },
      data: value,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
});

// Deactivate user (admin only)
router.put('/:id/deactivate', authenticateToken, requireAdmin, auditMiddleware('UPDATE', 'users'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!existingUser.isActive) {
      return res.status(400).json({
        error: 'User is already deactivated',
        code: 'USER_ALREADY_DEACTIVATED'
      });
    }

    // Store old data for audit
    req.oldData = {
      isActive: existingUser.isActive
    };

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'User deactivated successfully',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
});

// Reactivate user (admin only)
router.put('/:id/reactivate', authenticateToken, requireAdmin, auditMiddleware('UPDATE', 'users'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (existingUser.isActive) {
      return res.status(400).json({
        error: 'User is already active',
        code: 'USER_ALREADY_ACTIVE'
      });
    }

    // Store old data for audit
    req.oldData = {
      isActive: existingUser.isActive
    };

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'User reactivated successfully',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
});

// Get user statistics
router.get('/stats/overview', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const [totalUsers, activeUsers, inactiveUsers, usersByRole] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
        where: { isActive: true }
      })
    ]);

    res.json({
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByRole: usersByRole.map(item => ({
        role: item.role,
        count: item._count.role
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;
