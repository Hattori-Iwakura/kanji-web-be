# API Quick Reference

**Kanji Learning Platform - Backend API**

---

## 🔗 Endpoints Overview

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | - | Register new user |
| POST | `/auth/login` | - | Login user |
| GET | `/auth/profile` | 🔒 | Get user profile |
| PATCH | `/auth/profile` | 🔒 | Update profile |

### Kanji
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/kanji/search` | - | Search kanji with filters |
| GET | `/kanji` | - | Get all kanji |
| GET | `/kanji/:id` | - | Get kanji by ID |
| GET | `/kanji/character/:character` | - | Get kanji by character |
| POST | `/kanji` | 🔒 Admin | Create kanji |
| PUT | `/kanji/:id` | 🔒 Admin | Update kanji |
| DELETE | `/kanji/:id` | 🔒 Admin | Delete kanji |

### Kanji Lists
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/kanji-lists` | 🔒 | Get all lists |
| GET | `/kanji-lists/jlpt/:level` | 🔒 | Get JLPT level lists |
| GET | `/kanji-lists/:id` | 🔒 | Get list by ID |
| POST | `/kanji-lists` | 🔒 | Create list |
| PUT | `/kanji-lists/:id` | 🔒 | Update list |
| PATCH | `/kanji-lists/:id` | 🔒 | Update list (alias) |
| DELETE | `/kanji-lists/:id` | 🔒 | Delete list |
| POST | `/kanji-lists/:id/kanji/:kanjiId` | 🔒 | Add kanji to list |
| DELETE | `/kanji-lists/:id/kanji/:kanjiId` | 🔒 | Remove kanji from list |
| POST | `/kanji-lists/:id/publish` | 🔒 | Request publish |
| GET | `/kanji-lists/admin/publish-requests` | 🔒 Admin | Get publish requests |
| POST | `/kanji-lists/admin/publish-requests/:id/approve` | 🔒 Admin | Approve request |
| POST | `/kanji-lists/admin/publish-requests/:id/reject` | 🔒 Admin | Reject request |

### Quizzes
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/quizzes` | 🔒 | Get all quizzes |
| GET | `/quizzes/:id` | 🔒 | Get quiz by ID |
| POST | `/quizzes` | 🔒 | Create quiz |
| PUT | `/quizzes/:id` | 🔒 | Update quiz |
| DELETE | `/quizzes/:id` | 🔒 | Delete quiz |
| POST | `/quizzes/:id/questions` | 🔒 | Add question |
| PUT | `/quizzes/:id/questions/:questionId` | 🔒 | Update question |
| DELETE | `/quizzes/:id/questions/:questionId` | 🔒 | Delete question |
| PUT | `/quizzes/:id/questions/reorder` | 🔒 | Reorder questions |
| POST | `/quizzes/:id/start` | 🔒 | Start quiz attempt |
| POST | `/quizzes/attempts/:attemptId/submit` | 🔒 | Submit answers |
| GET | `/quizzes/:id/attempts` | 🔒 | Get quiz attempts |
| GET | `/quizzes/attempts/:attemptId` | 🔒 | Get attempt details |
| POST | `/quizzes/:id/publish-request` | 🔒 | Request publish |
| GET | `/quizzes/admin/publish-requests` | 🔒 Admin | Get publish requests |
| PUT | `/quizzes/admin/publish-requests/:requestId` | 🔒 Admin | Review request |

### Flashcard Decks
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/flashcard-decks` | - | Get all decks |
| GET | `/flashcard-decks/:id` | 🔒 | Get deck by ID |
| POST | `/flashcard-decks` | 🔒 | Create deck |
| PUT | `/flashcard-decks/:id` | 🔒 | Update deck |
| DELETE | `/flashcard-decks/:id` | 🔒 | Delete deck |
| POST | `/flashcard-decks/:id/cards/:kanjiId` | 🔒 | Add card |
| DELETE | `/flashcard-decks/:id/cards/:kanjiId` | 🔒 | Remove card |
| POST | `/flashcard-decks/:id/publish` | 🔒 | Request publish |
| GET | `/flashcard-decks/admin/publish-requests` | 🔒 Admin | Get requests |
| POST | `/flashcard-decks/admin/publish-requests/:id/approve` | 🔒 Admin | Approve |
| POST | `/flashcard-decks/admin/publish-requests/:id/reject` | 🔒 Admin | Reject |

