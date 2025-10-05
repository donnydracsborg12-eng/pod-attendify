import express from 'express';
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const aiQuerySchema = Joi.object({
  query: Joi.string().min(1).required(),
  context: Joi.string().optional()
});

// AI Query endpoint (Future-ready for Llama integration)
router.post('/query', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { error, value } = aiQuerySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    const { query, context } = value;
    const lowerQuery = query.toLowerCase();

    // Mock AI responses based on query patterns
    // In the future, this will connect to a real AI service
    let response = '';

    if (lowerQuery.includes('attendance rate') || lowerQuery.includes('percentage')) {
      // Get attendance statistics
      const stats = await getAttendanceStats(req.user!.id, req.user!.role);
      response = generateAttendanceRateResponse(stats);
    } else if (lowerQuery.includes('absent') || lowerQuery.includes('missing')) {
      // Get absence analysis
      const absentData = await getAbsenceAnalysis(req.user!.id, req.user!.role);
      response = generateAbsenceResponse(absentData);
    } else if (lowerQuery.includes('trend') || lowerQuery.includes('pattern')) {
      // Get trend analysis
      const trendData = await getTrendAnalysis(req.user!.id, req.user!.role);
      response = generateTrendResponse(trendData);
    } else if (lowerQuery.includes('student') && lowerQuery.includes('performance')) {
      // Get student performance
      const studentData = await getStudentPerformance(req.user!.id, req.user!.role);
      response = generateStudentPerformanceResponse(studentData);
    } else {
      // Default response
      response = generateDefaultResponse();
    }

    res.json({
      query,
      response,
      timestamp: new Date().toISOString(),
      aiService: 'mock', // Will be 'llama' or 'openai' in production
      context: context || 'attendance_monitoring'
    });
  } catch (error) {
    next(error);
  }
});

// Helper functions for AI responses
async function getAttendanceStats(userId: string, role: string) {
  let whereClause: any = {};

  if (role === 'beadle') {
    whereClause.submittedBy = userId;
  }

  const [totalRecords, presentRecords] = await Promise.all([
    prisma.attendanceRecord.count({ where: whereClause }),
    prisma.attendanceRecord.count({ 
      where: { ...whereClause, status: 'present' } 
    })
  ]);

  return {
    totalRecords,
    presentRecords,
    absentRecords: totalRecords - presentRecords,
    attendanceRate: totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 0
  };
}

