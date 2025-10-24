# API Endpoint Summary by Module

**Kanji Learning Platform Backend API**

---

## 📊 Statistics

| Module | Endpoints | Auth Required | Admin Only |
|--------|-----------|---------------|------------|
| Authentication | 4 | 2 | 0 |
| Kanji | 7 | 3 | 3 |
| Kanji Lists | 13 | 13 | 3 |
| Quizzes | 15 | 15 | 2 |
| Flashcard Decks | 11 | 10 | 3 |
| AI & Recognition | 4 | 0 | 0 |
| Categories | 5 | 3 | 3 |
| User Management | 4 | 4 | 4 |
| **Total** | **63** | **50** | **18** |

---

## 🔐 1. Authentication Module

**Base Path**: `/auth`

### Endpoints

```
POST   /auth/register                    Register new user
POST   /auth/login                       Login user
GET    /auth/profile          🔒         Get user profile
PATCH  /auth/profile          🔒         Update user profile
```

### Key Features
- JWT token-based authentication
- Password hashing with bcrypt
- Profile management
- 24-hour token expiration

---

## 📚 2. Kanji Module

**Base Path**: `/kanji`

### Endpoints

```
GET    /kanji/search                     Advanced search with filters
GET    /kanji                            Get all kanji
GET    /kanji/:id                        Get kanji by ID
GET    /kanji/character/:character       Get kanji by character
POST   /kanji                 🔒 👑      Create kanji (Admin)
PUT    /kanji/:id             🔒 👑      Update kanji (Admin)
DELETE /kanji/:id             🔒 👑      Delete kanji (Admin)
```

### Search Filters
- Query (character, meaning, reading)
- JLPT levels (1-5)
- School grades (1-6)
- Stroke count (min/max)
- Frequency
- Pagination

### Data Fields
- Character, meanings, onyomi, kunyomi
- JLPT level, grade, stroke count
- Frequency ranking
- Examples and compounds

---

## 📝 3. Kanji Lists Module

**Base Path**: `/kanji-lists`

### Endpoints

```
GET    /kanji-lists                      🔒  Get all lists
GET    /kanji-lists/jlpt/:level          🔒  Get JLPT level lists
GET    /kanji-lists/:id                  🔒  Get list details
POST   /kanji-lists                      🔒  Create new list
PUT    /kanji-lists/:id                  🔒  Update list
PATCH  /kanji-lists/:id                  🔒  Update list (alias)
DELETE /kanji-lists/:id                  🔒  Delete list
POST   /kanji-lists/:id/kanji/:kanjiId   🔒  Add kanji to list
DELETE /kanji-lists/:id/kanji/:kanjiId   🔒  Remove kanji
POST   /kanji-lists/:id/publish          🔒  Request publish
GET    /kanji-lists/admin/publish-requests   🔒 👑  Get requests
POST   /kanji-lists/admin/publish-requests/:id/approve  🔒 👑  Approve
POST   /kanji-lists/admin/publish-requests/:id/reject   🔒 👑  Reject
```

### Features
- Public and private lists
- JLPT level filtering (N5-N1)
- Kanji management (add/remove)
- Publish request workflow
- User ownership validation
- Search and pagination

---

## 🎯 4. Quiz Module

**Base Path**: `/quizzes`

### Quiz Management

```
GET    /quizzes                          🔒  Get all quizzes
GET    /quizzes/:id                      🔒  Get quiz details
POST   /quizzes                          🔒  Create quiz
PUT    /quizzes/:id                      🔒  Update quiz
DELETE /quizzes/:id                      🔒  Delete quiz
```

### Question Management

```
POST   /quizzes/:id/questions            🔒  Add question
PUT    /quizzes/:id/questions/:questionId   🔒  Update question
DELETE /quizzes/:id/questions/:questionId   🔒  Delete question
PUT    /quizzes/:id/questions/reorder    🔒  Reorder questions
```

### Quiz Taking

