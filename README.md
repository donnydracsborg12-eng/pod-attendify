# POD AI Monitoring Assistant — School Attendance System

A comprehensive full-stack cloud-based school attendance monitoring platform with AI-powered insights, role-based dashboards, and intelligent analytics.

## 🎯 Project Overview

This system serves as a unified school attendance monitoring platform that includes:
- **Frontend**: React + TypeScript with modern UI/UX
- **Backend**: Node.js + Express REST API with PostgreSQL
- **Authentication**: JWT-based role management
- **File Storage**: S3-compatible cloud storage
- **Analytics**: Real-time attendance insights and trends
- **AI Integration**: Intelligent query processing (future-ready)
- **Deployment**: Docker-based cloud deployment

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Styling**: TailwindCSS with shadcn/ui components
- **State Management**: React Query for server state
- **Routing**: React Router v6
- **Build Tool**: Vite
- **UI Components**: Custom components with modern, accessible design

### Backend (Node.js + Express)
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with role-based access control
- **File Storage**: AWS S3 compatible
- **Documentation**: Swagger/OpenAPI 3.0
- **Security**: Helmet, CORS, Rate Limiting

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Docker (optional)
- AWS S3 bucket (for file storage)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pod-attendify
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp env.example .env
   # Update .env with your configuration
   npm run generate
   npm run migrate
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd .. # Back to root
   npm install
