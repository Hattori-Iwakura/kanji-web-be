# Kanji Learning API Documentation

## Base URL
```
http://localhost:3000/api
```

All endpoints are prefixed with `/api` unless specified otherwise.

---

## 📋 Table of Contents
1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [Kanji](#kanji)
4. [Categories](#categories)
5. [Kanji Lists](#kanji-lists)
6. [Flashcard Decks](#flashcard-decks)
7. [Flashcard Sessions](#flashcard-sessions)
8. [Quizzes](#quizzes)
9. [Progress](#progress)
10. [Admin Dashboard](#admin-dashboard)
11. [AI & Recognition](#ai--recognition)

---

## 🔐 Authentication

### POST `/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "account": "user@example.com",
  "password": "password123",
  "code": "123456" // Optional: 2FA code
}
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "accessToken": "jwt_token_here",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "User Name",
      "role": "USER"
    }
  }
}
```

### POST `/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name"
}
```

**Response:**
```json
{
  "statusCode": 201,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "User Name"
    }
  }
}
```

### GET `/auth/profile`
Get current user profile. **Requires Authentication**

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "User Name",
    "role": "USER",
    "twoFactorEnabled": false
  }
}
```

### PATCH `/auth/profile`
Update current user profile. **Requires Authentication**

**Request Body:**
```json
{
  "name": "New Name",
  "email": "newemail@example.com"
}
```

### POST `/auth/forgot-password`
Request password reset link.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### POST `/auth/reset-password`
Reset password with token.

**Request Body:**
```json
{
  "token": "reset_token",
  "newPassword": "newpassword123"
}
```

### GET `/auth/validate-reset-token/:token`
Validate password reset token.

### 2FA Endpoints

#### POST `/auth/2fa/setup`
Setup 2FA - Generate secret and QR code. **Requires Authentication**

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "secret": "secret_key",
    "qrCode": "data:image/png;base64,...",
    "backupCodes": ["code1", "code2", "..."]
  }
}
```

#### POST `/auth/2fa/enable`
Enable 2FA after verifying code. **Requires Authentication**

**Request Body:**
```json
{
  "code": "123456"
}
```

#### POST `/auth/2fa/disable`
Disable 2FA. **Requires Authentication**

**Request Body:**
```json
{
  "password": "password123",
  "code": "123456"
}
```

#### POST `/auth/2fa/send-email-otp`
Send 2FA OTP via email. **Requires Authentication**

---

## 👥 User Management

**Base Path:** `/admin/users`  
**Requires:** Authentication + Admin Role

### GET `/admin/users`
Get all users.

### GET `/admin/users/:id`
Get user by ID.

### PATCH `/admin/users/:id`
Update user.

**Request Body:**
```json
{
  "name": "New Name",
  "email": "newemail@example.com",
  "role": "ADMIN"
}
```

### DELETE `/admin/users/:id`
Delete user.

---

## 📝 Kanji

### GET `/kanji`
Get all kanji with optional filters.

**Query Parameters:**
- `jlpt`: Filter by JLPT level (1-5)
- `grade`: Filter by grade (1-10)
- `search`: Search by character or meaning
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "statusCode": 200,
  "data": [
    {
      "id": 1,
      "character": "日",
      "meanings": "day, sun, Japan",
      "onyomi": "にち、じつ",
      "kunyomi": "ひ、か",
      "jlpt": 5,
      "grade": 1,
      "strokeCount": 4,
      "frequency": 1
    }
  ]
}
```

### GET `/kanji/search`
Search kanji with advanced filters.

**Query Parameters:**
- `query`: Search text
- `jlptLevels`: Array of JLPT levels
- `grades`: Array of grades
- `minStrokes`: Minimum stroke count
- `maxStrokes`: Maximum stroke count
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20)
- `sortBy`: Sort field

### POST `/kanji/search/canvas`
Search kanji by canvas drawing. **Requires Authentication**

**Request Body:**
```json
{
  "image": "base64_image_data"
}
```

### GET `/kanji/:id`
Get kanji by ID.

### GET `/kanji/character/:character`
Get kanji by character.

**Example:** `/kanji/character/日`

### POST `/kanji`
Create new kanji. **Requires Admin Role**

