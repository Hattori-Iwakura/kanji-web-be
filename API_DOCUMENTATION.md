# Kanji Learning API Documentation

**Base URL**: `http://localhost:3000` (Development)  
**Version**: 1.0.0  
**Last Updated**: October 24, 2025

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Kanji Management](#kanji-management)
3. [Kanji Lists](#kanji-lists)
4. [Quiz System](#quiz-system)
5. [Flashcard Decks](#flashcard-decks)
6. [AI Recognition](#ai-recognition)
7. [Categories](#categories)
8. [User Management (Admin)](#user-management-admin)
9. [Common Response Formats](#common-response-formats)
10. [Error Handling](#error-handling)

---

## 🔐 Authentication

All endpoints marked with 🔒 require JWT authentication via Bearer token.

### Register User

**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "statusCode": 201,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Login

**POST** `/auth/login`

Authenticate user and receive access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "role": "USER"
  }
}
```

---

### Get Profile 🔒

**GET** `/auth/profile`

Get current user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "profileImage": null,
    "createdAt": "2025-10-24T00:00:00.000Z"
  }
}
```

---

### Update Profile 🔒

**PATCH** `/auth/profile`

Update user profile information.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "profileImage": "https://example.com/avatar.jpg"
}
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "id": 1,
    "name": "Jane Doe",
    "profileImage": "https://example.com/avatar.jpg"
  }
}
```

---

## 📚 Kanji Management

### Search Kanji

**GET** `/kanji/search`

Advanced kanji search with multiple filters.

**Query Parameters:**
- `query` (string, optional): Search by character, meaning, or reading
- `jlptLevels` (string, optional): Comma-separated JLPT levels (e.g., "5,4,3")
- `grades` (string, optional): Comma-separated grade levels (e.g., "1,2,3")
- `minStrokes` (number, optional): Minimum stroke count
- `maxStrokes` (number, optional): Maximum stroke count
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `sortBy` (string, optional): Sort field

**Example:**
```
GET /kanji/search?query=日&jlptLevels=5,4&page=1&limit=20
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "items": [
      {
        "id": 1,
        "character": "日",
        "meanings": "sun, day",
        "onyomi": "ニチ、ジツ",
        "kunyomi": "ひ、び、か",
        "jlpt": 5,
        "grade": 1,
        "strokeCount": 4,
        "frequency": 1
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### Get All Kanji

**GET** `/kanji`

Get kanji list with optional filters.

**Query Parameters:**
- `jlpt` (number, optional): Filter by JLPT level (1-5)
- `grade` (number, optional): Filter by grade (1-6)
- `search` (string, optional): Search term
- `limit` (number, optional): Number of items
- `offset` (number, optional): Offset for pagination

**Example:**
```
GET /kanji?jlpt=5&limit=50&offset=0
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": [
    {
      "id": 1,
      "character": "日",
      "meanings": "sun, day",
      "onyomi": "ニチ、ジツ",
      "kunyomi": "ひ、び、か",
      "jlpt": 5,
      "grade": 1,
      "strokeCount": 4
    }
  ],
  "total": 80
}
```

---

### Get Kanji by ID

**GET** `/kanji/:id`

Get detailed information about a specific kanji.

**Parameters:**
- `id` (number): Kanji ID

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "id": 1,
    "character": "日",
    "meanings": "sun, day",
    "onyomi": "ニチ、ジツ",
    "kunyomi": "ひ、び、か",
    "jlpt": 5,
    "grade": 1,
    "strokeCount": 4,
    "frequency": 1,
    "examples": [
      {
        "id": 1,
        "word": "日本",
        "reading": "にほん",
        "meaning": "Japan"
      }
    ]
  }
}
```

---

### Get Kanji by Character

**GET** `/kanji/character/:character`

Get kanji by its character.

**Parameters:**
- `character` (string): Kanji character (e.g., "日")

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "id": 1,
    "character": "日",
    "meanings": "sun, day",
    "onyomi": "ニチ、ジツ",
    "kunyomi": "ひ、び、か"
  }
}
```

---

### Create Kanji 🔒 (Admin Only)

**POST** `/kanji`

Create a new kanji entry.

**Request Body:**
```json
{
  "character": "新",
  "meanings": "new",
  "onyomi": "シン",
  "kunyomi": "あたら.しい、あら.た、にい",
  "jlpt": 4,
  "grade": 2,
  "strokeCount": 13,
  "frequency": 127
}
```

**Response (201):**
```json
{
  "statusCode": 201,
  "data": {
    "id": 3037,
    "character": "新",
    "meanings": "new"
  }
}
```

---

### Update Kanji 🔒 (Admin Only)

**PUT** `/kanji/:id`

Update kanji information.

**Request Body:**
```json
{
  "meanings": "new, fresh",
  "onyomi": "シン",
  "kunyomi": "あたら.しい、あら.た、にい"
}
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "id": 3037,
    "character": "新",
    "meanings": "new, fresh"
  }
}
```

---

### Delete Kanji 🔒 (Admin Only)

**DELETE** `/kanji/:id`

Delete a kanji entry.

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "Kanji deleted successfully"
}
```

---

## 📝 Kanji Lists

### Get All Kanji Lists 🔒

**GET** `/kanji-lists`

Get all kanji lists (public + user's own).

**Query Parameters:**
- `search` (string, optional): Search by name
- `type` (string, optional): Filter by type
- `limit` (number, optional): Items per page
- `offset` (number, optional): Offset for pagination

**Response (200):**
```json
{
  "statusCode": 200,
  "data": [
    {
      "id": 1,
      "name": "JLPT N5 Kanji",
      "description": "Basic kanji for JLPT N5",
      "isPublic": true,
      "userId": 1,
      "userName": "Admin",
      "userEmail": "admin@example.com",
      "totalKanji": 80,
      "createdAt": "2025-10-24T00:00:00.000Z",
      "updatedAt": "2025-10-24T00:00:00.000Z"
    }
  ],
  "total": 5
}
```

---

### Get Kanji Lists by JLPT Level 🔒

**GET** `/kanji-lists/jlpt/:level`

Get kanji lists for specific JLPT level.

**Parameters:**
- `level` (string): JLPT level (N5, N4, N3, N2, N1)

**Response (200):**
```json
{
  "statusCode": 200,
  "data": [
    {
      "id": 1,
      "name": "JLPT N5 Kanji",
      "description": "Basic kanji for JLPT N5",
      "totalKanji": 80,
      "isPublic": true
    }
  ]
}
```

---

### Get Kanji List by ID 🔒

**GET** `/kanji-lists/:id`

Get detailed information about a kanji list.

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "id": 1,
    "name": "JLPT N5 Kanji",
    "description": "Basic kanji for JLPT N5",
    "isPublic": true,
    "userId": 1,
    "userName": "Admin",
    "userEmail": "admin@example.com",
    "kanji": [
      {
        "id": 1,
        "character": "日",
        "meanings": "sun, day",
        "jlpt": 5
      }
    ],
    "totalKanji": 80
  }
}
```

---

### Create Kanji List 🔒

**POST** `/kanji-lists`

Create a new kanji list.

**Request Body:**
```json
{
  "name": "My Custom List",
  "description": "My personal kanji collection",
  "categoryId": 1,
  "kanjiIds": [1, 2, 3]
}
```

**Response (201):**
```json
{
  "statusCode": 201,
  "data": {
    "id": 10,
    "name": "My Custom List",
    "description": "My personal kanji collection",
    "isPublic": false,
    "userId": 2
  }
}
```

---

### Update Kanji List 🔒

**PUT** `/kanji-lists/:id` or **PATCH** `/kanji-lists/:id`

Update kanji list information.

**Request Body:**
```json
{
  "name": "Updated List Name",
  "description": "Updated description",
  "isPublic": true
}
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "id": 10,
    "name": "Updated List Name",
    "isPublic": true
  }
}
```

---

### Delete Kanji List 🔒

**DELETE** `/kanji-lists/:id`

Delete a kanji list.

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "Kanji list deleted successfully"
}
```

---

### Add Kanji to List 🔒

**POST** `/kanji-lists/:id/kanji/:kanjiId`

Add a kanji to the list.

**Response (201):**
```json
{
  "statusCode": 201,
  "data": {
    "id": 1,
    "listId": 10,
    "kanjiId": 5
  }
}
```

---

### Remove Kanji from List 🔒

**DELETE** `/kanji-lists/:id/kanji/:kanjiId`

Remove a kanji from the list.

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "Kanji removed from list successfully"
}
```

---

### Request Publish 🔒

**POST** `/kanji-lists/:id/publish`

Request to publish a private list as public.

**Response (201):**
```json
{
  "statusCode": 201,
  "data": {
    "id": 1,
    "listId": 10,
    "status": "PENDING",
    "requestedAt": "2025-10-24T00:00:00.000Z"
  }
}
```

---

### Get Publish Requests 🔒 (Admin)

**GET** `/kanji-lists/admin/publish-requests`

Get all publish requests.

**Query Parameters:**
- `status` (string, optional): Filter by status (PENDING, APPROVED, REJECTED)

**Response (200):**
```json
{
  "statusCode": 200,
  "data": [
    {
      "id": 1,
      "listId": 10,
      "status": "PENDING",
      "list": {
        "name": "My Custom List",
        "totalKanji": 50
      },
      "requestedAt": "2025-10-24T00:00:00.000Z"
    }
  ]
}
```

---

### Approve Publish Request 🔒 (Admin)

**POST** `/kanji-lists/admin/publish-requests/:id/approve`

Approve a publish request.

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "id": 1,
    "status": "APPROVED",
    "reviewedAt": "2025-10-24T00:00:00.000Z"
  }
}
```

---

### Reject Publish Request 🔒 (Admin)

**POST** `/kanji-lists/admin/publish-requests/:id/reject`

Reject a publish request.

**Request Body:**
```json
{
  "reason": "List does not meet quality standards"
}
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "id": 1,
    "status": "REJECTED",
    "reason": "List does not meet quality standards"
  }
}
```

---

## 🎯 Quiz System

### Get All Quizzes 🔒

**GET** `/quizzes`

Get all quizzes (public + user's own).

**Query Parameters:**
- `search` (string, optional): Search by title
- `limit` (number, optional): Items per page
- `offset` (number, optional): Offset for pagination

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "items": [
      {
        "id": 1,
        "title": "JLPT N5 Practice Quiz",
        "description": "Test your N5 knowledge",
        "isPublic": true,
        "userId": 1,
        "totalQuestions": 20,
        "createdAt": "2025-10-24T00:00:00.000Z"
      }
    ],
    "total": 5
  }
}
```

