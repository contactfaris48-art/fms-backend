# File Management System Backend

A robust NestJS backend for a file management system similar to Google Drive or Dropbox, featuring AWS S3 storage, PostgreSQL database, and comprehensive file management capabilities.

## 🚀 Features

- **User Authentication**: JWT-based authentication with secure password hashing
- **File Management**: Upload, download, delete, and organize files
- **Folder Structure**: Hierarchical folder organization with parent-child relationships
- **AWS S3 Integration**: Secure file storage with S3 and CloudFront CDN
- **File Sharing**: Generate shareable links with configurable permissions
- **Storage Quotas**: Per-user storage limits and usage tracking
- **PostgreSQL Database**: Relational database for metadata management
- **API Documentation**: Auto-generated Swagger/OpenAPI documentation
- **TypeScript**: Full type safety and modern ES features

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL database
- AWS Account with S3 bucket configured
- AWS Access Key and Secret Key

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd fms-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Application
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=fms_db

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET_NAME=your-fms-bucket
AWS_S3_BUCKET_REGION=us-east-1
AWS_CLOUDFRONT_DOMAIN=your-cloudfront-domain.cloudfront.net

# File Upload
MAX_FILE_SIZE=104857600
DEFAULT_STORAGE_QUOTA=5368709120
```

4. **Set up the database**
```bash
# Create PostgreSQL database
createdb fms_db

# Run migrations (after implementing them)
npm run migration:run
```

5. **Start the application**
```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## 📁 Project Structure

```
fms-backend/
├── src/
│   ├── modules/
│   │   ├── auth/              # Authentication & JWT
│   │   │   ├── dto/
│   │   │   ├── strategies/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.module.ts
│   │   ├── users/             # User management
│   │   │   ├── entities/
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── users.module.ts
│   │   ├── files/             # File operations
│   │   │   ├── entities/
│   │   │   ├── files.controller.ts
│   │   │   ├── files.service.ts
│   │   │   └── files.module.ts
│   │   ├── folders/           # Folder management
│   │   │   ├── entities/
│   │   │   ├── folders.controller.ts
│   │   │   ├── folders.service.ts
│   │   │   └── folders.module.ts
│   │   ├── storage/           # AWS S3 integration
│   │   │   ├── storage.service.ts
│   │   │   └── storage.module.ts
│   │   └── sharing/           # File sharing
│   │       ├── sharing.controller.ts
│   │       ├── sharing.service.ts
│   │       └── sharing.module.ts
│   ├── common/
│   │   ├── decorators/        # Custom decorators
│   │   └── guards/            # Auth guards
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   └── main.ts
├── .env.example
├── .gitignore
├── nest-cli.json
├── package.json
├── tsconfig.json
└── README.md
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Users
- `GET /api/users/me` - Get current user profile
- `GET /api/users/storage` - Get storage information

### Files
- `POST /api/files/upload` - Upload file
- `GET /api/files` - List all files
- `GET /api/files/:id/download` - Download file
- `DELETE /api/files/:id` - Delete file

### Folders
- `POST /api/folders` - Create folder
- `GET /api/folders` - List folders
- `DELETE /api/folders/:id` - Delete folder

### Sharing
- `POST /api/sharing/files/:id/share` - Generate share link
- `GET /api/sharing/validate/:token` - Validate share token

## 📚 API Documentation

Once the application is running, visit:
- **Swagger UI**: http://localhost:3000/api/docs

## 🗄️ Database Schema

### Users Table
- id (UUID, PK)
- email (unique)
- password (hashed)
- firstName
- lastName
- storageQuota
- storageUsed
- isActive
- createdAt
- updatedAt

### Files Table
- id (UUID, PK)
- name
- originalName
- mimeType
- size
- s3Key
- s3Bucket
- cloudFrontUrl
- folderId (FK)
- ownerId (FK)
- permission (enum: private, public, shared)
- shareToken
- sharedWith
- description
- isDeleted
- deletedAt
- createdAt
- updatedAt

### Folders Table
- id (UUID, PK)
- name
- description
- isRoot
- parentId (FK, self-reference)
- ownerId (FK)
- isShared
- sharedWith
- createdAt
- updatedAt

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token authentication
- Protected routes with guards
- Input validation with class-validator
- SQL injection prevention with TypeORM
- CORS configuration
- Environment variable protection

## 🚧 Development Roadmap

### Phase 1: MVP (Current)
- [x] Project structure setup
- [x] Authentication module
- [x] Basic file operations
- [x] Folder management
- [x] AWS S3 integration stub
- [ ] Complete S3 upload/download implementation
- [ ] Database migrations
- [ ] File sharing implementation

### Phase 2: Enhanced Features
- [ ] File versioning
- [ ] Advanced search
- [ ] Real-time notifications
- [ ] File previews/thumbnails
- [ ] Bulk operations
- [ ] Trash/recycle bin
- [ ] Activity logs

### Phase 3: Optimization
- [ ] Caching layer (Redis)
- [ ] Rate limiting
- [ ] File compression
- [ ] Chunked uploads for large files
- [ ] Background job processing
- [ ] Performance monitoring

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📝 Scripts

```bash
npm run start          # Start application
npm run start:dev      # Start in development mode
npm run start:debug    # Start in debug mode
npm run build          # Build for production
npm run format         # Format code with Prettier
npm run lint           # Lint code with ESLint
npm run test           # Run tests
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Team

Your development team

## 📧 Support

For support, email your-email@example.com or create an issue in the repository.

## 🙏 Acknowledgments

- NestJS framework
- AWS SDK
- TypeORM
- PostgreSQL
- All contributors

---# fms-backend
