# 🎌 Kanji Learning Platform - Backend API

Backend API server for the Kanji Learning Platform, built with NestJS, PostgreSQL, and Prisma ORM.

## 📊 API Overview

- **Total Endpoints**: 63
- **Authenticated**: 50 (79%)
- **Admin Only**: 18 (29%)
- **Modules**: 8 (Auth, Kanji, Kanji Lists, Quiz, Flashcard, AI, Categories, Users)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Python 3.8+ (for AI service)
- Docker (optional)

### Installation

```bash
# Install dependencies
yarn install

# Setup environment variables
cp .env.example .env
# Edit .env with your database credentials

# Setup database
npx prisma generate
npx prisma migrate dev

# Seed initial data (optional)
npx prisma db seed
```

## 🏃 Running the Application

```bash
# Development mode with hot reload
yarn start:dev

# Production mode
yarn start:prod

# Docker compose (includes PostgreSQL)
docker-compose up -d
```

## 📚 API Documentation

### Complete References

- **[API Documentation](./API_DOCUMENTATION.md)** - Complete API reference with detailed examples
- **[Quick Reference](./API_QUICK_REFERENCE.md)** - Quick lookup table for all endpoints
- **[Endpoints Summary](./API_ENDPOINTS_SUMMARY.md)** - Module overview with workflows

### Key Features

#### 🔐 Authentication Module (4 endpoints)
- User registration and login
- JWT-based authentication
- Profile management

#### 📝 Kanji Management (7 endpoints)
- Advanced search with filters (JLPT level, grade, strokes)
- CRUD operations (admin)
- Character lookup

#### 📋 Kanji Lists (13 endpoints)
- Create custom study lists
- JLPT level filtering
- Publishing workflow with admin approval

#### 🧠 Quiz System (15 endpoints)
- Multiple question types (Multiple Choice, True/False, Drawing, Matching)
- Quiz attempts tracking
- Result analytics
- Publishing workflow

#### 🃏 Flashcard Decks (11 endpoints)
- Create flashcard decks
- Manage cards
- Publishing workflow

#### 🤖 AI Recognition (4 endpoints)
- Image-based kanji prediction
- Canvas drawing recognition
- Health monitoring

#### 🏷️ Categories (5 endpoints)
- Content categorization
- CRUD operations

#### 👥 User Management (4 endpoints)
- Admin user management
- Role-based access control

## 🧪 Testing

```bash
# Unit tests
yarn test

# E2E tests
yarn test:e2e

# Test coverage
yarn test:cov

# Watch mode
yarn test:watch
```

## 🗃️ Database

### Technology Stack

- **ORM**: Prisma
- **Database**: PostgreSQL 14+
- **Migrations**: Prisma Migrate

### Common Commands

```bash
# Generate Prisma Client
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Open Prisma Studio (GUI)
npx prisma studio

# Reset database (development only)
npx prisma migrate reset
```

### Schema Overview

- **Users**: Authentication and profiles
- **Kanji**: Japanese characters with metadata
- **KanjiList**: User-created study lists
- **Quiz**: Quizzes with multiple question types
- **FlashcardDeck**: Flashcard decks and cards
- **Category**: Content categorization

## 🛠️ Tech Stack

- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL 14+
- **ORM**: Prisma 5.x
- **Authentication**: JWT + Passport
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest

## 📁 Project Structure

```
src/
├── modules/           # Feature modules
│   ├── auth/         # Authentication
│   ├── kanji_new/    # Kanji management
│   ├── kanji-list_new/  # Kanji lists
│   ├── quiz/         # Quiz system
│   ├── flashcard_new/   # Flashcard decks
│   ├── ai/           # AI recognition
│   ├── category/     # Categories
│   └── user_new/     # User management
├── shared/           # Shared utilities
├── filters/          # Exception filters
├── interceptors/     # Request/response interceptors
└── middlewares/      # Custom middlewares
```

## 🔒 Authentication

All authenticated endpoints require a JWT Bearer token:

```bash
Authorization: Bearer <your_jwt_token>
```

