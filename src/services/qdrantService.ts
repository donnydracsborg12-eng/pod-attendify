import axios from 'axios';

interface QdrantConfig {
  url: string;
  apiKey?: string;
  collectionName?: string;
}

interface VectorPoint {
  id: string;
  vector: number[];
  payload?: Record<string, any>;
}

interface SearchResult {
  id: string;
  score: number;
  payload?: Record<string, any>;
}

interface CollectionInfo {
  name: string;
  vectors_count: number;
  indexed_vectors_count: number;
  points_count: number;
  segments_count: number;
  config: any;
}

class QdrantService {
  private config: QdrantConfig;
  private baseUrl: string;
  private collectionName: string;

  constructor(config: QdrantConfig) {
    this.config = config;
    this.collectionName = config.collectionName || 'attendance_vectors';
    this.baseUrl = `${config.url}/collections/${this.collectionName}`;
  }

  /**
   * Initialize the collection
   */
  async initializeCollection(vectorSize: number = 384): Promise<void> {
    try {
      // Check if collection exists
      const exists = await this.collectionExists();
      
      if (!exists) {
        await this.createCollection(vectorSize);
        console.log(`Created Qdrant collection: ${this.collectionName}`);
      }
    } catch (error) {
      console.error('Failed to initialize collection:', error);
      throw error;
    }
  }

