import axios from 'axios';
import * as Minio from 'minio';

interface MinIOConfig {
  endPoint: string;
  port?: number;
  useSSL?: boolean;
  accessKey: string;
  secretKey: string;
  bucketName?: string;
}

interface FileUploadOptions {
  bucketName?: string;
  objectName?: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

interface FileInfo {
  name: string;
  size: number;
  lastModified: Date;
  etag: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

class MinIOService {
  private client: Minio.Client;
  private config: MinIOConfig;
  private defaultBucket: string;

  constructor(config: MinIOConfig) {
    this.config = config;
    this.defaultBucket = config.bucketName || 'pod-attendance';
    
    this.client = new Minio.Client({
      endPoint: config.endPoint,
      port: config.port || 9000,
      useSSL: config.useSSL || false,
      accessKey: config.accessKey,
      secretKey: config.secretKey
    });

    this.initializeBucket();
  }

  /**
   * Initialize the default bucket
   */
  private async initializeBucket(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.defaultBucket);
      if (!exists) {
        await this.client.makeBucket(this.defaultBucket, 'us-east-1');
        console.log(`Created bucket: ${this.defaultBucket}`);
      }
    } catch (error) {
      console.error('Failed to initialize bucket:', error);
    }
  }

  /**
   * Upload a file to MinIO
   */
  async uploadFile(
    file: File | Buffer,
    options: FileUploadOptions = {}
  ): Promise<{ url: string; etag: string }> {
    try {
      const bucketName = options.bucketName || this.defaultBucket;
      const objectName = options.objectName || this.generateObjectName(file);
      
      let buffer: Buffer;
      if (file instanceof File) {
        buffer = Buffer.from(await file.arrayBuffer());
      } else {
        buffer = file;
      }

      const uploadInfo = await this.client.putObject(
        bucketName,
        objectName,
        buffer,
        buffer.length,
        {
          'Content-Type': options.contentType || 'application/octet-stream',
          ...options.metadata
        }
      );

      const url = await this.getFileUrl(bucketName, objectName);
      
      return { url, etag: uploadInfo.etag || '' };
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw error;
    }
  }

  /**
   * Download a file from MinIO
   */
  async downloadFile(bucketName: string, objectName: string): Promise<Buffer> {
    try {
      const stream = await this.client.getObject(bucketName, objectName);
      const chunks: Buffer[] = [];
      
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('Failed to download file:', error);
      throw error;
    }
  }

  /**
   * Get file information
   */
  async getFileInfo(bucketName: string, objectName: string): Promise<FileInfo> {
    try {
      const stat = await this.client.statObject(bucketName, objectName);
      
      return {
        name: objectName,
        size: stat.size,
        lastModified: stat.lastModified,
        etag: stat.etag,
        contentType: stat.metaData['content-type'],
        metadata: stat.metaData
      };
    } catch (error) {
      console.error('Failed to get file info:', error);
      throw error;
    }
  }

