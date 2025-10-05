import axios from 'axios';

interface MetabaseConfig {
  baseUrl: string;
  username: string;
  password: string;
  sessionToken?: string;
}

interface Dashboard {
  id: number;
  name: string;
  description: string;
  cards: Card[];
}

interface Card {
  id: number;
  name: string;
  description: string;
  visualization_settings: any;
  dataset_query: any;
}

interface QueryResult {
  data: any[];
  columns: any[];
  rows: any[];
}

interface AttendanceMetrics {
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
  sectionBreakdown: Array<{
    section: string;
    attendanceRate: number;
    totalStudents: number;
  }>;
}

class MetabaseService {
  private config: MetabaseConfig;
  private sessionToken: string | null = null;

  constructor(config: MetabaseConfig) {
    this.config = config;
    this.sessionToken = config.sessionToken || null;
  }

  /**
   * Authenticate with Metabase
   */
  async authenticate(): Promise<void> {
    try {
      const response = await axios.post(`${this.config.baseUrl}/api/session`, {
        username: this.config.username,
        password: this.config.password
      });

      this.sessionToken = response.data.id;
      console.log('Metabase authentication successful');
    } catch (error) {
      console.error('Metabase authentication failed:', error);
      throw error;
    }
  }

  /**
   * Get authentication headers
   */
  private getHeaders(): Record<string, string> {
    if (!this.sessionToken) {
      throw new Error('Not authenticated with Metabase');
    }

    return {
      'Content-Type': 'application/json',
      'X-Metabase-Session': this.sessionToken
    };
  }

