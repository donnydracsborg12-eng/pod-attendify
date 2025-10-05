import axios from 'axios';

interface TelegramConfig {
  botToken: string;
  chatId?: string;
  baseUrl?: string;
}

interface TelegramMessage {
  chatId: string;
  text: string;
  parseMode?: 'HTML' | 'Markdown';
  replyMarkup?: any;
}

interface AttendanceAlert {
  section: string;
  absentStudents: string[];
  totalStudents: number;
  presentCount: number;
  absentCount: number;
}

class TelegramBotService {
  private config: TelegramConfig;
  private apiUrl: string;

  constructor(config: TelegramConfig) {
    this.config = config;
    this.apiUrl = config.baseUrl || `https://api.telegram.org/bot${config.botToken}`;
  }

  /**
   * Send a simple text message
   */
  async sendMessage(message: TelegramMessage): Promise<void> {
    try {
      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: message.chatId,
        text: message.text,
        parse_mode: message.parseMode || 'HTML',
        reply_markup: message.replyMarkup
      });

      console.log('Message sent successfully:', response.data);
    } catch (error) {
      console.error('Failed to send Telegram message:', error);
      throw error;
    }
  }

  /**
   * Send daily attendance summary
   */
  async sendDailyAttendanceSummary(data: AttendanceAlert[]): Promise<void> {
    const chatId = this.config.chatId;
    if (!chatId) {
      throw new Error('Telegram chat ID not configured');
    }

    let message = '🔔 <b>Daily Attendance Summary</b>\n\n';
    message += `📅 Date: ${new Date().toLocaleDateString()}\n\n`;

    for (const section of data) {
      message += `📊 <b>Section ${section.section}:</b>\n`;
      message += `Total: ${section.totalStudents} | `;
      message += `Present: ${section.presentCount} | `;
      message += `Absent: ${section.absentCount}\n`;

      if (section.absentStudents.length > 0) {
        message += `❌ Absent: ${section.absentStudents.join(', ')}\n`;
      } else {
        message += `✅ All students present\n`;
      }
      message += '\n';
    }

    await this.sendMessage({
      chatId,
      text: message,
      parseMode: 'HTML'
    });
  }

  /**
   * Send critical absence alert
   */
  async sendCriticalAbsenceAlert(studentName: string, section: string, absenceCount: number): Promise<void> {
    const chatId = this.config.chatId;
    if (!chatId) {
      throw new Error('Telegram chat ID not configured');
    }

    const message = `🚨 <b>Critical Absence Alert</b>\n\n` +
      `Student: <b>${studentName}</b>\n` +
      `Section: ${section}\n` +
      `Absences: ${absenceCount} days\n` +
      `⚠️ Requires immediate attention!`;

    await this.sendMessage({
      chatId,
      text: message,
      parseMode: 'HTML'
    });
  }

  /**
   * Send weekly attendance report
   */
  async sendWeeklyReport(data: any): Promise<void> {
    const chatId = this.config.chatId;
    if (!chatId) {
      throw new Error('Telegram chat ID not configured');
    }

    let message = '📊 <b>Weekly Attendance Report</b>\n\n';
    message += `Week: ${data.weekStart} to ${data.weekEnd}\n\n`;

    // Add summary statistics
    message += `📈 <b>Summary:</b>\n`;
    message += `Total Students: ${data.totalStudents}\n`;
    message += `Average Attendance: ${data.averageAttendance}%\n`;
    message += `Critical Cases: ${data.criticalCases}\n\n`;

    // Add section breakdown
    message += `📋 <b>Section Breakdown:</b>\n`;
    for (const section of data.sections) {
      message += `${section.name}: ${section.attendanceRate}%\n`;
    }

    await this.sendMessage({
      chatId,
      text: message,
      parseMode: 'HTML'
    });
  }

  /**
   * Send system health status
   */
  async sendSystemHealthStatus(status: any): Promise<void> {
    const chatId = this.config.chatId;
    if (!chatId) {
      throw new Error('Telegram chat ID not configured');
    }

    const statusEmoji = status.healthy ? '✅' : '❌';
    let message = `${statusEmoji} <b>System Health Status</b>\n\n`;
    message += `Database: ${status.database ? '✅' : '❌'}\n`;
    message += `File Storage: ${status.storage ? '✅' : '❌'}\n`;
    message += `AI Service: ${status.ai ? '✅' : '❌'}\n`;
    message += `Automation: ${status.automation ? '✅' : '❌'}\n\n`;
    message += `Last Check: ${new Date().toLocaleString()}`;

    await this.sendMessage({
      chatId,
      text: message,
      parseMode: 'HTML'
    });
  }

  /**
   * Send custom notification
   */
  async sendCustomNotification(title: string, message: string, type: 'info' | 'warning' | 'error' = 'info'): Promise<void> {
    const chatId = this.config.chatId;
    if (!chatId) {
      throw new Error('Telegram chat ID not configured');
    }

    const emoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌'
    }[type];

    const formattedMessage = `${emoji} <b>${title}</b>\n\n${message}`;

    await this.sendMessage({
      chatId,
      text: formattedMessage,
      parseMode: 'HTML'
    });
  }

  /**
   * Set up webhook for receiving messages
   */
  async setWebhook(webhookUrl: string): Promise<void> {
    try {
      const response = await axios.post(`${this.apiUrl}/setWebhook`, {
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query']
      });

      console.log('Webhook set successfully:', response.data);
    } catch (error) {
      console.error('Failed to set webhook:', error);
      throw error;
    }
  }

  /**
   * Get bot information
   */
  async getBotInfo(): Promise<any> {
    try {
      const response = await axios.get(`${this.apiUrl}/getMe`);
      return response.data;
    } catch (error) {
      console.error('Failed to get bot info:', error);
      throw error;
    }
  }

  /**
   * Handle incoming messages (for webhook)
   */
  handleIncomingMessage(update: any): void {
    if (update.message) {
      const message = update.message;
      console.log('Received message:', message.text);
      
      // Handle different message types
      if (message.text) {
        this.handleTextMessage(message);
      }
    }
  }

  private handleTextMessage(message: any): void {
    const text = message.text.toLowerCase();
    
    // Handle common queries
    if (text.includes('attendance') || text.includes('summary')) {
      // Trigger attendance summary
      console.log('User requested attendance summary');
    } else if (text.includes('help')) {
      // Send help message
      console.log('User requested help');
    } else if (text.includes('status') || text.includes('health')) {
      // Send system status
      console.log('User requested system status');
    }
  }
}

// Export singleton instance
export const telegramService = new TelegramBotService({
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  chatId: process.env.TELEGRAM_CHAT_ID,
  baseUrl: process.env.TELEGRAM_API_URL
});

export default TelegramBotService;
