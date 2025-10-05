import express from 'express';
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireBeadleOrAbove, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const analyticsQuerySchema = Joi.object({
  sectionId: Joi.string().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  groupBy: Joi.string().valid('day', 'week', 'month').default('day')
});

// Get attendance analytics
router.get('/attendance', authenticateToken, requireBeadleOrAbove, async (req: AuthRequest, res, next) => {
  try {
    const { error, value } = analyticsQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    const { sectionId, startDate, endDate, groupBy } = value;

    let whereClause: any = {};

    // Apply role-based filtering
    if (req.user!.role === 'beadle') {
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

    // Get attendance records
    const records = await prisma.attendanceRecord.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            lastName: true
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
      },
      orderBy: { date: 'asc' }
    });

    // Process data based on groupBy
    let processedData: any[] = [];

    if (groupBy === 'day') {
      const dailyStats = records.reduce((acc, record) => {
        const date = record.date.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { date, present: 0, absent: 0, total: 0 };
        }
        acc[date].total++;
        if (record.status === 'present') {
          acc[date].present++;
        } else {
          acc[date].absent++;
        }
        return acc;
      }, {} as any);

      processedData = Object.values(dailyStats).map((stat: any) => ({
        ...stat,
        attendanceRate: stat.total > 0 ? (stat.present / stat.total) * 100 : 0
      }));
    } else if (groupBy === 'week') {
      // Group by week
      const weeklyStats = records.reduce((acc, record) => {
        const date = new Date(record.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!acc[weekKey]) {
          acc[weekKey] = { week: weekKey, present: 0, absent: 0, total: 0 };
        }
        acc[weekKey].total++;
        if (record.status === 'present') {
          acc[weekKey].present++;
        } else {
          acc[weekKey].absent++;
        }
        return acc;
      }, {} as any);

      processedData = Object.values(weeklyStats).map((stat: any) => ({
        ...stat,
        attendanceRate: stat.total > 0 ? (stat.present / stat.total) * 100 : 0
      }));
    }

    // Calculate overall statistics
    const totalRecords = records.length;
    const presentRecords = records.filter(r => r.status === 'present').length;
    const absentRecords = totalRecords - presentRecords;
    const overallAttendanceRate = totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 0;

    // Get student performance
    const studentStats = records.reduce((acc, record) => {
      const studentId = record.studentId;
      if (!acc[studentId]) {
        acc[studentId] = {
          studentId,
          studentName: `${record.student.firstName} ${record.student.lastName}`,
          studentNumber: record.student.studentNumber,
          present: 0,
          absent: 0,
          total: 0
        };
      }
      acc[studentId].total++;
      if (record.status === 'present') {
        acc[studentId].present++;
      } else {
        acc[studentId].absent++;
      }
      return acc;
    }, {} as any);

    const studentPerformance = Object.values(studentStats).map((stat: any) => ({
      ...stat,
      attendanceRate: stat.total > 0 ? (stat.present / stat.total) * 100 : 0
    })).sort((a: any, b: any) => b.attendanceRate - a.attendanceRate);

    res.json({
      summary: {
        totalRecords,
        presentRecords,
        absentRecords,
        overallAttendanceRate: Math.round(overallAttendanceRate * 100) / 100
      },
      trends: processedData,
      studentPerformance: studentPerformance.slice(0, 20) // Top 20 students
    });
  } catch (error) {
    next(error);
  }
});