---

### Get Quiz by ID 🔒

**GET** `/quizzes/:id`

Get detailed quiz information including questions.

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "id": 1,
    "title": "JLPT N5 Practice Quiz",
    "description": "Test your N5 knowledge",
    "isPublic": true,
    "userId": 1,
    "questions": [
      {
        "id": 1,
        "questionType": "MULTIPLE_CHOICE",
        "questionText": "What does 日 mean?",
        "points": 10,
        "order": 1,
        "options": [
          { "id": 1, "text": "sun, day", "isCorrect": true },
          { "id": 2, "text": "moon", "isCorrect": false },
          { "id": 3, "text": "star", "isCorrect": false },
          { "id": 4, "text": "water", "isCorrect": false }
        ]
      }
    ],
    "totalQuestions": 20
  }
}
```

---

### Create Quiz 🔒

**POST** `/quizzes`

Create a new quiz.

**Request Body:**
```json
{
  "title": "My Practice Quiz",
  "description": "Custom quiz for practice"
}
```

**Response (201):**
```json
{
  "statusCode": 201,
  "data": {
    "id": 10,
    "title": "My Practice Quiz",
    "description": "Custom quiz for practice",
    "isPublic": false,
    "userId": 2
  }
}
```

---

### Update Quiz 🔒

**PUT** `/quizzes/:id`

Update quiz information.

**Request Body:**
```json
{
  "title": "Updated Quiz Title",
  "description": "Updated description",
  "isPublic": true
}
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "id": 10,
    "title": "Updated Quiz Title",
    "isPublic": true
  }
}
```

---

### Delete Quiz 🔒

**DELETE** `/quizzes/:id`

Delete a quiz.

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "Quiz deleted successfully"
}
```

