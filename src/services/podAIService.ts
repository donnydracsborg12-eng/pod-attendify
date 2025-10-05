import { n8nService } from './n8nService';
import { telegramService } from './telegramService';
import { ollamaService } from './ollamaService';
import { minioService } from './minioService';
import { qdrantService } from './qdrantService';
import { metabaseService } from './metabaseService';

interface SystemHealth {
  database: boolean;
  storage: boolean;
  ai: boolean;
  automation: boolean;
  analytics: boolean;
  notifications: boolean;
  overall: boolean;
}

interface AttendanceInsight {
  summary: string;
  recommendations: string[];
  patterns: any[];
  alerts: string[];
}

class PODAIIntegrationService {
  private isInitialized = false;

  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing POD AI Integration Services...');

      // Initialize Qdrant collection
      await qdrantService.initializeCollection(384);
      console.log('✅ Qdrant vector database initialized');

      // Check MinIO health
      const minioHealth = await minioService.checkHealth();
      if (!minioHealth) {
        throw new Error('MinIO service is not available');
      }
      console.log('✅ MinIO file storage ready');

      // Check Ollama health
      const ollamaHealth = await ollamaService.checkHealth();
      if (!ollamaHealth) {
        console.warn('⚠️ Ollama AI service is not available - using mock responses');
      } else {
        console.log('✅ Ollama AI service ready');
      }

      // Check N8n health
      const n8nHealth = await n8nService.checkWorkflowHealth();
      if (!n8nHealth) {
        console.warn('⚠️ N8n automation service is not available');
      } else {
        console.log('✅ N8n automation service ready');
      }

      // Check Metabase health
      const metabaseHealth = await metabaseService.checkHealth();
      if (!metabaseHealth) {
        console.warn('⚠️ Metabase analytics service is not available');
      } else {
        console.log('✅ Metabase analytics service ready');
      }