// Get section analytics
router.get('/sections', authenticateToken, requireBeadleOrAbove, async (req: AuthRequest, res, next) => {
  try {
    const sections = await prisma.section.findMany({
      include: {
        adviser: {
          select: {
            id: true,
            fullName: true
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

    // Get attendance stats for each section
    const sectionStats = await Promise.all(
      sections.map(async (section) => {
        const attendanceRecords = await prisma.attendanceRecord.findMany({
          where: { sectionId: section.id },
          select: { status: true }
        });

        const totalRecords = attendanceRecords.length;
        const presentRecords = attendanceRecords.filter(r => r.status === 'present').length;
        const attendanceRate = totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 0;

        return {
          id: section.id,
          name: section.name,
          gradeLevel: section.gradeLevel,
          schoolYear: section.schoolYear,
          adviser: section.adviser,
          studentCount: section._count.students,
          totalAttendanceRecords: section._count.attendanceRecords,
          attendanceRate: Math.round(attendanceRate * 100) / 100
        };
      })
    );

    res.json({ sections: sectionStats });
  } catch (error) {
    next(error);
  }
});

// Get top absent students
router.get('/top-absent', authenticateToken, requireBeadleOrAbove, async (req: AuthRequest, res, next) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;

    let whereClause: any = {
      status: 'absent'
    };

    // Apply role-based filtering
    if (req.user!.role === 'beadle') {
      whereClause.submittedBy = req.user!.id;
    }

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate as string);
      if (endDate) whereClause.date.lte = new Date(endDate as string);
    }

    const absentRecords = await prisma.attendanceRecord.findMany({
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
            gradeLevel: true
          }
        }
      }
    });

    // Count absences per student
    const studentAbsenceCount = absentRecords.reduce((acc, record) => {
      const studentId = record.studentId;
      if (!acc[studentId]) {
        acc[studentId] = {
          studentId,
          student: record.student,
          section: record.section,
          absenceCount: 0,
          lastAbsence: record.date
        };
      }
      acc[studentId].absenceCount++;
      if (record.date > acc[studentId].lastAbsence) {
        acc[studentId].lastAbsence = record.date;
      }
      return acc;
    }, {} as any);

    const topAbsentStudents = Object.values(studentAbsenceCount)
      .sort((a: any, b: any) => b.absenceCount - a.absenceCount)
      .slice(0, Number(limit));

    res.json({ topAbsentStudents });
  } catch (error) {
    next(error);
  }
});

// Get attendance trends
router.get('/trends', authenticateToken, requireBeadleOrAbove, async (req: AuthRequest, res, next) => {
  try {
    const { days = 30 } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    let whereClause: any = {
      date: {
        gte: startDate,
        lte: endDate
      }
    };

    // Apply role-based filtering
    if (req.user!.role === 'beadle') {
      whereClause.submittedBy = req.user!.id;
    }

    const records = await prisma.attendanceRecord.findMany({
      where: whereClause,
      select: {
        date: true,
        status: true
      },
      orderBy: { date: 'asc' }
    });

    // Group by date
    const dailyStats = records.reduce((acc, record) => {
      const date = record.date.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, present: 0, absent: 0, total: 0 };
      }
      acc[date].total++;
      if (record.status === 'present') {
        acc[date].present++;
      } else {
        acc[date].absent++;
      }
      return acc;
    }, {} as any);

    const trends = Object.values(dailyStats).map((stat: any) => ({
      ...stat,
      attendanceRate: stat.total > 0 ? (stat.present / stat.total) * 100 : 0
    }));

    // Calculate trend direction
    const recentTrend = trends.slice(-7); // Last 7 days
    const olderTrend = trends.slice(-14, -7); // Previous 7 days
    
    const recentAvg = recentTrend.reduce((sum, stat: any) => sum + stat.attendanceRate, 0) / recentTrend.length;
    const olderAvg = olderTrend.reduce((sum, stat: any) => sum + stat.attendanceRate, 0) / olderTrend.length;
    
    const trendDirection = recentAvg > olderAvg ? 'improving' : recentAvg < olderAvg ? 'declining' : 'stable';

    res.json({
      trends,
      trendDirection,
      recentAverage: Math.round(recentAvg * 100) / 100,
      previousAverage: Math.round(olderAvg * 100) / 100
    });
  } catch (error) {
    next(error);
  }
});

export default router;