---

### Add Question to Quiz 🔒

**POST** `/quizzes/:id/questions`

Add a new question to the quiz.

**Request Body (Multiple Choice):**
```json
{
  "questionType": "MULTIPLE_CHOICE",
  "questionText": "What does 月 mean?",
  "points": 10,
  "options": [
    { "text": "moon, month", "isCorrect": true },
    { "text": "sun", "isCorrect": false },
    { "text": "star", "isCorrect": false },
    { "text": "water", "isCorrect": false }
  ]
}
```

**Request Body (True/False):**
```json
{
  "questionType": "TRUE_FALSE",
  "questionText": "日 means sun",
  "points": 5,
  "correctAnswer": true
}
```

**Request Body (Drawing):**
```json
{
  "questionType": "DRAWING",
  "questionText": "Draw the kanji for 'sun'",
  "points": 15,
  "correctKanjiId": 1
}
```

**Response (201):**
```json
{
  "statusCode": 201,
  "data": {
    "id": 50,
    "questionType": "MULTIPLE_CHOICE",
    "questionText": "What does 月 mean?",
    "points": 10,
    "order": 5
  }
}
```

---

### Update Question 🔒

**PUT** `/quizzes/:id/questions/:questionId`

Update a question.

**Request Body:**
```json
{
  "questionText": "Updated question text",
  "points": 15
}
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "id": 50,
    "questionText": "Updated question text",
    "points": 15
  }
}
```