**Request Body:**
```json
{
  "character": "日",
  "meanings": "day, sun, Japan",
  "onyomi": "にち、じつ",
  "kunyomi": "ひ、か",
  "jlpt": 5,
  "grade": 1,
  "strokeCount": 4,
  "frequency": 1
}
```

### PUT `/kanji/:id`
Update kanji. **Requires Admin Role**

**Request Body:**
```json
{
  "meanings": "day, sun, Japan, calendar day",
  "frequency": 2
}
```

### DELETE `/kanji/:id`
Delete kanji. **Requires Admin Role**

---

## 🏷️ Categories

### GET `/categories`
Get all categories.

### GET `/categories/:id`
Get category by ID.

### POST `/categories`
Create category. **Requires Admin Role**

**Request Body:**
```json
{
  "name": "JLPT N5",
  "description": "Basic kanji for N5 level"
}
```

### PUT `/categories/:id`
Update category. **Requires Admin Role**

### DELETE `/categories/:id`
Delete category. **Requires Admin Role**

---

## 📚 Kanji Lists

### GET `/kanji-lists`
Get all kanji lists (public + user's own). **Requires Authentication**

**Query Parameters:**
- `search`: Search by name
- `type`: Filter by type
- `limit`: Number of results
- `offset`: Pagination offset

### GET `/kanji-lists/jlpt/:level`
Get JLPT level lists (N5, N4, N3, N2, N1). **Requires Authentication**

**Example:** `/kanji-lists/jlpt/N5`

### GET `/kanji-lists/:id`
Get kanji list by ID. **Requires Authentication**

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "id": 1,
    "name": "JLPT N5 Kanji",
    "description": "Essential kanji for N5",
    "isPublic": true,
    "userId": 1,
    "kanji": [
      {
        "id": 1,
        "character": "日",
        "meanings": "day, sun, Japan"
      }
    ]
  }
}
```

### POST `/kanji-lists`
Create new kanji list. **Requires Authentication**

**Request Body:**
```json
{
  "name": "My Custom List",
  "description": "Personal study list",
  "isPublic": false,
  "categoryId": 1,
  "kanjiIds": [1, 2, 3]
}
```

### PUT `/kanji-lists/:id`
Update kanji list. **Requires Authentication**

### PATCH `/kanji-lists/:id`
Update kanji list (alias for PUT). **Requires Authentication**

### DELETE `/kanji-lists/:id`
Delete kanji list. **Requires Authentication**

### POST `/kanji-lists/:id/kanji/:kanjiId`
Add kanji to list. **Requires Authentication**

### DELETE `/kanji-lists/:id/kanji/:kanjiId`
Remove kanji from list. **Requires Authentication**

### POST `/kanji-lists/:id/publish`
Request to publish list. **Requires Authentication**

### GET `/kanji-lists/admin/publish-requests`
Get publish requests. **Requires Admin Role**

**Query Parameters:**
- `status`: Filter by status (pending, approved, rejected)

### POST `/kanji-lists/admin/publish-requests/:id/approve`
Approve publish request. **Requires Admin Role**

### POST `/kanji-lists/admin/publish-requests/:id/reject`
Reject publish request. **Requires Admin Role**

**Request Body:**
```json
{
  "reason": "Incomplete or inaccurate content"
}
```

---

## 🃏 Flashcard Decks

### GET `/flashcard-decks`
Get all flashcard decks. **Requires Authentication**

**Query Parameters:**
- `search`: Search by name
- `limit`: Number of results
- `offset`: Pagination offset

### GET `/flashcard-decks/:id`
Get flashcard deck by ID. **Requires Authentication**

### POST `/flashcard-decks`
Create new flashcard deck. **Requires Authentication**

**Request Body:**
```json
{
  "name": "JLPT N5 Deck",
  "description": "Flashcards for N5 kanji",
  "kanjiIds": [1, 2, 3, 4, 5]
}
```

### PUT `/flashcard-decks/:id`
Update flashcard deck. **Requires Authentication**

### DELETE `/flashcard-decks/:id`
Delete flashcard deck. **Requires Authentication**

### POST `/flashcard-decks/:id/cards/:kanjiId`
Add card to deck. **Requires Authentication**

### DELETE `/flashcard-decks/:id/cards/:kanjiId`
Remove card from deck. **Requires Authentication**

### POST `/flashcard-decks/:id/publish`
Request to publish deck. **Requires Authentication**

### GET `/flashcard-decks/admin/publish-requests`
Get publish requests. **Requires Admin Role**

### POST `/flashcard-decks/admin/publish-requests/:id/approve`
Approve publish request. **Requires Admin Role**

### POST `/flashcard-decks/admin/publish-requests/:id/reject`
Reject publish request. **Requires Admin Role**

---

## 🎴 Flashcard Sessions

**All endpoints require authentication**

### POST `/flashcard-sessions/start`
Start a new flashcard study session.

**Request Body:**
```json
{
  "deckId": 1,
  "newCardsLimit": 20,
  "reviewCardsLimit": 50
}
```

**Response:**
```json
{
  "statusCode": 201,
  "data": {
    "sessionId": 1,
    "deckId": 1,
    "newCards": 20,
    "reviewCards": 15,
    "totalCards": 35,
    "firstCard": {
      "id": 1,
      "character": "日",
      "meanings": "day, sun, Japan"
    }
  }
}
```

### GET `/flashcard-sessions/:sessionId`
Get session progress.

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "sessionId": 1,
    "cardsStudied": 10,
    "cardsRemaining": 25,
    "correctAnswers": 8,
    "incorrectAnswers": 2,
    "averageEaseFactor": 2.5
  }
}
```

