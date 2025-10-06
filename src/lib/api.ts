// API Client for POD AI Monitoring Backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers as Record<string, string> || {}),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Authentication
  async login(email: string, password: string) {
    const response = await this.request<{
      message: string;
      user: any;
      token: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    this.setToken(response.token);
    return response;
  }

  async register(userData: {
    email: string;
    password: string;
    fullName: string;
    role?: string;
  }) {
    const response = await this.request<{
      message: string;
      user: any;
      token: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    this.setToken(response.token);
    return response;
  }

  async getProfile() {
    return this.request<{ user: any }>('/auth/profile');
  }

  async updateProfile(data: { fullName?: string; email?: string }) {
    return this.request<{ message: string; user: any }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async logout() {
    this.clearToken();
  }

  // Attendance
  async markAttendance(data: {
    sectionId: string;
    date: string;
    records: Array<{
      studentId: string;
      status: 'present' | 'absent';
      notes?: string;
    }>;
  }) {
    return this.request<{
      message: string;
      recordsCreated: number;
      date: string;
      sectionId: string;
    }>('/attendance/mark', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAttendance(params?: {
    sectionId?: string;
    startDate?: string;
    endDate?: string;
    studentId?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    return this.request<{
      records: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(`/attendance?${searchParams.toString()}`);
  }

  async getAttendanceStats(params?: {
    sectionId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    return this.request<{
      totalRecords: number;
      presentRecords: number;
      absentRecords: number;
      attendanceRate: number;
    }>(`/attendance/stats?${searchParams.toString()}`);
  }

  async updateAttendance(id: string, data: {
    status?: 'present' | 'absent';
    notes?: string;
  }) {
    return this.request<{
      message: string;
      record: any;
    }>(`/attendance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAttendance(id: string) {
    return this.request<{ message: string }>(`/attendance/${id}`, {
      method: 'DELETE',
    });
  }

  // Sections
  async getSections() {
    return this.request<{ sections: any[] }>('/sections');
  }

  async getSection(id: string) {
    return this.request<{ section: any }>(`/sections/${id}`);
  }

  async createSection(data: {
    name: string;
    gradeLevel: string;
    schoolYear: string;
    adviserId?: string;
  }) {
    return this.request<{
      message: string;
      section: any;
    }>('/sections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSection(id: string, data: {
    name?: string;
    gradeLevel?: string;
    schoolYear?: string;
    adviserId?: string | null;
  }) {
    return this.request<{
      message: string;
      section: any;
    }>(`/sections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSection(id: string) {
    return this.request<{ message: string }>(`/sections/${id}`, {
      method: 'DELETE',
    });
  }

  async getSectionStudents(id: string) {
    return this.request<{
      section: any;
      students: any[];
    }>(`/sections/${id}/students`);
  }

  // Students (via CSV upload)
  async uploadStudentsCSV(file: File, sectionId: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sectionId', sectionId);

    const response = await fetch(`${this.baseURL}/students/upload-csv`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Analytics
  async getAttendanceAnalytics(params?: {
    sectionId?: string;
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month';
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    return this.request<{
      summary: {
        totalRecords: number;
        presentRecords: number;
        absentRecords: number;
        overallAttendanceRate: number;
      };
      trends: any[];
      studentPerformance: any[];
    }>(`/analytics/attendance?${searchParams.toString()}`);
  }

  async getSectionAnalytics() {
    return this.request<{ sections: any[] }>('/analytics/sections');
  }

  async getTopAbsentStudents(params?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    return this.request<{ topAbsentStudents: any[] }>(`/analytics/top-absent?${searchParams.toString()}`);
  }

  async getAttendanceTrends(params?: { days?: number }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    return this.request<{
      trends: any[];
      trendDirection: string;
      recentAverage: number;
      previousAverage: number;
    }>(`/analytics/trends?${searchParams.toString()}`);
  }

  // Files
  async uploadFile(file: File, description?: string, category?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (description) formData.append('description', description);
    if (category) formData.append('category', category);

    const response = await fetch(`${this.baseURL}/files/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getFiles(params?: {
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    return this.request<{
      files: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(`/files?${searchParams.toString()}`);
  }

  async deleteFile(id: string) {
    return this.request<{ message: string }>(`/files/${id}`, {
      method: 'DELETE',
    });
  }

  getFileDownloadUrl(id: string) {
    return `${this.baseURL}/files/${id}/download`;
  }

  // AI Assistant
  async queryAI(query: string, context?: string) {
    return this.request<{
      query: string;
      response: string;
      timestamp: string;
      aiService: string;
      context: string;
    }>('/ai/query', {
      method: 'POST',
      body: JSON.stringify({ query, context }),
    });
  }

  // Health Check
  async getHealthStatus() {
    return this.request<{
      status: string;
      timestamp: string;
      uptime: number;
      environment: string;
      version: string;
      database: any;
      services: any;
    }>('/health');
  }
}

// Create and export the API client instance
export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