      this.isInitialized = true;
      console.log('🎉 POD AI Integration Services initialized successfully!');
    } catch (error) {
      console.error('❌ Failed to initialize POD AI services:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const [minioHealth, ollamaHealth, n8nHealth, metabaseHealth, qdrantHealth] = await Promise.all([
        minioService.checkHealth(),
        ollamaService.checkHealth(),
        n8nService.checkWorkflowHealth(),
        metabaseService.checkHealth(),
        qdrantService.checkHealth()
      ]);

      const health: SystemHealth = {
        database: true, // Assuming database is healthy if we can reach this point
        storage: minioHealth,
        ai: ollamaHealth,
        automation: n8nHealth,
        analytics: metabaseHealth,
        notifications: true, // Telegram service is always available
        overall: minioHealth && qdrantHealth // Core services must be healthy
      };

      return health;
    } catch (error) {
      console.error('Failed to get system health:', error);
      return {
        database: false,
        storage: false,
        ai: false,
        automation: false,
        analytics: false,
        notifications: false,
        overall: false
      };
    }
  }

  /**
   * Generate AI-powered attendance insights
   */
  async generateAttendanceInsights(query: string, context?: any): Promise<AttendanceInsight> {
    try {
      // Get attendance data from Metabase
      const attendanceData = await metabaseService.getTodayAttendanceSummary();
      
      // Generate AI insights using Ollama
      const aiResponse = await ollamaService.generateAttendanceInsight({
        query,
        context: {
          ...context,
          attendanceData
        }
      });

      // Find similar patterns using Qdrant
      const queryVector = qdrantService.generateTextEmbedding(query);
      const similarPatterns = await qdrantService.findSimilarAttendancePatterns(queryVector, 5);

      // Generate recommendations
      const recommendations = await ollamaService.generateRecommendations(attendanceData);

      return {
        summary: aiResponse,
        recommendations: [recommendations],
        patterns: similarPatterns,
        alerts: this.generateAlerts(attendanceData)
      };
    } catch (error) {
      console.error('Failed to generate attendance insights:', error);
      return {
        summary: 'Unable to generate insights at this time. Please try again later.',
        recommendations: [],
        patterns: [],
        alerts: []
      };
    }
  }

  /**
   * Process daily attendance workflow
   */
  async processDailyAttendance(): Promise<void> {
    try {
      console.log('📊 Processing daily attendance workflow...');

      // Get attendance summary
      const summary = await metabaseService.getTodayAttendanceSummary();
      
      // Trigger N8n workflow
      await n8nService.triggerDailyAttendanceCheck();

      // Send Telegram notification
      const alertData = summary.sectionBreakdown.map(section => ({
        section: section.section,
        absentStudents: [], // Would be populated from actual data
        totalStudents: section.totalStudents,
        presentCount: Math.round(section.totalStudents * section.attendanceRate / 100),
        absentCount: Math.round(section.totalStudents * (100 - section.attendanceRate) / 100)
      }));

      await telegramService.sendDailyAttendanceSummary(alertData);

      // Store analytics in Qdrant
      const analyticsVector = qdrantService.generateTextEmbedding(
        `Daily attendance: ${summary.attendanceRate}% overall rate`
      );

      await qdrantService.addSectionAnalytics(
        'daily_summary',
        analyticsVector,
        {
          sectionName: 'All Sections',
          gradeLevel: 'All',
          averageAttendance: summary.attendanceRate,
          totalStudents: summary.totalStudents,
          riskStudents: summary.sectionBreakdown.reduce((sum, s) => sum + (s.attendanceRate < 80 ? 1 : 0), 0),
          period: new Date().toISOString().split('T')[0]
        }
      );

      console.log('✅ Daily attendance workflow completed');
    } catch (error) {
      console.error('❌ Failed to process daily attendance:', error);
      throw error;
    }
  }

  /**
   * Upload and analyze attendance proof
   */
  async uploadAttendanceProof(
    file: File,
    studentId: string,
    sectionId: string,
    date: string
  ): Promise<{ url: string; analysis?: string }> {
    try {
      // Upload to MinIO
      const uploadResult = await minioService.uploadAttendanceProof(file, studentId, sectionId, date);

      // Generate vector embedding for the file metadata
      const fileVector = qdrantService.generateTextEmbedding(
        `Attendance proof for student ${studentId} in section ${sectionId} on ${date}`
      );

      // Store in Qdrant
      await qdrantService.addAttendanceRecord(
        `proof_${studentId}_${date}`,
        fileVector,
        {
          studentId,
          sectionId,
          date,
          status: 'present', // Assuming proof means present
          timestamp: new Date().toISOString()
        }
      );

      return {
        url: uploadResult.url,
        analysis: 'File uploaded and indexed successfully'
      };
    } catch (error) {
      console.error('Failed to upload attendance proof:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive attendance report
   */
  async generateAttendanceReport(
    startDate: string,
    endDate: string,
    sectionId?: string
  ): Promise<{
    report: any;
    insights: AttendanceInsight;
    fileUrl?: string;
  }> {
    try {
      // Generate report from Metabase
      const report = await metabaseService.generateAttendanceReport(startDate, endDate, sectionId);

      // Generate AI insights
      const insights = await this.generateAttendanceInsights(
        `Generate insights for attendance report from ${startDate} to ${endDate}`,
        { report, sectionId }
      );

      // Create report file and upload to MinIO
      const reportData = JSON.stringify(report, null, 2);
      const reportBuffer = Buffer.from(reportData);
      const uploadResult = await minioService.uploadReport(
        reportBuffer,
        'attendance_report',
        `${startDate}_to_${endDate}`
      );

      return {
        report,
        insights,
        fileUrl: uploadResult.url
      };
    } catch (error) {
      console.error('Failed to generate attendance report:', error);
      throw error;
    }
  }

  /**
   * Send critical alerts
   */
  async sendCriticalAlerts(): Promise<void> {
    try {
      // Get top absent students
      const topAbsent = await metabaseService.getTopAbsentStudents(5);

      // Send alerts for students with 5+ absences
      for (const student of topAbsent) {
        if (student.absenceCount >= 5) {
          await telegramService.sendCriticalAbsenceAlert(
            student.studentName,
            student.section,
            student.absenceCount
          );
        }
      }
    } catch (error) {
      console.error('Failed to send critical alerts:', error);
    }
  }

  /**
   * Generate alerts based on attendance data
   */
  private generateAlerts(attendanceData: any): string[] {
    const alerts: string[] = [];

    if (attendanceData.attendanceRate < 80) {
      alerts.push('⚠️ Overall attendance rate is below 80%');
    }

    attendanceData.sectionBreakdown.forEach((section: any) => {
      if (section.attendanceRate < 70) {
        alerts.push(`🚨 Section ${section.section} has critically low attendance (${section.attendanceRate}%)`);
      }
    });

    return alerts;
  }

  /**
   * Get service status
   */
  isServiceReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get service statistics
   */
  async getServiceStats(): Promise<{
    storage: { totalSize: number; fileCount: number };
    vectorDb: { totalPoints: number; totalVectors: number };
    health: SystemHealth;
  }> {
    try {
      const [storageStats, vectorStats, health] = await Promise.all([
        minioService.getStorageStats(),
        qdrantService.getCollectionStats(),
        this.getSystemHealth()
      ]);

      return {
        storage: storageStats,
        vectorDb: vectorStats,
        health
      };
    } catch (error) {
      console.error('Failed to get service stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const podAIService = new PODAIIntegrationService();

export default PODAIIntegrationService;