npm run dev
```

4. **Access the application**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:3001
   - API Documentation: http://localhost:3001/api-docs

### Production Deployment

1. **Using Docker Compose**
   ```bash
   cp env.example .env
   # Update .env with production values
   docker-compose up -d
   ```

2. **Manual Deployment**
   ```bash
   # Build and start backend
   cd backend
   npm run build
   npm start
   
   # Build and serve frontend
   npm run build
   # Serve with nginx or similar
   ```

## 👥 User Roles & Features

### 🧾 Beadle Dashboard
- Mark attendance for assigned sections
- Upload attendance proof (≤2MB)
- Submit attendance with confirmation
- AI assistant for attendance queries

### 👩‍🏫 Adviser Dashboard
- Review attendance submissions
- View missing or delayed reports
- Manage student records
- CSV upload for bulk student data

### 📊 Coordinator Dashboard
- Attendance analytics and trends
- "Top absent students" insights
- Override/update attendance records
- Export reports to CSV/XLSX
- Manage sections

### ⚙️ Admin Dashboard
- Manage users, roles, and permissions
- Configure notification schedules
- View audit logs
- System configuration
- User statistics and analytics

## 🔧 Core Features

### Authentication & Security
- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Rate limiting and CORS protection
- Audit logging for all operations

### Attendance Management
- Daily attendance marking
- Present/Absent status tracking
- Notes and proof uploads
- Bulk operations support
- Real-time statistics

### Analytics & Reporting
- Interactive charts (Line, Bar, Pie)
- Attendance trends analysis
- Student performance metrics
- Section-wise analytics
- Export capabilities

### File Management
- Secure file upload (≤2MB)
- S3-compatible storage
- File categorization
- Access control
- Download and preview

### AI Integration
- Natural language queries
- Attendance pattern analysis
- Intelligent insights
- Future-ready for Llama/OpenAI

## 📊 Database Schema

### Core Entities
- **users**: User accounts with roles
- **sections**: School sections/classes
- **students**: Student records
- **attendance_records**: Daily attendance data
- **stored_files**: File metadata
- **audit_logs**: System audit trail

### Relationships
- Users can be advisers for sections
- Students belong to sections
- Attendance records link students, sections, and users
- Files are uploaded by users
- Audit logs track all changes

## 🔌 API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `GET /profile` - Get user profile
- `PUT /profile` - Update profile
- `PUT /change-password` - Change password

### Attendance (`/api/attendance`)
- `POST /mark` - Mark attendance
- `GET /` - Get attendance records
- `GET /stats` - Get statistics
- `PUT /:id` - Update record
- `DELETE /:id` - Delete record

### Sections (`/api/sections`)
- `GET /` - List sections
- `GET /:id` - Get section details
- `POST /` - Create section
- `PUT /:id` - Update section
- `DELETE /:id` - Delete section

### Analytics (`/api/analytics`)
- `GET /attendance` - Attendance analytics
- `GET /sections` - Section analytics
- `GET /top-absent` - Top absent students
- `GET /trends` - Attendance trends

### Files (`/api/files`)
- `POST /upload` - Upload file
- `GET /` - List files
- `GET /:id` - Get file details
- `DELETE /:id` - Delete file
- `GET /:id/download` - Download file

### AI (`/api/ai`)
- `POST /query` - AI query processing

### Health (`/api/health`)
- `GET /` - Basic health check
- `GET /detailed` - Detailed health check
- `GET /metrics` - System metrics

## 🎨 UI/UX Design

### Design Principles
- **Brand**: Clean, school-friendly visual language
- **Mobile-first**: Responsive design for all devices
- **Accessibility**: WCAG compliant components
- **Modern**: Clean, professional interface
- **Intuitive**: Easy-to-use navigation

### Component Library
- Built with shadcn/ui components
- Custom components for attendance features
- Consistent design system
- Dark/light mode support
- Smooth animations and transitions

## 🔒 Security Features

### Authentication
- JWT tokens with expiration
- Password hashing (bcrypt)
- Role-based permissions
- Session management

### Data Protection
- Input validation (Joi schemas)
- SQL injection prevention (Prisma ORM)
- XSS protection (Helmet)
- CORS configuration
- Rate limiting

### File Security
- File type validation
- Size limits (2MB max)
- Secure S3 storage
- Access control

## 📈 Monitoring & Analytics

### System Health
- Health check endpoints
- Database connectivity monitoring
- File storage status
- Memory and CPU metrics

### Business Analytics
- Attendance rate trends
- Student performance metrics
- Section-wise analysis
- User activity tracking

### Audit Trail
- Complete operation logging
- User action tracking
- Data change history
- Security event monitoring

## 🚀 Deployment Options

### Cloud Deployment
- **AWS**: EC2, RDS, S3, CloudFront
- **Google Cloud**: Compute Engine, Cloud SQL, Storage
- **Azure**: Virtual Machines, SQL Database, Blob Storage
- **DigitalOcean**: Droplets, Managed Databases

### Container Deployment
- Docker Compose for local development
- Kubernetes for production scaling
- Nginx reverse proxy
- SSL/TLS termination

### Environment Configuration
- Development: Local PostgreSQL, file storage
- Staging: Cloud database, S3 storage
- Production: Managed services, CDN, monitoring

## 🔮 Future Enhancements

### Phase 2: Local/Offline Support
- Local database synchronization
- Offline attendance marking
- Mobile app development
- Progressive Web App (PWA)

### Phase 3: Advanced AI
- Real AI service integration (Llama/OpenAI)
- Predictive analytics
- Automated insights
- Natural language processing

### Phase 4: Multi-tenant
- Multiple school support
- Tenant isolation
- Custom branding
- Advanced reporting

## 📚 Documentation

- **API Documentation**: Available at `/api-docs` when running
- **Frontend Components**: Storybook documentation
- **Database Schema**: Prisma schema documentation
- **Deployment Guide**: Docker and cloud deployment
- **Contributing Guide**: Development setup and guidelines

## 🛠️ Development

### Code Structure
```
pod-attendify/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── middleware/      # Custom middleware
│   │   ├── config/         # Configuration files
│   │   └── server.ts       # Main server file
│   ├── prisma/             # Database schema and migrations
│   └── package.json
├── src/                    # React frontend
│   ├── components/         # Reusable components
│   ├── pages/             # Page components
│   ├── lib/               # Utilities and API client
│   └── hooks/             # Custom React hooks
├── docker-compose.yml      # Docker deployment
└── README.md
```

### Development Workflow
1. Feature development in separate branches
2. Code review and testing
3. Automated deployment to staging
4. Production deployment after approval

## 📞 Support

- **Documentation**: Comprehensive guides and API docs
- **Issues**: GitHub Issues for bug reports
- **Discussions**: GitHub Discussions for questions
- **Email**: support@podai.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**POD AI Monitoring Assistant** - Intelligent school attendance management system with AI-powered insights and modern cloud architecture.

Built with ❤️ for educational institutions worldwide.