### Get a Token

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","fullName":"Test User"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

## 🌐 API Base URL

- **Development**: `http://localhost:3000`
- **Production**: Configure in `.env`

## 📖 Additional Documentation

- **[Password Management](./docs/PASSWORD_MANAGEMENT_IMPLEMENTATION.md)** - Password reset flow
- **[Flashcard Improvements](./docs/FLASHCARD_IMPROVEMENTS_NEEDED.md)** - Feature roadmap
- **[Prisma Seed Data](./prisma/SEED_DATA.md)** - Database seeding guide

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `yarn test`
4. Submit a pull request

## 📝 Description

This is the backend API for a comprehensive Japanese Kanji learning platform built with [NestJS](https://github.com/nestjs/nest) framework.


## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/kanji_db?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRATION="7d"

# AI Service
AI_SERVICE_URL="http://localhost:8000"

# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN="http://localhost:3000,http://localhost:5173"

# Upload
MAX_FILE_SIZE=5242880  # 5MB in bytes
UPLOAD_PATH="./uploads"
```

## 🐳 Docker Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild
docker-compose up -d --build
```

## 📊 API Testing

### Using curl

```bash
# Health check
curl http://localhost:3000

# Search kanji
curl http://localhost:3000/kanji/search?query=学

# Get kanji by character
curl http://localhost:3000/kanji/character/学
```

### Using PowerShell

```powershell
# Register user
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/auth/register" `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com","password":"Test123!","fullName":"Test User"}'

# Login
$response = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com","password":"Test123!"}'

$token = $response.access_token

# Get profile
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/auth/profile" `
  -Headers @{"Authorization"="Bearer $token"}
```

## 🔍 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
psql -h localhost -U your_user -d kanji_db

# Reset database (development)
npx prisma migrate reset --force
```

### Prisma Issues

```bash
# Clear Prisma cache
rm -rf node_modules/.prisma

# Regenerate client
npx prisma generate

# Check migration status
npx prisma migrate status
```

### Port Already in Use

```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (Windows)
taskkill /PID <PID> /F
```

## 📈 Performance

- Pagination: Default limit 50, max 100
- Rate limiting: Configured per endpoint
- Caching: Redis-ready (optional)
- Database indexing: Optimized queries

## 🔐 Security

- JWT token expiration: 7 days
- Password hashing: bcrypt (10 rounds)
- CORS: Configurable origins
- Input validation: class-validator
- SQL injection protection: Prisma parameterized queries

## 📞 Support & Contact

For issues, questions, or contributions, please check the documentation files or contact the development team.

---

## 📦 Project Setup

```bash
$ yarn install
```

## 🏃 Compile and Run the Project

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## 🧪 Run Tests

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## 🚀 Deployment

### Production Checklist

- [ ] Set strong `JWT_SECRET` in environment variables
- [ ] Configure production `DATABASE_URL`
- [ ] Update `CORS_ORIGIN` for your frontend domain
- [ ] Set `NODE_ENV=production`
- [ ] Run database migrations: `npx prisma migrate deploy`
- [ ] Configure AI service URL
- [ ] Set up file upload storage (local or cloud)
- [ ] Configure logging and monitoring
- [ ] Set up backup strategy for PostgreSQL

### Deployment Options

1. **Traditional VPS** (DigitalOcean, AWS EC2, etc.)
2. **Platform as a Service** (Heroku, Railway, Render)
3. **Container Platform** (AWS ECS, Google Cloud Run)
4. **NestJS Mau** - Official AWS deployment platform

For detailed deployment instructions, check out the [NestJS deployment documentation](https://docs.nestjs.com/deployment).

## 🔗 Related Projects

- **Mobile App**: Flutter application (kanji_mobile_v1)
- **AI Service**: CNN-based kanji recognition (cnn-kanji)
- **Frontend Web**: React/Vue application (if applicable)

## 📚 Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JWT Best Practices](https://jwt.io/introduction)

## 📄 License

This project is proprietary. All rights reserved.

---

**Built with ❤️ using NestJS**
