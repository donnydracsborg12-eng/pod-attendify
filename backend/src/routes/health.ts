import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Get basic system stats
    const [userCount, sectionCount, attendanceCount] = await Promise.all([
      prisma.user.count(),
      prisma.section.count(),
      prisma.attendanceRecord.count()
    ]);

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: '1.0.0',
      database: {
        status: 'connected',
        stats: {
          users: userCount,
          sections: sectionCount,
          attendanceRecords: attendanceCount
        }
      },
      services: {
        database: 'operational',
        fileStorage: process.env.AWS_S3_BUCKET ? 'configured' : 'not_configured',
        ai: 'mock_service' // Will be 'operational' when connected to real AI
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  try {
    const healthChecks = {
      database: await checkDatabaseHealth(),
      fileStorage: await checkFileStorageHealth(),
      memory: checkMemoryHealth(),
      disk: checkDiskHealth()
    };

    const overallStatus = Object.values(healthChecks).every(check => check.status === 'healthy') 
      ? 'healthy' 
      : 'degraded';

    res.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: healthChecks
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

// Database health check
async function checkDatabaseHealth() {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - start;

    const [userCount, sectionCount, attendanceCount, fileCount] = await Promise.all([
      prisma.user.count(),
      prisma.section.count(),
      prisma.attendanceRecord.count(),
      prisma.storedFile.count()
    ]);

    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      stats: {
        users: userCount,
        sections: sectionCount,
        attendanceRecords: attendanceCount,
        files: fileCount
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: 'Database connection failed'
    };
  }
}

// File storage health check
async function checkFileStorageHealth() {
  try {
    if (!process.env.AWS_S3_BUCKET) {
      return {
        status: 'not_configured',
        message: 'AWS S3 bucket not configured'
      };
    }

    // In a real implementation, you would test S3 connectivity here
    // For now, we'll just check if the configuration exists
    return {
      status: 'configured',
      bucket: process.env.AWS_S3_BUCKET,
      region: process.env.AWS_REGION
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: 'File storage check failed'
    };
  }
}

// Memory health check
function checkMemoryHealth() {
  const memUsage = process.memoryUsage();
  const totalMem = memUsage.heapTotal;
  const usedMem = memUsage.heapUsed;
  const memUsagePercent = (usedMem / totalMem) * 100;

  return {
    status: memUsagePercent < 90 ? 'healthy' : 'warning',
    usage: {
      used: `${Math.round(usedMem / 1024 / 1024)}MB`,
      total: `${Math.round(totalMem / 1024 / 1024)}MB`,
      percentage: Math.round(memUsagePercent)
    }
  };
}

// Disk health check (simplified)
function checkDiskHealth() {
  // In a real implementation, you would check disk usage
  // For now, we'll return a basic status
  return {
    status: 'healthy',
    message: 'Disk usage check not implemented'
  };
}

// System metrics endpoint
router.get('/metrics', async (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform
    };

    res.json(metrics);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

export default router;