```
POST   /quizzes/:id/start                🔒  Start quiz attempt
POST   /quizzes/attempts/:attemptId/submit  🔒  Submit answers
GET    /quizzes/:id/attempts             🔒  Get user attempts
GET    /quizzes/attempts/:attemptId      🔒  Get attempt details
```

### Publishing

```
POST   /quizzes/:id/publish-request      🔒  Request publish
GET    /quizzes/admin/publish-requests   🔒 👑  Get requests
PUT    /quizzes/admin/publish-requests/:requestId  🔒 👑  Review
```

### Question Types
1. **Multiple Choice**: 4 options, 1 correct
2. **True/False**: Boolean answer
3. **Drawing**: Canvas-based kanji drawing
4. **Matching**: Match kanji to meanings

### Scoring System
- Points per question (configurable)
- Automatic grading
- Pass/fail threshold
- Time tracking
- Detailed results

---

## 🎴 5. Flashcard Decks Module

**Base Path**: `/flashcard-decks`

### Endpoints

```
GET    /flashcard-decks                  Get all decks (public + own)
GET    /flashcard-decks/:id              🔒  Get deck details
POST   /flashcard-decks                  🔒  Create deck
PUT    /flashcard-decks/:id              🔒  Update deck
DELETE /flashcard-decks/:id              🔒  Delete deck
POST   /flashcard-decks/:id/cards/:kanjiId     🔒  Add card
DELETE /flashcard-decks/:id/cards/:kanjiId     🔒  Remove card
POST   /flashcard-decks/:id/publish      🔒  Request publish
GET    /flashcard-decks/admin/publish-requests  🔒 👑  Get requests
POST   /flashcard-decks/admin/publish-requests/:id/approve  🔒 👑  Approve
POST   /flashcard-decks/admin/publish-requests/:id/reject   🔒 👑  Reject
```

### Features
- Public and private decks
- Kanji card management
- Card ordering
- Study session tracking
- Spaced repetition support
- Publish workflow

---

## 🤖 6. AI & Recognition Module

### AI Prediction (`/ai`)

```
POST   /ai/predict                       Predict kanji from image
GET    /ai/health                        Check AI server status
```

### Kanji Recognition (`/kanji-recognition`)

```
POST   /kanji-recognition/recognize      Recognize canvas drawing
GET    /kanji-recognition/health         Check service health
```

### Features
- Base64 image input
- CNN model prediction
- Top-N predictions with confidence
- Integration with Python AI service
- Health monitoring

---

## 📂 7. Categories Module

**Base Path**: `/categories`

### Endpoints

```
GET    /categories                       Get all categories
GET    /categories/:id                   Get category details
POST   /categories                 🔒 👑  Create category
PUT    /categories/:id             🔒 👑  Update category
DELETE /categories/:id             🔒 👑  Delete category
```

### Use Cases
- JLPT level categorization
- Grade level grouping
- Custom study categories
- List organization

---

## 👤 8. User Management Module (Admin)

**Base Path**: `/admin/users`

### Endpoints

```
GET    /admin/users                🔒 👑  Get all users
GET    /admin/users/:id            🔒 👑  Get user details
PATCH  /admin/users/:id            🔒 👑  Update user
DELETE /admin/users/:id            🔒 👑  Delete user
```

### Admin Capabilities
- View all users
- Update user details
- Change user roles
- Delete user accounts
- Monitor user activity

---

## 🔑 Authentication & Authorization

### Authentication Levels

| Symbol | Level | Description |
|--------|-------|-------------|
| - | Public | No authentication required |
| 🔒 | User | JWT token required |
| 🔒 👑 | Admin | JWT token + admin role required |

### JWT Token Structure

```json
{
  "id": 1,
  "email": "user@example.com",
  "role": "USER",
  "iat": 1698192000,
  "exp": 1698278400
}
```

### Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## 📊 Data Models Overview

