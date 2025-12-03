# API Testing Examples - Flashcard & Quiz Modules

## 🔐 Authentication First

```bash
# Login to get access token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "account": "admin",
    "password": "123456"
  }'

# Response:
{
  "statusCode": 200,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "account": "admin",
      "fullname": "Admin User"
    }
  }
}
```

**⚠️ Save the `accessToken` for subsequent requests!**

---

## 📚 Flashcard Module Examples

### 1. Create a Deck

```bash
curl -X POST http://localhost:3000/flashcard/decks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "JLPT N5 Kanji",
    "description": "Basic kanji for beginners",
    "is_public": true
  }'
```

**Response:**
```json
{
  "statusCode": 201,
  "data": {
    "id": 1,
    "name": "JLPT N5 Kanji",
    "description": "Basic kanji for beginners",
    "is_public": true,
    "user_id": 1,
    "created_at": "2025-11-30T12:00:00.000Z",
    "updated_at": "2025-11-30T12:00:00.000Z"
  }
}
```

---

### 2. Get All Decks (with filters)

```bash
# Get all decks
curl http://localhost:3000/flashcard/decks

# With pagination
curl "http://localhost:3000/flashcard/decks?page=1&limit=10"

# Search by name
curl "http://localhost:3000/flashcard/decks?search=JLPT"

# Filter by user
curl "http://localhost:3000/flashcard/decks?user_id=1"

# Only public decks
curl "http://localhost:3000/flashcard/decks?is_public=true"
```

---

### 3. Get Deck by ID (with cards)

```bash
# Without cards
curl http://localhost:3000/flashcard/decks/1

# With all cards included
curl "http://localhost:3000/flashcard/decks/1?include_cards=true"
```

**Response with cards:**
```json
{
  "statusCode": 200,
  "data": {
    "id": 1,
    "name": "JLPT N5 Kanji",
    "description": "Basic kanji for beginners",
    "is_public": true,
    "user_id": 1,
    "Cards": [
      {
        "id": 1,
        "front_text": "人",
        "back_text": "person, human",
        "hint": "Remember: looks like a person walking"
      }
    ]
  }
}
```

---

### 4. Update a Deck

```bash
curl -X PUT http://localhost:3000/flashcard/decks/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "JLPT N5 Essential Kanji",
    "description": "Updated description"
  }'
```

---

### 5. Add a Card to Deck

```bash
curl -X POST http://localhost:3000/flashcard/decks/1/cards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "front_text": "日",
    "back_text": "day, sun",
    "hint": "Looks like the sun",
    "kanji_id": 123,
    "order_index": 1
  }'
```

---

### 6. Bulk Create Cards

```bash
curl -X POST http://localhost:3000/flashcard/decks/1/cards/bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "cards": [
      {
        "front_text": "月",
        "back_text": "moon, month",
        "hint": "Crescent moon shape"
      },
      {
        "front_text": "火",
        "back_text": "fire",
        "hint": "Flames rising"
      },
      {
        "front_text": "水",
        "back_text": "water",
        "hint": "Water flowing"
      }
    ]
  }'
```

---

### 7. Get All Cards in a Deck

```bash
curl http://localhost:3000/flashcard/decks/1/cards
```

---

### 8. Update a Card

```bash
curl -X PUT http://localhost:3000/flashcard/cards/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "front_text": "日本",
    "back_text": "Japan",
    "hint": "Origin of the sun"
  }'
```

---

### 9. Delete a Card

```bash
curl -X DELETE http://localhost:3000/flashcard/cards/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 10. Delete a Deck (Cascade Delete)

```bash
# This will also delete all cards in the deck
curl -X DELETE http://localhost:3000/flashcard/decks/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🎯 Quiz Module Examples

### 1. Create a Quiz

```bash
curl -X POST http://localhost:3000/quiz \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "title": "JLPT N5 Practice Test",
    "description": "Test your basic Japanese knowledge",
    "quiz_type": "JLPT",
    "difficulty_level": "EASY",
    "is_public": true,
    "time_limit": 1800,
    "passing_score": 70
  }'
```