async function getAbsenceAnalysis(userId: string, role: string) {
  let whereClause: any = {
    status: 'absent'
  };

  if (role === 'beadle') {
    whereClause.submittedBy = userId;
  }

  const absentRecords = await prisma.attendanceRecord.findMany({
    where: whereClause,
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

  // Count absences per student
  const studentAbsenceCount = absentRecords.reduce((acc, record) => {
    const studentId = record.studentId;
    if (!acc[studentId]) {
      acc[studentId] = {
        studentName: `${record.student.firstName} ${record.student.lastName}`,
        studentNumber: record.student.studentNumber,
        absenceCount: 0
      };
    }
    acc[studentId].absenceCount++;
    return acc;
  }, {} as any);

  const topAbsentees = Object.values(studentAbsenceCount)
    .sort((a: any, b: any) => b.absenceCount - a.absenceCount)
    .slice(0, 5);

  return {
    totalAbsences: absentRecords.length,
    topAbsentees
  };
}

async function getTrendAnalysis(userId: string, role: string) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  let whereClause: any = {
    date: {
      gte: startDate,
      lte: endDate
    }
  };

  if (role === 'beadle') {
    whereClause.submittedBy = userId;
  }

  const records = await prisma.attendanceRecord.findMany({
    where: whereClause,
    select: { date: true, status: true },
    orderBy: { date: 'asc' }
  });

  // Calculate weekly averages
  const weeklyStats = records.reduce((acc, record) => {
    const date = new Date(record.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!acc[weekKey]) {
      acc[weekKey] = { week: weekKey, present: 0, total: 0 };
    }
    acc[weekKey].total++;
    if (record.status === 'present') {
      acc[weekKey].present++;
    }
    return acc;
  }, {} as any);

  const weeklyAverages = Object.values(weeklyStats).map((stat: any) => ({
    week: stat.week,
    attendanceRate: stat.total > 0 ? (stat.present / stat.total) * 100 : 0
  }));

  const recentWeek = weeklyAverages.slice(-1)[0]?.attendanceRate || 0;
  const previousWeek = weeklyAverages.slice(-2, -1)[0]?.attendanceRate || 0;
  
  const trendDirection = recentWeek > previousWeek ? 'improving' : 
                        recentWeek < previousWeek ? 'declining' : 'stable';

  return {
    weeklyAverages,
    trendDirection,
    recentWeek,
    previousWeek
  };
}

async function getStudentPerformance(userId: string, role: string) {
  let whereClause: any = {};

  if (role === 'beadle') {
    whereClause.submittedBy = userId;
  }

  const records = await prisma.attendanceRecord.findMany({
    where: whereClause,
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

  // Calculate student performance
  const studentStats = records.reduce((acc, record) => {
    const studentId = record.studentId;
    if (!acc[studentId]) {
      acc[studentId] = {
        studentName: `${record.student.firstName} ${record.student.lastName}`,
        studentNumber: record.student.studentNumber,
        present: 0,
        total: 0
      };
    }
    acc[studentId].total++;
    if (record.status === 'present') {
      acc[studentId].present++;
    }
    return acc;
  }, {} as any);

  const studentPerformance = Object.values(studentStats)
    .map((stat: any) => ({
      ...stat,
      attendanceRate: stat.total > 0 ? (stat.present / stat.total) * 100 : 0
    }))
    .sort((a: any, b: any) => b.attendanceRate - a.attendanceRate);

  return {
    topPerformers: studentPerformance.slice(0, 5),
    needsAttention: studentPerformance.slice(-5).reverse()
  };
}

function generateAttendanceRateResponse(stats: any) {
  return `📊 **Attendance Overview**:\n\n• **Overall Rate**: ${stats.attendanceRate.toFixed(1)}%\n• **Total Records**: ${stats.totalRecords}\n• **Present**: ${stats.presentRecords}\n• **Absent**: ${stats.absentRecords}\n\n${stats.attendanceRate >= 90 ? '✅ Excellent attendance rate!' : stats.attendanceRate >= 80 ? '👍 Good attendance rate' : '⚠️ Attendance needs attention'}`;
}

function generateAbsenceResponse(data: any) {
  const topAbsentees = data.topAbsentees.map((student: any) => 
    `• ${student.studentName} (${student.studentNumber}): ${student.absenceCount} absences`
  ).join('\n');

  return `📉 **Absence Analysis**:\n\n• **Total Absences**: ${data.totalAbsences}\n\n🔍 **Students with Most Absences**:\n${topAbsentees}\n\n💡 **Recommendation**: Consider reaching out to students with frequent absences to understand any challenges they might be facing.`;
}

function generateTrendResponse(data: any) {
  const trendEmoji = data.trendDirection === 'improving' ? '📈' : 
                     data.trendDirection === 'declining' ? '📉' : '📊';
  
  return `📈 **Attendance Trend Analysis**:\n\n• **Recent Week**: ${data.recentWeek.toFixed(1)}%\n• **Previous Week**: ${data.previousWeek.toFixed(1)}%\n• **Trend**: ${trendEmoji} ${data.trendDirection}\n\n${data.trendDirection === 'improving' ? '🎉 Great! Attendance is trending upward.' : data.trendDirection === 'declining' ? '⚠️ Attendance is declining - consider intervention strategies.' : '📊 Attendance is stable.'}`;
}

function generateStudentPerformanceResponse(data: any) {
  const topPerformers = data.topPerformers.map((student: any) => 
    `• ${student.studentName}: ${student.attendanceRate.toFixed(1)}%`
  ).join('\n');

  const needsAttention = data.needsAttention.map((student: any) => 
    `• ${student.studentName}: ${student.attendanceRate.toFixed(1)}%`
  ).join('\n');

  return `👥 **Student Performance Summary**:\n\n🏆 **Top Performers**:\n${topPerformers}\n\n⚠️ **Need Attention**:\n${needsAttention}\n\n💡 **Recommendation**: Focus on students with low attendance rates and celebrate those with excellent attendance!`;
}

function generateDefaultResponse() {
  return `🤖 **POD AI Assistant**:\n\nI can help you analyze attendance data! Try asking me about:\n\n• "What's the attendance rate?"\n• "Who has the most absences?"\n• "Show me attendance trends"\n• "Which students need attention?"\n\nI'm connected to your attendance database and can provide real-time insights!`;
}

export default router;