### GET `/flashcard-sessions/:sessionId/next-card`
Get the next card in the session.

### POST `/flashcard-sessions/:sessionId/review/:cardId`
Review a card with SM-2 spaced repetition.

**Request Body:**
```json
{
  "quality": 4,
  "timeSpent": 5.2
}
```

**Quality Scale:**
- 0: Complete blackout
- 1: Incorrect response, but correct answer felt familiar
- 2: Incorrect response, but correct answer seemed easy to recall
- 3: Correct response, but required significant effort
- 4: Correct response, with hesitation
- 5: Perfect response

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "cardId": 1,
    "newInterval": 4,
    "nextReviewDate": "2025-11-02T00:00:00Z",
    "easeFactor": 2.6,
    "repetitions": 2
  }
}
```

### POST `/flashcard-sessions/:sessionId/complete`
Complete the study session.

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "sessionId": 1,
    "totalCards": 35,
    "cardsStudied": 35,
    "correctAnswers": 28,
    "incorrectAnswers": 7,
    "accuracy": 80,
    "timeSpent": 1200,
    "completedAt": "2025-10-29T12:30:00Z"
  }
}
```

### GET `/flashcard-sessions/due-cards/:deckId`
Get due cards count for a deck.

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "deckId": 1,
    "newCards": 20,
    "dueCards": 15,
    "totalCards": 35
  }
}
```

### GET `/flashcard-sessions/statistics/study`
Get study statistics with daily breakdown.

**Query Parameters:**
- `startDate`: Start date (ISO format)
- `endDate`: End date (ISO format)

### GET `/flashcard-sessions/statistics/deck/:deckId`
Get detailed deck statistics.

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "deckId": 1,
    "totalCards": 100,
    "newCards": 20,
    "learningCards": 30,
    "reviewCards": 40,
    "matureCards": 10,
    "averageEaseFactor": 2.5,
    "retentionRate": 85.5
  }
}
```

---

## 📝 Quizzes

**All endpoints require authentication unless specified**