**Quiz Types:** `JLPT`, `VOCABULARY`, `GRAMMAR`, `KANJI`, `READING`  
**Difficulty Levels:** `EASY`, `MEDIUM`, `HARD`, `EXPERT`

---

### 2. Get All Quizzes (with filters)

```bash
# All quizzes
curl http://localhost:3000/quiz

# Filter by type
curl "http://localhost:3000/quiz?quiz_type=JLPT"

# Filter by difficulty
curl "http://localhost:3000/quiz?difficulty=EASY"

# Search by title
curl "http://localhost:3000/quiz?search=N5"

# Pagination
curl "http://localhost:3000/quiz?page=1&limit=10"

# Only public quizzes
curl "http://localhost:3000/quiz?is_public=true"
```

---

### 3. Get Quiz by ID (with questions)

```bash
# Without questions
curl http://localhost:3000/quiz/1

# With all questions included
curl "http://localhost:3000/quiz/1?include_questions=true"
```

**Response with questions:**
```json
{
  "statusCode": 200,
  "data": {
    "id": 1,
    "title": "JLPT N5 Practice Test",
    "quiz_type": "JLPT",
    "difficulty_level": "EASY",
    "Questions": [
      {
        "id": 1,
        "question_text": "What is the meaning of 人?",
        "question_type": "MULTIPLE_CHOICE",
        "correct_answer": "person",
        "options": ["person", "day", "fire", "water"]
      }
    ]
  }
}
```

---

### 4. Update a Quiz

```bash
curl -X PUT http://localhost:3000/quiz/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "title": "JLPT N5 Complete Test",
    "time_limit": 2400,
    "passing_score": 75
  }'
```

---

### 5. Add a Question to Quiz

```bash
# Multiple Choice Question
curl -X POST http://localhost:3000/quiz/1/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "question_text": "What does 日本 mean?",
    "question_type": "MULTIPLE_CHOICE",
    "correct_answer": "Japan",
    "options": ["Japan", "China", "Korea", "Thailand"],
    "explanation": "日本 (Nihon) means Japan - Land of the Rising Sun",
    "points": 10,
    "order_index": 1
  }'

# True/False Question
curl -X POST http://localhost:3000/quiz/1/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "question_text": "Is 人 the kanji for person?",
    "question_type": "TRUE_FALSE",
    "correct_answer": "true",
    "options": ["true", "false"],
    "points": 5
  }'

# Fill in the Blank
curl -X POST http://localhost:3000/quiz/1/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "question_text": "私は___です (I am a student)",
    "question_type": "FILL_IN_BLANK",
    "correct_answer": "学生",
    "explanation": "学生 (gakusei) means student",
    "points": 15
  }'
```

**Question Types:** `MULTIPLE_CHOICE`, `TRUE_FALSE`, `FILL_IN_BLANK`

---

### 6. Bulk Create Questions

```bash
curl -X POST http://localhost:3000/quiz/1/questions/bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "questions": [
      {
        "question_text": "What is the reading of 日?",
        "question_type": "MULTIPLE_CHOICE",
        "correct_answer": "ni, jitsu",
        "options": ["ni, jitsu", "getsu", "ka", "sui"],
        "points": 10
      },
      {
        "question_text": "月 means moon or month",
        "question_type": "TRUE_FALSE",
        "correct_answer": "true",
        "options": ["true", "false"],
        "points": 5
      }
    ]
  }'
```

---

### 7. Get All Questions in a Quiz

```bash
curl http://localhost:3000/quiz/1/questions
```

---

### 8. Update a Question

```bash
curl -X PUT http://localhost:3000/quiz/questions/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "question_text": "What does 日本 (Nihon) mean?",
    "points": 15,
    "explanation": "Updated explanation"
  }'
```

---

### 9. Delete a Question

