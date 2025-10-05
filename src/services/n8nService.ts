import axios from 'axios';

interface N8nConfig {
  baseUrl: string;
  apiKey?: string;
}

interface WorkflowTrigger {
  workflowId: string;
  data?: any;
}

interface AttendanceSummary {
  section: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  status: 'ALL_PRESENT' | 'HAS_ABSENCES' | 'NO_ATTENDANCE';
}

class N8nAutomationService {
  private config: N8nConfig;

  constructor(config: N8nConfig) {
    this.config = config;
  }

  /**
   * Trigger daily attendance check workflow
   */
  async triggerDailyAttendanceCheck(): Promise<void> {
    try {
      const response = await axios.post(
        `${this.config.baseUrl}/webhook/daily-attendance-check`,
        {
          timestamp: new Date().toISOString(),
          type: 'daily_check'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
          }
        }
      );

      console.log('Daily attendance check triggered:', response.data);
    } catch (error) {
      console.error('Failed to trigger daily attendance check:', error);
      throw error;
    }
  }

  /**
   * Trigger weekly summary workflow
   */
  async triggerWeeklySummary(): Promise<void> {
    try {
      const response = await axios.post(
        `${this.config.baseUrl}/webhook/weekly-summary`,
        {
          timestamp: new Date().toISOString(),
          type: 'weekly_summary',
          weekStart: this.getWeekStart(),
          weekEnd: this.getWeekEnd()
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
          }
        }
      );

      console.log('Weekly summary triggered:', response.data);
    } catch (error) {
      console.error('Failed to trigger weekly summary:', error);
      throw error;
    }
  }

  /**
   * Trigger monthly archival workflow
   */
  async triggerMonthlyArchival(): Promise<void> {
    try {
      const response = await axios.post(
        `${this.config.baseUrl}/webhook/monthly-archival`,
        {
          timestamp: new Date().toISOString(),
          type: 'monthly_archival',
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear()
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
          }
        }
      );

      console.log('Monthly archival triggered:', response.data);
    } catch (error) {
      console.error('Failed to trigger monthly archival:', error);
      throw error;
    }
  }

  /**
   * Send custom notification via Telegram
   */
  async sendTelegramNotification(message: string, chatId?: string): Promise<void> {
    try {
      const response = await axios.post(
        `${this.config.baseUrl}/webhook/telegram-notification`,
        {
          message,
          chatId: chatId || process.env.TELEGRAM_CHAT_ID,
          timestamp: new Date().toISOString()
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
          }
        }
      );

      console.log('Telegram notification sent:', response.data);
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
      throw error;
    }
  }

  /**
   * Generate attendance report
   */
  async generateAttendanceReport(
    type: 'daily' | 'weekly' | 'monthly',
    data: AttendanceSummary[]
  ): Promise<string> {
    try {
      const response = await axios.post(
        `${this.config.baseUrl}/webhook/generate-report`,
        {
          type,
          data,
          timestamp: new Date().toISOString(),
          format: 'html'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
          }
        }
      );

      return response.data.reportUrl;
    } catch (error) {
      console.error('Failed to generate attendance report:', error);
      throw error;
    }
  }

  /**
   * Check workflow health
   */
  async checkWorkflowHealth(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.config.baseUrl}/health`,
        {
          headers: {
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
          }
        }
      );

      return response.status === 200;
    } catch (error) {
      console.error('N8n workflow health check failed:', error);
      return false;
    }
  }

  /**
   * Get workflow execution status
   */
  async getWorkflowStatus(executionId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.config.baseUrl}/executions/${executionId}`,
        {
          headers: {
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to get workflow status:', error);
      throw error;
    }
  }

  private getWeekStart(): string {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(now.setDate(diff));
    return weekStart.toISOString().split('T')[0];
  }

  private getWeekEnd(): string {
    const weekStart = new Date(this.getWeekStart());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return weekEnd.toISOString().split('T')[0];
  }
}

// Export singleton instance
export const n8nService = new N8nAutomationService({
  baseUrl: process.env.N8N_BASE_URL || 'http://localhost:5678',
  apiKey: process.env.N8N_API_KEY
});

export default N8nAutomationService;
