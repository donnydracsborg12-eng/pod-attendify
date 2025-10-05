# POD AI Monitoring Assistant - Backend API

A comprehensive backend API for the POD AI Monitoring Assistant school attendance system, built with Node.js, Express, TypeScript, and PostgreSQL.

## 🚀 Features

- **JWT Authentication**: Secure user authentication and authorization
- **Role-Based Access Control**: Different permissions for Beadle, Adviser, Coordinator, and Admin roles
- **Attendance Management**: Complete CRUD operations for attendance records
- **File Upload System**: S3-compatible file storage with size limits (≤2MB)
- **Analytics & Reporting**: Comprehensive attendance analytics and insights
- **AI Integration Ready**: `/api/ai/query` endpoint for future AI service integration
- **Audit Logging**: Complete audit trail for all critical operations
- **Health Monitoring**: System health checks and metrics endpoints
- **API Documentation**: Swagger/OpenAPI documentation
- **Rate Limiting**: Protection against abuse and DDoS attacks

## 🛠️ Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: AWS S3 (configurable)
- **Documentation**: Swagger/OpenAPI 3.0
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Joi schema validation

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v13 or higher)
- AWS S3 bucket (for file storage)
- npm or yarn package manager

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pod-attendify-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=3001
   DATABASE_URL="postgresql://username:password@localhost:5432/pod_attendify?schema=public"
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d
   MAX_FILE_SIZE=2097152
   ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
   AWS_ACCESS_KEY_ID=your-aws-access-key
   AWS_SECRET_ACCESS_KEY=your-aws-secret-key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=pod-attendify-files
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run generate
   
   # Run database migrations
   npm run migrate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3001`

## 📚 API Documentation

Once the server is running, you can access the interactive API documentation at:
- **Swagger UI**: `http://localhost:3001/api-docs`

## 🔐 Authentication

The API uses JWT-based authentication. Include the token in the Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

### User Roles

- **beadle**: Can mark attendance for assigned sections
- **adviser**: Can view attendance data and manage students
- **coordinator**: Can view analytics and manage sections
- **admin**: Full system access including user management

## 🛣️ API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password
- `GET /api/auth/verify` - Verify token

### Attendance
- `POST /api/attendance/mark` - Mark attendance for section
- `GET /api/attendance` - Get attendance records
- `GET /api/attendance/stats` - Get attendance statistics
- `PUT /api/attendance/:id` - Update attendance record
- `DELETE /api/attendance/:id` - Delete attendance record

### Sections
- `GET /api/sections` - Get all sections
- `GET /api/sections/:id` - Get section by ID
- `POST /api/sections` - Create new section
- `PUT /api/sections/:id` - Update section
- `DELETE /api/sections/:id` - Delete section
- `GET /api/sections/:id/students` - Get section students

### Users (Admin only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `PUT /api/users/:id/deactivate` - Deactivate user
- `PUT /api/users/:id/reactivate` - Reactivate user
- `GET /api/users/stats/overview` - Get user statistics

### Files
- `POST /api/files/upload` - Upload file
- `GET /api/files` - Get files
- `GET /api/files/:id` - Get file by ID
- `DELETE /api/files/:id` - Delete file
- `GET /api/files/:id/download` - Download file
- `GET /api/files/stats/overview` - Get file statistics

### Analytics
- `GET /api/analytics/attendance` - Get attendance analytics
- `GET /api/analytics/sections` - Get section analytics
- `GET /api/analytics/top-absent` - Get top absent students
- `GET /api/analytics/trends` - Get attendance trends

### AI Integration
- `POST /api/ai/query` - AI query endpoint (future-ready)

### Health & Monitoring
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed health check
- `GET /api/health/metrics` - System metrics

## 🗄️ Database Schema

The database includes the following main entities:

- **users**: User accounts with role-based access
- **sections**: School sections/classes
- **students**: Student records
- **attendance_records**: Daily attendance data
- **stored_files**: File metadata and storage info
- **audit_logs**: System audit trail
- **notification_schedules**: Notification configuration

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Granular permissions system
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Joi schema validation for all inputs
- **File Upload Security**: Type and size restrictions
- **Audit Logging**: Complete operation tracking
- **CORS Protection**: Configurable cross-origin policies
- **Helmet Security**: Security headers and protections

## 📁 File Upload System

The system supports file uploads with the following features:

- **Size Limit**: Maximum 2MB per file
- **Allowed Types**: Images, PDFs, CSV, Excel files
- **S3 Storage**: AWS S3 compatible storage
- **Categories**: Organized file categorization
- **Access Control**: Role-based file access

## 🤖 AI Integration

The `/api/ai/query` endpoint is designed for future AI service integration:

- **Current**: Mock responses based on attendance data
- **Future**: Ready for Llama, OpenAI, or other AI services
- **Context**: Attendance-specific query processing
- **Extensible**: Easy to add new AI capabilities

## 🚀 Deployment

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3001
DATABASE_URL="postgresql://username:password@host:5432/pod_attendify?schema=public"
JWT_SECRET=your-production-jwt-secret
JWT_EXPIRES_IN=7d
MAX_FILE_SIZE=2097152
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
AWS_ACCESS_KEY_ID=your-production-aws-key
AWS_SECRET_ACCESS_KEY=your-production-aws-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=pod-attendify-files-prod
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Build for Production

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run tests with coverage
npm run test:coverage
```

## 📊 Monitoring

The API includes comprehensive monitoring endpoints:

- **Health Check**: `GET /api/health`
- **Detailed Health**: `GET /api/health/detailed`
- **System Metrics**: `GET /api/health/metrics`

## 🔄 Future Enhancements

- **Real AI Integration**: Connect to Llama or OpenAI services
- **Notification System**: Telegram/email notifications
- **Offline Support**: Local database synchronization
- **Mobile API**: Optimized endpoints for mobile apps
- **Advanced Analytics**: Machine learning insights
- **Multi-tenant Support**: Multiple school support

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For support and questions:
- Email: support@podai.com
- Documentation: [API Docs](http://localhost:3001/api-docs)
- Issues: GitHub Issues

---

**POD AI Monitoring Assistant** - Intelligent school attendance management system.