### AI & Recognition
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/ai/predict` | - | Predict kanji from image |
| GET | `/ai/health` | - | Check AI health |
| POST | `/kanji-recognition/recognize` | - | Recognize canvas drawing |
| GET | `/kanji-recognition/health` | - | Check recognition health |

### Categories
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/categories` | - | Get all categories |
| GET | `/categories/:id` | - | Get category by ID |
| POST | `/categories` | 🔒 Admin | Create category |
| PUT | `/categories/:id` | 🔒 Admin | Update category |
| DELETE | `/categories/:id` | 🔒 Admin | Delete category |

### User Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/users` | 🔒 Admin | Get all users |
| GET | `/admin/users/:id` | 🔒 Admin | Get user by ID |
| PATCH | `/admin/users/:id` | 🔒 Admin | Update user |
| DELETE | `/admin/users/:id` | 🔒 Admin | Delete user |

---

## 🎯 Common Query Parameters

### Pagination
```
?limit=20&offset=0
?page=1&limit=50
```

### Search & Filter
```
?search=日本
?jlpt=5
?grade=1
?type=public
```

### Kanji Search (Advanced)
```
?query=日
&jlptLevels=5,4
&grades=1,2
&minStrokes=4
&maxStrokes=10
&page=1
&limit=20
&sortBy=frequency
```

---

## 🔑 Authentication Header

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📝 Request Examples

### Register User
```bash
POST /auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

### Login
```bash
POST /auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Search Kanji
```bash
GET /kanji/search?query=日&jlptLevels=5&limit=10
```

### Create Kanji List
```bash
POST /kanji-lists
Authorization: Bearer <token>
{
  "name": "My Study List",
  "description": "Personal collection",
  "kanjiIds": [1, 2, 3]
}
```

### Create Quiz
```bash
POST /quizzes
Authorization: Bearer <token>
{
  "title": "JLPT N5 Practice",
  "description": "Practice quiz for N5"
}
```

### Add Multiple Choice Question
```bash
POST /quizzes/1/questions
Authorization: Bearer <token>
{
  "questionType": "MULTIPLE_CHOICE",
  "questionText": "What does 日 mean?",
  "points": 10,
  "options": [
    { "text": "sun, day", "isCorrect": true },
    { "text": "moon", "isCorrect": false },
    { "text": "star", "isCorrect": false }
  ]
}
```

### Start Quiz
```bash
POST /quizzes/1/start
Authorization: Bearer <token>
```

### Submit Quiz
```bash
POST /quizzes/attempts/100/submit
Authorization: Bearer <token>
{
  "answers": [
    { "questionId": 1, "selectedOptionId": 1 },
    { "questionId": 2, "booleanAnswer": true }
  ]
}
```

### Create Flashcard Deck
```bash
POST /flashcard-decks
Authorization: Bearer <token>
{
  "name": "N5 Flashcards",
  "description": "Basic kanji",
  "kanjiIds": [1, 2, 3, 4, 5]
}
```

### Predict Kanji
```bash
POST /ai/predict
{
  "image": "data:image/png;base64,iVBORw0KGg..."
}
```

---

## ⚡ Response Codes

| Code | Status | Meaning |
|------|--------|---------|
| 200 | OK | Success |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Auth required |
| 403 | Forbidden | No permission |
| 404 | Not Found | Resource missing |
| 409 | Conflict | Already exists |
| 500 | Server Error | Internal error |

---

## 📊 Response Formats

### Standard Response
```json
{
  "statusCode": 200,
  "data": { ... }
}
```

### Paginated Response
```json
{
  "statusCode": 200,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

### Error Response
```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request"
}
```

---

## 🚀 Quick Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd kanji-web-be

# 2. Install dependencies
npm install

# 3. Setup database
npx prisma migrate dev

# 4. Seed data
npx prisma db seed

# 5. Start server
npm run start:dev

# Server running at http://localhost:3000
```

---

## 🧪 Test Endpoints

```bash
# Test authentication
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","name":"Test"}'

# Test kanji search
curl http://localhost:3000/kanji/search?query=日

# Test with auth
curl http://localhost:3000/kanji-lists \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📚 Additional Resources

- **Full Documentation**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- **Prisma Schema**: [prisma/schema.prisma](prisma/schema.prisma)
- **Environment Config**: [.env.example](.env.example)

---

**Base URL**: `http://localhost:3000`  
**Last Updated**: October 24, 2025