  /**
   * Check if collection exists
   */
  async collectionExists(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.config.url}/collections/${this.collectionName}`,
        {
          headers: this.getHeaders()
        }
      );
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create a new collection
   */
  async createCollection(vectorSize: number): Promise<void> {
    try {
      await axios.put(
        `${this.config.url}/collections/${this.collectionName}`,
        {
          vectors: {
            size: vectorSize,
            distance: 'Cosine'
          },
          optimizers_config: {
            default_segment_number: 2
          },
          replication_factor: 1
        },
        {
          headers: this.getHeaders()
        }
      );
    } catch (error) {
      console.error('Failed to create collection:', error);
      throw error;
    }
  }

  /**
   * Add vectors to the collection
   */
  async addVectors(points: VectorPoint[]): Promise<void> {
    try {
      await axios.put(
        `${this.baseUrl}/points`,
        {
          points: points.map(point => ({
            id: point.id,
            vector: point.vector,
            payload: point.payload
          }))
        },
        {
          headers: this.getHeaders()
        }
      );
    } catch (error) {
      console.error('Failed to add vectors:', error);
      throw error;
    }
  }

  /**
   * Search for similar vectors
   */
  async searchVectors(
    queryVector: number[],
    limit: number = 10,
    scoreThreshold: number = 0.7
  ): Promise<SearchResult[]> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/points/search`,
        {
          vector: queryVector,
          limit,
          with_payload: true,
          score_threshold: scoreThreshold
        },
        {
          headers: this.getHeaders()
        }
      );

      return response.data.result.map((result: any) => ({
        id: result.id,
        score: result.score,
        payload: result.payload
      }));
    } catch (error) {
      console.error('Failed to search vectors:', error);
      throw error;
    }
  }

  /**
   * Add attendance record as vector
   */
  async addAttendanceRecord(
    recordId: string,
    vector: number[],
    metadata: {
      studentId: string;
      sectionId: string;
      date: string;
      status: 'present' | 'absent';
      timestamp: string;
    }
  ): Promise<void> {
    const point: VectorPoint = {
      id: recordId,
      vector,
      payload: {
        type: 'attendance_record',
        ...metadata
      }
    };

    await this.addVectors([point]);
  }

  /**
   * Search for similar attendance patterns
   */
  async findSimilarAttendancePatterns(
    queryVector: number[],
    limit: number = 5
  ): Promise<SearchResult[]> {
    try {
      const results = await this.searchVectors(queryVector, limit, 0.6);
      
      // Filter for attendance records
      return results.filter(result => 
        result.payload?.type === 'attendance_record'
      );
    } catch (error) {
      console.error('Failed to find similar patterns:', error);
      throw error;
    }
  }

  /**
   * Add student profile as vector
   */
  async addStudentProfile(
    studentId: string,
    vector: number[],
    metadata: {
      name: string;
      section: string;
      gradeLevel: string;
      attendanceRate: number;
      riskLevel: 'low' | 'medium' | 'high';
    }
  ): Promise<void> {
    const point: VectorPoint = {
      id: `student_${studentId}`,
      vector,
      payload: {
        type: 'student_profile',
        studentId,
        ...metadata
      }
    };

    await this.addVectors([point]);
  }

  /**
   * Find students with similar profiles
   */
  async findSimilarStudents(
    queryVector: number[],
    limit: number = 10
  ): Promise<SearchResult[]> {
    try {
      const results = await this.searchVectors(queryVector, limit, 0.5);
      
      // Filter for student profiles
      return results.filter(result => 
        result.payload?.type === 'student_profile'
      );
    } catch (error) {
      console.error('Failed to find similar students:', error);
      throw error;
    }
  }

  /**
   * Add section analytics as vector
   */
  async addSectionAnalytics(
    sectionId: string,
    vector: number[],
    metadata: {
      sectionName: string;
      gradeLevel: string;
      averageAttendance: number;
      totalStudents: number;
      riskStudents: number;
      period: string;
    }
  ): Promise<void> {
    const point: VectorPoint = {
      id: `section_${sectionId}_${metadata.period}`,
      vector,
      payload: {
        type: 'section_analytics',
        sectionId,
        ...metadata
      }
    };

    await this.addVectors([point]);
  }

  /**
   * Find similar sections for comparison
   */
  async findSimilarSections(
    queryVector: number[],
    limit: number = 5
  ): Promise<SearchResult[]> {
    try {
      const results = await this.searchVectors(queryVector, limit, 0.6);
      
      // Filter for section analytics
      return results.filter(result => 
        result.payload?.type === 'section_analytics'
      );
    } catch (error) {
      console.error('Failed to find similar sections:', error);
      throw error;
    }
  }

  /**
   * Delete a vector by ID
   */
  async deleteVector(id: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/points/delete`,
        {
          points: [id]
        },
        {
          headers: this.getHeaders()
        }
      );
    } catch (error) {
      console.error('Failed to delete vector:', error);
      throw error;
    }
  }

  /**
   * Get collection information
   */
  async getCollectionInfo(): Promise<CollectionInfo> {
    try {
      const response = await axios.get(
        `${this.config.url}/collections/${this.collectionName}`,
        {
          headers: this.getHeaders()
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to get collection info:', error);
      throw error;
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(): Promise<{
    totalPoints: number;
    totalVectors: number;
    indexedVectors: number;
  }> {
    try {
      const info = await this.getCollectionInfo();
      
      return {
        totalPoints: info.points_count,
        totalVectors: info.vectors_count,
        indexedVectors: info.indexed_vectors_count
      };
    } catch (error) {
      console.error('Failed to get collection stats:', error);
      throw error;
    }
  }

  /**
   * Check Qdrant service health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.config.url}/health`);
      return response.status === 200;
    } catch (error) {
      console.error('Qdrant health check failed:', error);
      return false;
    }
  }

  /**
   * Generate embedding vector from text (placeholder - would use actual embedding service)
   */
  generateTextEmbedding(text: string): number[] {
    // This is a placeholder implementation
    // In a real implementation, you would use an embedding service like OpenAI, Cohere, or local model
    const words = text.toLowerCase().split(' ');
    const vector = new Array(384).fill(0);
    
    // Simple hash-based embedding (not recommended for production)
    words.forEach((word, index) => {
      const hash = this.simpleHash(word);
      const position = hash % 384;
      vector[position] += 1 / (index + 1);
    });
    
    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / magnitude);
  }

  /**
   * Simple hash function for placeholder embedding
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get request headers
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    
    return headers;
  }
}

// Export singleton instance
export const qdrantService = new QdrantService({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
  collectionName: process.env.QDRANT_COLLECTION_NAME || 'attendance_vectors'
});

export default QdrantService;