### User
```typescript
{
  id: number
  email: string
  name: string
  role: "USER" | "ADMIN"
  profileImage?: string
}
```

### Kanji
```typescript
{
  id: number
  character: string
  meanings: string
  onyomi?: string
  kunyomi?: string
  jlpt?: number (1-5)
  grade?: number (1-6)
  strokeCount?: number
  frequency?: number
}
```

### Kanji List
```typescript
{
  id: number
  name: string
  description?: string
  isPublic: boolean
  userId: number
  kanji: Kanji[]
  totalKanji: number
}
```

### Quiz
```typescript
{
  id: number
  title: string
  description?: string
  isPublic: boolean
  userId: number
  questions: Question[]
  totalQuestions: number
}
```

### Question (Base)
```typescript
{
  id: number
  questionType: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "DRAWING" | "MATCHING"
  questionText: string
  points: number
  order: number
}
```

### Flashcard Deck
```typescript
{
  id: number
  name: string
  description?: string
  isPublic: boolean
  userId: number
  cards: FlashcardCard[]
  totalCards: number
}
```

---

## 🔄 Common Workflows

### 1. User Registration & Login
```
1. POST /auth/register
2. POST /auth/login → Get token
3. Use token for authenticated requests
```

### 2. Browse & Study Kanji
```
1. GET /kanji/search?jlptLevels=5
2. GET /kanji/:id → Get details
3. POST /kanji-lists → Create study list
4. POST /kanji-lists/:id/kanji/:kanjiId → Add to list
```

### 3. Create & Take Quiz
```
1. POST /quizzes → Create quiz
2. POST /quizzes/:id/questions → Add questions
3. POST /quizzes/:id/start → Start attempt
4. POST /quizzes/attempts/:attemptId/submit → Submit
5. GET /quizzes/attempts/:attemptId → View results
```

### 4. Flashcard Study
```
1. GET /flashcard-decks → Browse decks
2. POST /flashcard-decks → Create deck
3. POST /flashcard-decks/:id/cards/:kanjiId → Add cards
4. GET /flashcard-decks/:id → Start studying
```

### 5. Publish Content
```
1. POST /kanji-lists/:id/publish → Request
2. Admin: GET /kanji-lists/admin/publish-requests
3. Admin: POST /kanji-lists/admin/publish-requests/:id/approve
4. List becomes public
```

---

## 🚨 Error Codes Reference

| Code | Scenario | Example |
|------|----------|---------|
| 400 | Validation error | Invalid email format |
| 401 | Not authenticated | Missing/invalid token |
| 403 | Not authorized | User trying admin action |
| 404 | Resource not found | Kanji ID doesn't exist |
| 409 | Conflict | Email already registered |
| 500 | Server error | Database connection failed |

---

## 📈 Performance Considerations

### Pagination
- Default: 20 items per page
- Max: 100 items per page
- Use `offset` or `page` parameter

### Caching
- Public data cached for 5 minutes
- User-specific data not cached
- AI predictions cached by image hash

### Rate Limiting
- 100 requests per minute per IP
- 1000 requests per hour per user
- Admin endpoints: 500 requests per hour

---

## 🧪 Testing Endpoints

### Health Checks
```bash
GET /ai/health
GET /kanji-recognition/health
```

### Sample Data
```bash
# Get sample kanji
GET /kanji?limit=5

# Get JLPT N5 list
GET /kanji-lists/jlpt/N5
```

---

## 📚 Related Documentation

- **Full API Docs**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- **Quick Reference**: [API_QUICK_REFERENCE.md](API_QUICK_REFERENCE.md)
- **Database Schema**: [prisma/schema.prisma](prisma/schema.prisma)
- **Mobile App**: [../kanji_mobile_v1/README.md](../kanji_mobile_v1/README.md)

---

**Total Endpoints**: 63  
**Authentication Required**: 50 (79%)  
**Admin Only**: 18 (29%)  
**Last Updated**: October 24, 2025