---

### Delete Question 🔒

**DELETE** `/quizzes/:id/questions/:questionId`

Delete a question from the quiz.

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "Question deleted successfully"
}
```

---

### Reorder Questions 🔒

**PUT** `/quizzes/:id/questions/reorder`

Reorder questions in the quiz.

**Request Body:**
```json
{
  "questionOrders": [
    { "id": 1, "order": 2 },
    { "id": 2, "order": 1 },
    { "id": 3, "order": 3 }
  ]
}
```

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "Questions reordered successfully"
}
```

---

### Start Quiz Attempt 🔒

**POST** `/quizzes/:id/start`

Start a new quiz attempt.

**Response (201):**
```json
{
  "statusCode": 201,
  "data": {
    "id": 100,
    "quizId": 1,
    "userId": 2,
    "startedAt": "2025-10-24T10:00:00.000Z",
    "status": "IN_PROGRESS"
  }
}
```

---

### Submit Quiz Attempt 🔒

**POST** `/quizzes/attempts/:attemptId/submit`

Submit answers for a quiz attempt.

**Request Body:**
```json
{
  "answers": [
    {
      "questionId": 1,
      "selectedOptionId": 1
    },
    {
      "questionId": 2,
      "booleanAnswer": true
    },
    {
      "questionId": 3,
      "drawnKanjiId": 5
    }
  ]
}
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "id": 100,
    "quizId": 1,
    "score": 85,
    "totalPoints": 100,
    "correctAnswers": 17,
    "totalQuestions": 20,
    "completedAt": "2025-10-24T10:30:00.000Z",
    "timeSpent": 1800,
    "passed": true
  }
}
```

---

### Get Quiz Attempts 🔒

**GET** `/quizzes/:id/attempts`

Get all attempts for a quiz.

**Response (200):**
```json
{
  "statusCode": 200,
  "data": [
    {
      "id": 100,
      "score": 85,
      "totalPoints": 100,
      "completedAt": "2025-10-24T10:30:00.000Z",
      "passed": true
    }
  ]
}
```

---

### Get Quiz Attempt Details 🔒

**GET** `/quizzes/attempts/:attemptId`

Get detailed information about a specific attempt.

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "id": 100,
    "quizId": 1,
    "score": 85,
    "correctAnswers": 17,
    "totalQuestions": 20,
    "answers": [
      {
        "questionId": 1,
        "isCorrect": true,
        "pointsEarned": 10
      }
    ]
  }
}
```

---

### Request Publish Quiz 🔒

**POST** `/quizzes/:id/publish-request`

Request to publish a quiz.

**Request Body:**
```json
{
  "message": "This quiz is ready for public use"
}
```

**Response (201):**
```json
{
  "statusCode": 201,
  "data": {
    "id": 1,
    "quizId": 10,
    "status": "PENDING",
    "message": "This quiz is ready for public use"
  }
}
```

---

### Get Pending Publish Requests 🔒 (Admin)

**GET** `/quizzes/admin/publish-requests`

Get all pending publish requests.

**Response (200):**
```json
{
  "statusCode": 200,
  "data": [
    {
      "id": 1,
      "quizId": 10,
      "status": "PENDING",
      "quiz": {
        "title": "My Practice Quiz",
        "totalQuestions": 20
      }
    }
  ]
}
```

---

### Review Publish Request 🔒 (Admin)

**PUT** `/quizzes/admin/publish-requests/:requestId`

Approve or reject a publish request.

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

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "id": 1,
    "status": "APPROVED",
    "reviewedAt": "2025-10-24T00:00:00.000Z"
  }
}
```

---

## 🎴 Flashcard Decks

### Get All Flashcard Decks

**GET** `/flashcard-decks`

