import express from 'express';
import multer from 'multer';
import AWS from 'aws-sdk';
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { auditMiddleware } from '../middleware/audit';

const router = express.Router();
const prisma = new PrismaClient();

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '2097152') // 2MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,application/pdf,text/csv').split(',');
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Validation schemas
const uploadFileSchema = Joi.object({
  description: Joi.string().allow('').optional(),
  category: Joi.string().valid('attendance_reports', 'student_documents', 'photos', 'certificates', 'other').default('other')
});

const getFilesSchema = Joi.object({
  category: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// Upload file
router.post('/upload', authenticateToken, upload.single('file'), auditMiddleware('CREATE', 'stored_files'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        code: 'NO_FILE'
      });
    }

    const { error, value } = uploadFileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    const { description, category } = value;
    const file = req.file;

    // Generate unique filename
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    // Upload to S3
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: filePath,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read'
    };

    const uploadResult = await s3.upload(uploadParams).promise();

    // Save file metadata to database
    const storedFile = await prisma.storedFile.create({
      data: {
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
        url: uploadResult.Location,
        uploadedBy: req.user!.id,
        description: description || null,
        category
      },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'File uploaded successfully',
      file: storedFile
    });
  } catch (error) {
    next(error);
  }
});

// Get files
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { error, value } = getFilesSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    const { category, page, limit } = value;
    const skip = (page - 1) * limit;

    let whereClause: any = {};

    if (category) {
      whereClause.category = category;
    }

    // Non-admin users can only see their own files
    if (req.user!.role !== 'admin') {
      whereClause.uploadedBy = req.user!.id;
    }

    const [files, total] = await Promise.all([
      prisma.storedFile.findMany({
        where: whereClause,
        include: {
          uploadedByUser: {
            select: {
              id: true,
              fullName: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.storedFile.count({ where: whereClause })
    ]);

    res.json({
      files,
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

// Get file by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    let whereClause: any = { id };

    // Non-admin users can only see their own files
    if (req.user!.role !== 'admin') {
      whereClause.uploadedBy = req.user!.id;
    }

    const file = await prisma.storedFile.findFirst({
      where: whereClause,
      include: {
        uploadedByUser: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        }
      }
    });

    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND'
      });
    }

    res.json({ file });
  } catch (error) {
    next(error);
  }
});

// Delete file
router.delete('/:id', authenticateToken, auditMiddleware('DELETE', 'stored_files'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    let whereClause: any = { id };

    // Non-admin users can only delete their own files
    if (req.user!.role !== 'admin') {
      whereClause.uploadedBy = req.user!.id;
    }

    const file = await prisma.storedFile.findFirst({
      where: whereClause
    });

    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND'
      });
    }

    // Delete from S3
    try {
      const key = file.url.split('/').pop();
      await s3.deleteObject({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: `uploads/${key}`
      }).promise();
    } catch (s3Error) {
      console.error('Failed to delete file from S3:', s3Error);
      // Continue with database deletion even if S3 deletion fails
    }

    // Delete from database
    await prisma.storedFile.delete({
      where: { id }
    });

    res.json({
      message: 'File deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Download file
router.get('/:id/download', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    let whereClause: any = { id };

    // Non-admin users can only download their own files
    if (req.user!.role !== 'admin') {
      whereClause.uploadedBy = req.user!.id;
    }

    const file = await prisma.storedFile.findFirst({
      where: whereClause
    });

    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND'
      });
    }

    // Redirect to S3 URL for download
    res.redirect(file.url);
  } catch (error) {
    next(error);
  }
});

// Get file statistics
router.get('/stats/overview', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    let whereClause: any = {};

    // Non-admin users can only see their own file stats
    if (req.user!.role !== 'admin') {
      whereClause.uploadedBy = req.user!.id;
    }

    const [totalFiles, totalSize, filesByCategory] = await Promise.all([
      prisma.storedFile.count({ where: whereClause }),
      prisma.storedFile.aggregate({
        where: whereClause,
        _sum: { size: true }
      }),
      prisma.storedFile.groupBy({
        by: ['category'],
        _count: { category: true },
        where: whereClause
      })
    ]);

    res.json({
      totalFiles,
      totalSize: totalSize._sum.size || 0,
      filesByCategory: filesByCategory.map(item => ({
        category: item.category,
        count: item._count.category
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;