### GET `/quizzes`
Get all quizzes (public + user's own).

**Query Parameters:**
- `search`: Search by title
- `limit`: Number of results
- `offset`: Pagination offset

### GET `/quizzes/:id`
Get quiz by ID with questions.

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "id": 1,
    "title": "JLPT N5 Quiz",
    "description": "Test your N5 knowledge",
    "isPublic": true,
    "questions": [
      {
        "id": 1,
        "text": "What does 日 mean?",
        "type": "multiple_choice",
        "options": ["day", "month", "year", "week"],
        "correctAnswer": "day",
        "order": 1
      }
    ]
  }
}
```

### POST `/quizzes`
Create new quiz.

**Request Body:**
```json
{
  "title": "My Quiz",
  "description": "Custom quiz for practice"
}
```

### PUT `/quizzes/:id`
Update quiz.

### DELETE `/quizzes/:id`
Delete quiz.

### POST `/quizzes/:id/questions`
Add question to quiz.

**Request Body:**
```json
{
  "text": "What does 月 mean?",
  "type": "multiple_choice",
  "options": ["day", "month", "year", "week"],
  "correctAnswer": "month",
  "explanation": "月 (tsuki) means moon or month"
}
```

### PUT `/quizzes/:id/questions/reorder`
Reorder questions in quiz.

**Request Body:**
```json
{
  "questionOrders": [
    { "questionId": 1, "order": 2 },
    { "questionId": 2, "order": 1 }
  ]
}
```

### PUT `/quizzes/:id/questions/:questionId`
Update question.

### DELETE `/quizzes/:id/questions/:questionId`
Delete question.

### POST `/quizzes/:id/start`
Start a quiz attempt.

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "attemptId": 1,
    "quizId": 1,
    "startedAt": "2025-10-29T12:00:00Z",
    "questions": [...]
  }
}
```

### POST `/quizzes/attempts/:attemptId/submit`
Submit quiz attempt.

**Request Body:**
```json
{
  "answers": [
    { "questionId": 1, "answer": "day" },
    { "questionId": 2, "answer": "month" }
  ],
  "timeSpent": 300
}
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "attemptId": 1,
    "score": 85,
    "totalQuestions": 20,
    "correctAnswers": 17,
    "incorrectAnswers": 3,
    "timeSpent": 300,
    "completedAt": "2025-10-29T12:05:00Z",
    "results": [
      {
        "questionId": 1,
        "userAnswer": "day",
        "correctAnswer": "day",
        "isCorrect": true
      }
    ]
  }
}
```

### GET `/quizzes/:id/attempts`
Get user's quiz attempts.

### GET `/quizzes/attempts/:attemptId`
Get quiz attempt details.

### POST `/quizzes/:id/publish-request`
Request to publish quiz.

### GET `/quizzes/admin/publish-requests`
Get pending publish requests. **Requires Admin Role**

### PUT `/quizzes/admin/publish-requests/:requestId`
Review publish request. **Requires Admin Role**

**Request Body:**
```json
{
  "action": "approve"
}
```
or
```json
{
  "action": "reject"
}
```

---

## 📊 Progress

**All endpoints require authentication**

### GET `/progress/overview`
Get comprehensive progress overview.

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "totalKanjiStudied": 150,
    "flashcardsCompleted": 500,
    "quizzesCompleted": 25,
    "currentStreak": 7,
    "longestStreak": 14,
    "totalStudyTime": 12000,
    "level": "Intermediate",
    "xp": 1500
  }
}
```

### GET `/progress/flashcard`
Get detailed flashcard progress.

**Query Parameters:**
- `deckId`: Filter by deck ID
- `startDate`: Start date
- `endDate`: End date

### GET `/progress/quiz`
Get detailed quiz progress.

**Query Parameters:**
- `quizId`: Filter by quiz ID
- `startDate`: Start date
- `endDate`: End date

### GET `/progress/streak`
Get streak information.

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "currentStreak": 7,
    "longestStreak": 14,
    "lastStudyDate": "2025-10-29",
    "streakStartDate": "2025-10-23"
  }
}
```

### GET `/progress/leaderboard`
Get leaderboard rankings.

**Query Parameters:**
- `period`: Time period (week, month, all)
- `limit`: Number of results

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "rankings": [
      {
        "rank": 1,
        "userId": 5,
        "name": "User Name",
        "xp": 2500,
        "kanjiStudied": 200
      }
    ],
    "userRank": {
      "rank": 15,
      "xp": 1500
    }
  }
}
```

### GET `/progress/achievements`
Get achievements.

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "achievements": [
      {
        "id": 1,
        "name": "First Step",
        "description": "Study your first kanji",
        "icon": "🎯",
        "unlockedAt": "2025-10-15T10:00:00Z"
      }
    ],
    "totalAchievements": 50,
    "unlockedAchievements": 12
  }
}
```

### GET `/progress/chart-data`
Get chart data for progress visualization.

**Query Parameters:**
- `period`: Time period (week, month, year)
- `type`: Chart type (daily, weekly, monthly)

### GET `/progress/study-time`
Get study time tracking.