Get all flashcard decks (public + authenticated user's own).

**Query Parameters:**
- `search` (string, optional): Search by name
- `limit` (number, optional): Items per page
- `offset` (number, optional): Offset for pagination

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "items": [
      {
        "id": 1,
        "name": "JLPT N5 Flashcards",
        "description": "Basic kanji flashcards",
        "isPublic": true,
        "userId": 1,
        "userName": "Admin",
        "userEmail": "admin@example.com",
        "totalCards": 80,
        "createdAt": "2025-10-24T00:00:00.000Z"
      }
    ],
    "total": 10
  }
}
```

---

### Get Flashcard Deck by ID 🔒

**GET** `/flashcard-decks/:id`

Get detailed flashcard deck information.

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "id": 1,
    "name": "JLPT N5 Flashcards",
    "description": "Basic kanji flashcards",
    "isPublic": true,
    "userId": 1,
    "cards": [
      {
        "id": 1,
        "kanjiId": 1,
        "kanji": {
          "character": "日",
          "meanings": "sun, day",
          "onyomi": "ニチ、ジツ",
          "kunyomi": "ひ、び、か"
        },
        "order": 1
      }
    ],
    "totalCards": 80
  }
}
```

---

### Create Flashcard Deck 🔒

**POST** `/flashcard-decks`

Create a new flashcard deck.

**Request Body:**
```json
{
  "name": "My Flashcard Deck",
  "description": "Personal flashcard collection",
  "kanjiIds": [1, 2, 3, 4, 5]
}
```

**Response (201):**
```json
{
  "statusCode": 201,
  "data": {
    "id": 10,
    "name": "My Flashcard Deck",
    "description": "Personal flashcard collection",
    "isPublic": false,
    "userId": 2,
    "totalCards": 5
  }
}
```

---

### Update Flashcard Deck 🔒

**PUT** `/flashcard-decks/:id`

Update flashcard deck information.

**Request Body:**
```json
{
  "name": "Updated Deck Name",
  "description": "Updated description",
  "isPublic": true
}
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "id": 10,
    "name": "Updated Deck Name",
    "isPublic": true
  }
}
```

---

### Delete Flashcard Deck 🔒

**DELETE** `/flashcard-decks/:id`

Delete a flashcard deck.

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "Flashcard deck deleted successfully"
}
```

---

### Add Card to Deck 🔒

**POST** `/flashcard-decks/:id/cards/:kanjiId`

Add a kanji card to the deck.

**Response (201):**
```json
{
  "statusCode": 201,
  "data": {
    "id": 1,
    "deckId": 10,
    "kanjiId": 6,
    "order": 6
  }
}
```

---

### Remove Card from Deck 🔒

**DELETE** `/flashcard-decks/:id/cards/:kanjiId`

Remove a card from the deck.

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "Card removed from deck successfully"
}
```

---

### Request Publish Deck 🔒

**POST** `/flashcard-decks/:id/publish`

Request to publish a deck.

**Response (201):**
```json
{
  "statusCode": 201,
  "data": {
    "id": 1,
    "deckId": 10,
    "status": "PENDING"
  }
}
```

---

### Get Publish Requests 🔒 (Admin)

**GET** `/flashcard-decks/admin/publish-requests`

Get all publish requests.

**Query Parameters:**
- `status` (string, optional): Filter by status

**Response (200):**
```json
{
  "statusCode": 200,
  "data": [
    {
      "id": 1,
      "deckId": 10,
      "status": "PENDING",
      "deck": {
        "name": "My Flashcard Deck",
        "totalCards": 50
      }
    }
  ]
}
```

---

### Approve Publish Request 🔒 (Admin)

**POST** `/flashcard-decks/admin/publish-requests/:id/approve`

Approve a publish request.

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "id": 1,
    "status": "APPROVED"
  }
}
```

---

### Reject Publish Request 🔒 (Admin)

**POST** `/flashcard-decks/admin/publish-requests/:id/reject`

Reject a publish request.

**Request Body:**
```json
{
  "reason": "Deck does not meet quality standards"
}
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "id": 1,
    "status": "REJECTED",
    "reason": "Deck does not meet quality standards"
  }
}
```

---

## 🤖 AI Recognition

### Predict Kanji (AI Service)

**POST** `/ai/predict`

Predict kanji from base64 image data.

**Request Body:**
```json
{
  "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "predictions": [
      {
        "character": "日",
        "confidence": 0.95,
        "rank": 1
      },
      {
        "character": "目",
        "confidence": 0.03,
        "rank": 2
      }
    ],
    "topPrediction": {
      "character": "日",
      "confidence": 0.95
    }
  }
}
```

---

### Check AI Health

**GET** `/ai/health`

Check AI server health status.

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "status": "healthy",
    "message": "AI server is operational",
    "timestamp": "2025-10-24T00:00:00.000Z"
  }
}
```