```bash
curl -X DELETE http://localhost:3000/quiz/questions/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 10. Submit Quiz Answers

```bash
curl -X POST http://localhost:3000/quiz/1/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "answers": [
      {
        "question_id": 1,
        "user_answer": "Japan"
      },
      {
        "question_id": 2,
        "user_answer": "true"
      },
      {
        "question_id": 3,
        "user_answer": "学生"
      }
    ]
  }'
```

**Response:**
```json
{
  "statusCode": 201,
  "data": {
    "id": 15,
    "quiz_id": 1,
    "user_id": 1,
    "score": 85,
    "total_questions": 3,
    "correct_answers": 3,
    "time_taken": 450,
    "passed": true,
    "submitted_at": "2025-11-30T12:30:00.000Z"
  }
}
```

---

### 11. Get Quiz Result by ID

```bash
curl http://localhost:3000/quiz/result/15 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 12. Get All Results for a Quiz

```bash
# Get all results for quiz ID 1
curl "http://localhost:3000/quiz/results?quiz_id=1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get all results for current user
curl "http://localhost:3000/quiz/results?user_id=1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 13. Get My Results for a Quiz

```bash
# Get all my attempts for quiz ID 1
curl http://localhost:3000/quiz/1/my-results \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 14. Delete a Quiz (Cascade Delete)

```bash
# This will delete quiz, all questions, and all results
curl -X DELETE http://localhost:3000/quiz/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🧪 Testing with VS Code REST Client

Create a file `test.http` and use the **REST Client** extension:

```http
### Variables
@baseUrl = http://localhost:3000
@token = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

### Login
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "account": "admin",
  "password": "123456"
}

### Create Deck
POST {{baseUrl}}/flashcard/decks
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "name": "My First Deck",
  "description": "Learning basic kanji",
  "is_public": false
}

### Get All Decks
GET {{baseUrl}}/flashcard/decks?page=1&limit=10

### Create Quiz
POST {{baseUrl}}/quiz
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "title": "Quick Kanji Quiz",
  "quiz_type": "KANJI",
  "difficulty_level": "EASY",
  "is_public": true,
  "passing_score": 70
}

### Submit Quiz
POST {{baseUrl}}/quiz/1/submit
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "answers": [
    {"question_id": 1, "user_answer": "person"},
    {"question_id": 2, "user_answer": "true"}
  ]
}
```

---

## 🐛 Common Errors

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```
**Solution:** Include valid JWT token in Authorization header

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["name should not be empty"],
  "error": "Bad Request"
}
```
**Solution:** Check request body validation requirements

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Deck with ID 999 not found"
}
```
**Solution:** Verify the resource ID exists

---

## 📝 Quick Test Workflow

### Flashcard Testing
```bash
# 1. Login
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"account":"admin","password":"123456"}' \
  | jq -r '.data.accessToken')

# 2. Create deck
DECK_ID=$(curl -X POST http://localhost:3000/flashcard/decks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Deck","is_public":true}' \
  | jq -r '.data.id')

# 3. Add cards
curl -X POST http://localhost:3000/flashcard/decks/$DECK_ID/cards/bulk \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cards":[{"front_text":"人","back_text":"person"}]}'

# 4. Get deck with cards
curl "http://localhost:3000/flashcard/decks/$DECK_ID?include_cards=true"
```

### Quiz Testing
```bash
# 1. Create quiz
QUIZ_ID=$(curl -X POST http://localhost:3000/quiz \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Quiz","quiz_type":"JLPT","difficulty_level":"EASY"}' \
  | jq -r '.data.id')

# 2. Add questions
curl -X POST http://localhost:3000/quiz/$QUIZ_ID/questions/bulk \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"questions":[{"question_text":"Test?","question_type":"TRUE_FALSE","correct_answer":"true","options":["true","false"],"points":10}]}'

# 3. Get quiz with questions
curl "http://localhost:3000/quiz/$QUIZ_ID?include_questions=true"

# 4. Submit answers
curl -X POST http://localhost:3000/quiz/$QUIZ_ID/submit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"answers":[{"question_id":1,"user_answer":"true"}]}'
```

---

*Happy Testing! 🚀*
