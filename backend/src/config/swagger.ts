import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'POD AI Monitoring Assistant API',
      version: '1.0.0',
      description: 'Backend API for POD AI Monitoring Assistant - School Attendance System',
      contact: {
        name: 'POD AI Team',
        email: 'support@podai.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3001',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            fullName: { type: 'string' },
            role: { 
              type: 'string', 
              enum: ['beadle', 'adviser', 'coordinator', 'admin'] 
            },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Section: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            gradeLevel: { type: 'string' },
            schoolYear: { type: 'string' },
            adviserId: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Student: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            studentNumber: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            middleName: { type: 'string', nullable: true },
            sectionId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        AttendanceRecord: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            studentId: { type: 'string' },
            sectionId: { type: 'string' },
            date: { type: 'string', format: 'date' },
            status: { 
              type: 'string', 
              enum: ['present', 'absent'] 
            },
            proofUrl: { type: 'string', nullable: true },
            submittedBy: { type: 'string' },
            notes: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        StoredFile: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            size: { type: 'integer' },
            type: { type: 'string' },
            url: { type: 'string' },
            uploadedBy: { type: 'string' },
            description: { type: 'string', nullable: true },
            category: { 
              type: 'string', 
              enum: ['attendance_reports', 'student_documents', 'photos', 'certificates', 'other'] 
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.ts'] // Path to the API files
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'POD AI Monitoring API Documentation'
  }));
};