---

### Recognize Kanji (Canvas Drawing)

**POST** `/kanji-recognition/recognize`

Recognize kanji from canvas drawing data.

**Request Body:**
```json
{
  "imageData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "predictions": [
      {
        "kanji": "日",
        "confidence": 0.95,
        "rank": 1
      }
    ],
    "recognized": true
  }
}
```

---

### Check Recognition Health

**GET** `/kanji-recognition/health`

Check kanji recognition service health.

**Response (200):**
```json
{
  "status": "healthy",
  "message": "Recognition service is operational"
}
```

---

## 📂 Categories

### Get All Categories

**GET** `/categories`

Get all available categories.

**Response (200):**
```json
{
  "statusCode": 200,
  "data": [
    {
      "id": 1,
      "name": "JLPT",
      "description": "Japanese Language Proficiency Test levels"
    },
    {
      "id": 2,
      "name": "Grade",
      "description": "Japanese school grade levels"
    }
  ]
}
```

---

### Get Category by ID

**GET** `/categories/:id`

Get category details.

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "id": 1,
    "name": "JLPT",
    "description": "Japanese Language Proficiency Test levels"
  }
}
```

---

### Create Category 🔒 (Admin)

**POST** `/categories`

Create a new category.

**Request Body:**
```json
{
  "name": "Custom Category",
  "description": "Custom category description"
}
```

**Response (201):**
```json
{
  "statusCode": 201,
  "data": {
    "id": 3,
    "name": "Custom Category",
    "description": "Custom category description"
  }
}
```

---

### Update Category 🔒 (Admin)

**PUT** `/categories/:id`

Update category information.

**Request Body:**
```json
{
  "name": "Updated Category Name",
  "description": "Updated description"
}
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "id": 3,
    "name": "Updated Category Name"
  }
}
```

---

### Delete Category 🔒 (Admin)

**DELETE** `/categories/:id`

Delete a category.

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "Category deleted successfully"
}
```

---

## 👤 User Management (Admin)

### Get All Users 🔒 (Admin)

**GET** `/admin/users`

Get all users (admin only).

**Response (200):**
```json
{
  "statusCode": 200,
  "data": [
    {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER",
      "createdAt": "2025-10-24T00:00:00.000Z"
    }
  ]
}
```

---

### Get User by ID 🔒 (Admin)

**GET** `/admin/users/:id`

Get user details.

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "profileImage": null,
    "createdAt": "2025-10-24T00:00:00.000Z"
  }
}
```

---

### Update User 🔒 (Admin)

**PATCH** `/admin/users/:id`

Update user information.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "role": "ADMIN"
}
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "id": 1,
    "name": "Jane Doe",
    "role": "ADMIN"
  }
}
```

---

### Delete User 🔒 (Admin)

**DELETE** `/admin/users/:id`

Delete a user account.

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "User deleted successfully"
}
```

---

## 📊 Common Response Formats

### Success Response

```json
{
  "statusCode": 200,
  "data": { /* response data */ },
  "message": "Optional success message"
}
```

### Paginated Response

```json
{
  "statusCode": 200,
  "data": {
    "items": [ /* array of items */ ],
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

## ❌ Error Handling

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request"
}
```

### Common HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 500 | Internal Server Error | Server error |

### Common Error Scenarios

**Authentication Error:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Invalid or expired token"
}
```

**Validation Error:**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

**Permission Error:**
```json
{
  "statusCode": 403,
  "message": "Forbidden",
  "error": "Insufficient permissions to perform this action"
}
```

**Not Found Error:**
```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "Kanji with ID 9999 not found"
}
```

---

## 🔑 Authentication Headers

For all protected endpoints (marked with 🔒), include the JWT token in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📝 Notes

1. **Base URL**: All endpoints use the base URL `http://localhost:3000` in development
2. **Content-Type**: All POST/PUT/PATCH requests should use `Content-Type: application/json`
3. **Authentication**: JWT tokens expire after 24 hours by default
4. **Pagination**: Default limit is 20 items per page
5. **Rate Limiting**: API implements rate limiting (details TBD)
6. **CORS**: Configured for cross-origin requests

---

## 🚀 Quick Start Example

```bash
# 1. Register a new user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'

# 2. Login and get token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# 3. Use token to access protected endpoint
curl -X GET http://localhost:3000/kanji-lists \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

**Last Updated**: October 24, 2025  
**API Version**: 1.0.0  
**Maintained By**: Development Team

For issues or questions, please contact the development team.
