import axios from 'axios';

interface OllamaConfig {
  baseUrl: string;
  model: string;
  apiKey?: string;
}

interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    repeat_penalty?: number;
  };
}

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

interface AttendanceQuery {
  query: string;
  context?: {
    section?: string;
    dateRange?: string;
    studentId?: string;
  };
}

class OllamaAIService {
  private config: OllamaConfig;

  constructor(config: OllamaConfig) {
    this.config = config;
  }

  /**
   * Generate AI response for attendance queries
   */
  async generateAttendanceInsight(query: AttendanceQuery): Promise<string> {
    try {
      const prompt = this.buildAttendancePrompt(query);
      
      const response = await axios.post(`${this.config.baseUrl}/api/generate`, {
        model: this.config.model,
        prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40,
          repeat_penalty: 1.1
        }
      });

      return response.data.response;
    } catch (error) {
      console.error('Failed to generate AI insight:', error);
      throw error;
    }
  }

  /**
   * Analyze attendance patterns
   */
  async analyzeAttendancePatterns(data: any[]): Promise<string> {
    try {
      const prompt = this.buildAnalysisPrompt(data);
      
      const response = await axios.post(`${this.config.baseUrl}/api/generate`, {
        model: this.config.model,
        prompt,
        stream: false,
        options: {
          temperature: 0.5,
          top_p: 0.8
        }
      });

      return response.data.response;
    } catch (error) {
      console.error('Failed to analyze attendance patterns:', error);
      throw error;
    }
  }

  /**
   * Generate attendance summary
   */
  async generateAttendanceSummary(data: any): Promise<string> {
    try {
      const prompt = this.buildSummaryPrompt(data);
      
      const response = await axios.post(`${this.config.baseUrl}/api/generate`, {
        model: this.config.model,
        prompt,
        stream: false,
        options: {
          temperature: 0.6,
          top_p: 0.9
        }
      });

      return response.data.response;
    } catch (error) {
      console.error('Failed to generate attendance summary:', error);
      throw error;
    }
  }

  /**
   * Answer natural language questions about attendance
   */
  async answerAttendanceQuestion(question: string, context: any): Promise<string> {
    try {
      const prompt = this.buildQuestionPrompt(question, context);
      
      const response = await axios.post(`${this.config.baseUrl}/api/generate`, {
        model: this.config.model,
        prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9
        }
      });

      return response.data.response;
    } catch (error) {
      console.error('Failed to answer attendance question:', error);
      throw error;
    }
  }

  /**
   * Generate recommendations based on attendance data
   */
  async generateRecommendations(data: any): Promise<string> {
    try {
      const prompt = this.buildRecommendationPrompt(data);
      
      const response = await axios.post(`${this.config.baseUrl}/api/generate`, {
        model: this.config.model,
        prompt,
        stream: false,
        options: {
          temperature: 0.8,
          top_p: 0.9
        }
      });

      return response.data.response;
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      throw error;
    }
  }

  /**
   * Check if Ollama service is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/api/tags`);
      return response.status === 200;
    } catch (error) {
      console.error('Ollama service health check failed:', error);
      return false;
    }
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/api/tags`);
      return response.data.models.map((model: any) => model.name);
    } catch (error) {
      console.error('Failed to get available models:', error);
      return [];
    }
  }

  private buildAttendancePrompt(query: AttendanceQuery): string {
    return `You are an AI assistant for a school attendance monitoring system. 
    
Context: ${JSON.stringify(query.context || {})}

User Query: ${query.query}

Please provide a helpful, accurate response about attendance data. Be concise but informative. 
If you need specific data that isn't provided in the context, mention what additional information would be helpful.

Response:`;
  }

  private buildAnalysisPrompt(data: any[]): string {
    return `Analyze the following attendance data and provide insights about patterns, trends, and notable observations:

Data: ${JSON.stringify(data)}

Please provide:
1. Key patterns observed
2. Trends over time
3. Notable anomalies or concerns
4. Recommendations for improvement

Keep the analysis concise but comprehensive.`;
  }

  private buildSummaryPrompt(data: any): string {
    return `Generate a comprehensive attendance summary based on the following data:

Data: ${JSON.stringify(data)}

Please include:
1. Overall attendance statistics
2. Section-wise breakdown
3. Top performers and areas of concern
4. Key insights and recommendations

Format the summary in a clear, professional manner suitable for school administrators.`;
  }

  private buildQuestionPrompt(question: string, context: any): string {
    return `You are an AI assistant for a school attendance system. Answer the following question based on the provided context:

Question: ${question}

Context: ${JSON.stringify(context)}

Provide a clear, accurate answer. If the context doesn't contain enough information to answer the question, explain what additional data would be needed.`;
  }

  private buildRecommendationPrompt(data: any): string {
    return `Based on the following attendance data, provide actionable recommendations for improving student attendance:

Data: ${JSON.stringify(data)}

Please provide:
1. Immediate actions needed
2. Long-term strategies
3. Specific interventions for high-risk students
4. System improvements
5. Communication strategies

Make recommendations practical and implementable for school staff.`;
  }
}

// Export singleton instance
export const ollamaService = new OllamaAIService({
  baseUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434',
  model: process.env.OLLAMA_MODEL || 'llama2',
  apiKey: process.env.OLLAMA_API_KEY
});

export default OllamaAIService;