**Query Parameters:**
- `startDate`: Start date
- `endDate`: End date

---

## 🛠️ Admin Dashboard

**All endpoints require Admin Role**

### GET `/admin/dashboard/overview`
Get dashboard overview with aggregated statistics.

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "totalUsers": 1000,
    "activeUsers": 500,
    "totalKanji": 2136,
    "totalQuizzes": 150,
    "totalFlashcardDecks": 200,
    "totalSessions": 5000,
    "pendingPublishRequests": 10
  }
}
```

### GET `/admin/dashboard/stats/users`
Get user statistics.

**Query Parameters:**
- `period`: Time period (day, week, month, year)

### GET `/admin/dashboard/stats/content`
Get content statistics.

### GET `/admin/dashboard/stats/activity`
Get activity statistics.

**Query Parameters:**
- `period`: Time period
- `limit`: Number of results

### GET `/admin/dashboard/charts/users`
Get user growth chart data.

### GET `/admin/dashboard/charts/activity`
Get activity trends chart data.

### GET `/admin/publish/requests`
Get all publish requests with filters.

**Query Parameters:**
- `status`: Filter by status (pending, approved, rejected)
- `type`: Filter by type (quiz, list, deck)
- `limit`: Number of results
- `offset`: Pagination offset

### GET `/admin/publish/requests/:id`
Get detailed publish request.

**Query Parameters:**
- `type`: Request type (quiz, list, deck) - **Required**

### PATCH `/admin/publish/requests/:id/review`
Review publish request (approve/reject).

**Query Parameters:**
- `type`: Request type (quiz, list, deck) - **Required**

**Request Body:**
```json
{
  "status": "approved",
  "reviewMessage": "Looks good!"
}
```
or
```json
{
  "status": "rejected",
  "reviewMessage": "Needs improvement"
}
```

### GET `/admin/publish/statistics`
Get publish request statistics.

### GET `/admin/system/health`
Get system health check.

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "status": "healthy",
    "database": "connected",
    "uptime": 86400,
    "memory": {
      "used": 512,
      "total": 2048
    }
  }
}
```

### GET `/admin/system/metrics`
Get system performance metrics.

**Query Parameters:**
- `period`: Time period

---

## 🤖 AI & Recognition

### POST `/ai/predict`
Predict kanji from image.

**Request Body:**
```json
{
  "image": "base64_image_data"
}
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "predictions": [
      {
        "character": "日",
        "confidence": 0.95
      },
      {
        "character": "目",
        "confidence": 0.78
      }
    ]
  }
}
```

### GET `/ai/health`
Check AI server health.

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "status": "healthy",
    "modelLoaded": true,
    "version": "1.0.0"
  }
}
```

### POST `/kanji-recognition/recognize`
Recognize kanji from canvas drawing.

**Request Body:**
```json
{
  "image": "base64_image_data"
}
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "predictions": [
      {
        "character": "日",
        "confidence": 0.95,
        "kanji": {
          "id": 1,
          "meanings": "day, sun, Japan",
          "onyomi": "にち、じつ",
          "kunyomi": "ひ、か"
        }
      }
    ]
  }
}
```

### GET `/kanji-recognition/health`
Check AI server health.

---

## 📌 Common Response Format

All successful responses follow this format:

```json
{
  "statusCode": 200,
  "data": { ... },
  "timestamp": "2025-10-29T12:00:00.000Z"
}
```

## ❌ Error Response Format

All error responses follow this format:

```json
{
  "statusCode": 400,
  "message": "Error message here",
  "error": "Bad Request",
  "timestamp": "2025-10-29T12:00:00.000Z"
}
```

## 🔑 Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer {your_jwt_token}
```

## 🛡️ Authorization

Some endpoints require specific roles:
- **USER**: Default role for authenticated users
- **ADMIN**: Administrator role with full access

---

## 📝 Notes

1. All dates are in ISO 8601 format
2. Pagination uses `limit` and `offset` parameters
3. All timestamps are in UTC
4. Base64 images should be in format: `data:image/png;base64,{base64_data}`
5. JLPT levels: 1 (N1) to 5 (N5), where 5 is easiest
6. Grades: 1-10, where 1 is elementary school grade 1

---

**Last Updated:** October 29, 2025  
**API Version:** 1.0.0