  /**
   * List files in a bucket
   */
  async listFiles(
    bucketName: string = this.defaultBucket,
    prefix?: string
  ): Promise<FileInfo[]> {
    try {
      const objectsList: FileInfo[] = [];
      const stream = this.client.listObjects(bucketName, prefix, true);
      
      return new Promise((resolve, reject) => {
        stream.on('data', (obj) => {
          objectsList.push({
            name: obj.name!,
            size: obj.size!,
            lastModified: obj.lastModified!,
            etag: obj.etag!
          });
        });
        
        stream.on('end', () => resolve(objectsList));
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('Failed to list files:', error);
      throw error;
    }
  }

  /**
   * Delete a file from MinIO
   */
  async deleteFile(bucketName: string, objectName: string): Promise<void> {
    try {
      await this.client.removeObject(bucketName, objectName);
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  /**
   * Get a presigned URL for file access
   */
  async getPresignedUrl(
    bucketName: string,
    objectName: string,
    expiry: number = 7 * 24 * 60 * 60 // 7 days
  ): Promise<string> {
    try {
      return await this.client.presignedGetObject(bucketName, objectName, expiry);
    } catch (error) {
      console.error('Failed to get presigned URL:', error);
      throw error;
    }
  }

  /**
   * Get a presigned URL for file upload
   */
  async getPresignedUploadUrl(
    bucketName: string,
    objectName: string,
    expiry: number = 24 * 60 * 60 // 1 day
  ): Promise<string> {
    try {
      return await this.client.presignedPutObject(bucketName, objectName, expiry);
    } catch (error) {
      console.error('Failed to get presigned upload URL:', error);
      throw error;
    }
  }

  /**
   * Upload attendance proof image
   */
  async uploadAttendanceProof(
    file: File,
    studentId: string,
    sectionId: string,
    date: string
  ): Promise<{ url: string; etag: string }> {
    const objectName = `attendance-proofs/${sectionId}/${date}/${studentId}-${Date.now()}.${this.getFileExtension(file.name)}`;
    
    return this.uploadFile(file, {
      bucketName: this.defaultBucket,
      objectName,
      contentType: file.type,
      metadata: {
        studentId,
        sectionId,
        date,
        type: 'attendance-proof',
        originalName: file.name
      }
    });
  }

  /**
   * Upload student document
   */
  async uploadStudentDocument(
    file: File,
    studentId: string,
    documentType: string
  ): Promise<{ url: string; etag: string }> {
    const objectName = `student-documents/${studentId}/${documentType}-${Date.now()}.${this.getFileExtension(file.name)}`;
    
    return this.uploadFile(file, {
      bucketName: this.defaultBucket,
      objectName,
      contentType: file.type,
      metadata: {
        studentId,
        documentType,
        type: 'student-document',
        originalName: file.name
      }
    });
  }

  /**
   * Upload report file
   */
  async uploadReport(
    file: File | Buffer,
    reportType: string,
    period: string
  ): Promise<{ url: string; etag: string }> {
    const objectName = `reports/${reportType}/${period}-${Date.now()}.${this.getFileExtension(file instanceof File ? file.name : 'pdf')}`;
    
    return this.uploadFile(file, {
      bucketName: this.defaultBucket,
      objectName,
      contentType: file instanceof File ? file.type : 'application/pdf',
      metadata: {
        reportType,
        period,
        type: 'report'
      }
    });
  }

  /**
   * Get file URL (public or presigned)
   */
  private async getFileUrl(bucketName: string, objectName: string): Promise<string> {
    try {
      // Try to get a presigned URL first
      return await this.getPresignedUrl(bucketName, objectName, 24 * 60 * 60); // 1 day
    } catch (error) {
      // Fallback to direct URL if presigned fails
      const protocol = this.config.useSSL ? 'https' : 'http';
      const port = this.config.port ? `:${this.config.port}` : '';
      return `${protocol}://${this.config.endPoint}${port}/${bucketName}/${objectName}`;
    }
  }

  /**
   * Generate object name from file
   */
  private generateObjectName(file: File | Buffer): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    
    if (file instanceof File) {
      const extension = this.getFileExtension(file.name);
      return `uploads/${timestamp}-${random}.${extension}`;
    } else {
      return `uploads/${timestamp}-${random}.bin`;
    }
  }

  /**
   * Get file extension
   */
  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || 'bin';
  }

  /**
   * Check MinIO service health
   */
  async checkHealth(): Promise<boolean> {
    try {
      await this.client.bucketExists(this.defaultBucket);
      return true;
    } catch (error) {
      console.error('MinIO health check failed:', error);
      return false;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{ totalSize: number; fileCount: number }> {
    try {
      const files = await this.listFiles();
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      
      return {
        totalSize,
        fileCount: files.length
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const minioService = new MinIOService({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'faksefnaj@1535n',
  bucketName: process.env.MINIO_BUCKET_NAME || 'pod-attendance'
});

export default MinIOService;