  /**
   * Get all dashboards
   */
  async getDashboards(): Promise<Dashboard[]> {
    try {
      const response = await axios.get(
        `${this.config.baseUrl}/api/dashboard`,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to get dashboards:', error);
      throw error;
    }
  }

  /**
   * Get dashboard by ID
   */
  async getDashboard(dashboardId: number): Promise<Dashboard> {
    try {
      const response = await axios.get(
        `${this.config.baseUrl}/api/dashboard/${dashboardId}`,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to get dashboard:', error);
      throw error;
    }
  }

  /**
   * Execute a query
   */
  async executeQuery(query: any): Promise<QueryResult> {
    try {
      const response = await axios.post(
        `${this.config.baseUrl}/api/dataset`,
        query,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to execute query:', error);
      throw error;
    }
  }

  /**
   * Get attendance summary for today
   */
  async getTodayAttendanceSummary(): Promise<AttendanceMetrics> {
    const query = {
      database: 1, // Assuming database ID 1
      type: 'native',
      native: {
        query: `
          WITH attendance_summary AS (
            SELECT
              s.section,
              COUNT(DISTINCT s.id) as total_students,
              COUNT(DISTINCT CASE WHEN a.status = 'present' THEN s.id END) as present_count,
              COUNT(DISTINCT CASE WHEN a.status = 'absent' THEN s.id END) as absent_count
            FROM
              students s
              LEFT JOIN attendance a ON s.id = a.student_id AND a.date = CURRENT_DATE
            WHERE
              s.active = true
            GROUP BY
              s.section
          )
          SELECT
            section,
            total_students,
            present_count,
            absent_count,
            ROUND(100.0 * present_count / total_students, 2) as attendance_rate
          FROM
            attendance_summary
          ORDER BY
            attendance_rate DESC;
        `
      }
    };

    const result = await this.executeQuery(query);
    
    const sectionBreakdown = result.rows.map((row: any) => ({
      section: row[0],
      attendanceRate: row[4],
      totalStudents: row[1]
    }));

    const totalStudents = sectionBreakdown.reduce((sum: number, section: any) => sum + section.totalStudents, 0);
    const totalPresent = sectionBreakdown.reduce((sum: number, section: any) => 
      sum + (section.totalStudents * section.attendanceRate / 100), 0
    );

    return {
      totalStudents,
      presentCount: Math.round(totalPresent),
      absentCount: totalStudents - Math.round(totalPresent),
      attendanceRate: totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0,
      sectionBreakdown
    };
  }

  /**
   * Get attendance trends for the last 30 days
   */
  async getAttendanceTrends(days: number = 30): Promise<Array<{
    date: string;
    attendanceRate: number;
    totalStudents: number;
  }>> {
    const query = {
      database: 1,
      type: 'native',
      native: {
        query: `
          WITH daily_attendance AS (
            SELECT
              a.date,
              COUNT(DISTINCT s.id) as total_students,
              COUNT(DISTINCT CASE WHEN a.status = 'present' THEN s.id END) as present_count
            FROM
              students s
              LEFT JOIN attendance a ON s.id = a.student_id
            WHERE
              s.active = true
              AND a.date >= CURRENT_DATE - INTERVAL '${days} days'
            GROUP BY
              a.date
          )
          SELECT
            date,
            total_students,
            ROUND(100.0 * present_count / total_students, 2) as attendance_rate
          FROM
            daily_attendance
          ORDER BY
            date;
        `
      }
    };

    const result = await this.executeQuery(query);
    
    return result.rows.map((row: any) => ({
      date: row[0],
      attendanceRate: row[2],
      totalStudents: row[1]
    }));
  }

  /**
   * Get top absent students
   */
  async getTopAbsentStudents(limit: number = 10): Promise<Array<{
    studentName: string;
    section: string;
    absenceCount: number;
    attendanceRate: number;
  }>> {
    const query = {
      database: 1,
      type: 'native',
      native: {
        query: `
          WITH student_absences AS (
            SELECT
              s.id,
              s.first_name || ' ' || s.last_name as student_name,
              s.section,
              COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absence_count,
              COUNT(a.id) as total_days,
              ROUND(100.0 * COUNT(CASE WHEN a.status = 'present' THEN 1 END) / COUNT(a.id), 2) as attendance_rate
            FROM
              students s
              LEFT JOIN attendance a ON s.id = a.student_id
            WHERE
              s.active = true
              AND a.date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY
              s.id, s.first_name, s.last_name, s.section
            HAVING
              COUNT(a.id) > 0
          )
          SELECT
            student_name,
            section,
            absence_count,
            attendance_rate
          FROM
            student_absences
          ORDER BY
            absence_count DESC, attendance_rate ASC
          LIMIT ${limit};
        `
      }
    };

    const result = await this.executeQuery(query);
    
    return result.rows.map((row: any) => ({
      studentName: row[0],
      section: row[1],
      absenceCount: row[2],
      attendanceRate: row[3]
    }));
  }

  /**
   * Get section comparison data
   */
  async getSectionComparison(): Promise<Array<{
    section: string;
    gradeLevel: string;
    attendanceRate: number;
    totalStudents: number;
    riskStudents: number;
  }>> {
    const query = {
      database: 1,
      type: 'native',
      native: {
        query: `
          WITH section_stats AS (
            SELECT
              s.section,
              s.grade_level,
              COUNT(DISTINCT s.id) as total_students,
              COUNT(DISTINCT CASE WHEN a.status = 'present' THEN s.id END) as present_count,
              COUNT(DISTINCT CASE WHEN a.status = 'absent' THEN s.id END) as absent_count
            FROM
              students s
              LEFT JOIN attendance a ON s.id = a.student_id
            WHERE
              s.active = true
              AND a.date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY
              s.section, s.grade_level
          ),
          risk_students AS (
            SELECT
              s.section,
              COUNT(DISTINCT s.id) as risk_count
            FROM
              students s
              LEFT JOIN attendance a ON s.id = a.student_id
            WHERE
              s.active = true
              AND a.date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY
              s.section
            HAVING
              COUNT(CASE WHEN a.status = 'absent' THEN 1 END) >= 5
          )
          SELECT
            ss.section,
            ss.grade_level,
            ss.total_students,
            ROUND(100.0 * ss.present_count / ss.total_students, 2) as attendance_rate,
            COALESCE(rs.risk_count, 0) as risk_students
          FROM
            section_stats ss
            LEFT JOIN risk_students rs ON ss.section = rs.section
          ORDER BY
            attendance_rate DESC;
        `
      }
    };

    const result = await this.executeQuery(query);
    
    return result.rows.map((row: any) => ({
      section: row[0],
      gradeLevel: row[1],
      totalStudents: row[2],
      attendanceRate: row[3],
      riskStudents: row[4]
    }));
  }

  /**
   * Generate attendance report
   */
  async generateAttendanceReport(
    startDate: string,
    endDate: string,
    sectionId?: string
  ): Promise<{
    summary: AttendanceMetrics;
    trends: any[];
    topAbsent: any[];
    sectionComparison: any[];
  }> {
    try {
      const [summary, trends, topAbsent, sectionComparison] = await Promise.all([
        this.getTodayAttendanceSummary(),
        this.getAttendanceTrends(30),
        this.getTopAbsentStudents(10),
        this.getSectionComparison()
      ]);

      return {
        summary,
        trends,
        topAbsent,
        sectionComparison
      };
    } catch (error) {
      console.error('Failed to generate attendance report:', error);
      throw error;
    }
  }

  /**
   * Create a new dashboard
   */
  async createDashboard(name: string, description: string): Promise<Dashboard> {
    try {
      const response = await axios.post(
        `${this.config.baseUrl}/api/dashboard`,
        {
          name,
          description,
          parameters: []
        },
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to create dashboard:', error);
      throw error;
    }
  }

  /**
   * Add card to dashboard
   */
  async addCardToDashboard(
    dashboardId: number,
    cardId: number,
    position: { x: number; y: number; width: number; height: number }
  ): Promise<void> {
    try {
      await axios.post(
        `${this.config.baseUrl}/api/dashboard/${dashboardId}/cards`,
        {
          cardId,
          position
        },
        { headers: this.getHeaders() }
      );
    } catch (error) {
      console.error('Failed to add card to dashboard:', error);
      throw error;
    }
  }

  /**
   * Get dashboard embed URL
   */
  getDashboardEmbedUrl(dashboardId: number, params?: Record<string, any>): string {
    const baseUrl = `${this.config.baseUrl}/embed/dashboard/${dashboardId}`;
    
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      return `${baseUrl}?${searchParams.toString()}`;
    }
    
    return baseUrl;
  }

  /**
   * Check Metabase service health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/api/health`);
      return response.status === 200;
    } catch (error) {
      console.error('Metabase health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const metabaseService = new MetabaseService({
  baseUrl: process.env.METABASE_URL || 'http://localhost:3000',
  username: process.env.METABASE_USERNAME || 'admin@example.com',
  password: process.env.METABASE_PASSWORD || 'admin123',
  sessionToken: process.env.METABASE_SESSION_TOKEN
});

export default MetabaseService;
