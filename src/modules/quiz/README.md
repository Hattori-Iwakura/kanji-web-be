# Quiz Module - API Documentation

Module Quiz cung cấp đầy đủ chức năng để tạo, quản lý và thực hiện các bài quiz học Kanji.

## 📋 Tính năng

### Quiz Management
- ✅ Tạo quiz mới
- ✅ Cập nhật quiz
- ✅ Xóa quiz
- ✅ Lấy danh sách quiz (có filter)
- ✅ Lấy chi tiết quiz

### Question Management
- ✅ Thêm câu hỏi vào quiz
- ✅ Thêm nhiều câu hỏi cùng lúc (bulk)
- ✅ Cập nhật câu hỏi
- ✅ Xóa câu hỏi
- ✅ Lấy danh sách câu hỏi của quiz

### Quiz Submission & Results
- ✅ Nộp bài quiz
- ✅ Xem kết quả chi tiết
- ✅ Xem lịch sử làm bài

## 🗄️ Database Schema

### Quiz Table
```prisma
model Quiz {
  id            Int             @id @default(autoincrement())
  title         String
  description   String?
  user_id       Int?            // null = public quiz
  is_public     Boolean         @default(false)
  quiz_type     QuizType        @default(MULTIPLE_CHOICE)
  difficulty    DifficultyLevel @default(MEDIUM)
  time_limit    Int?            // in seconds
  passing_score Int             @default(70) // percentage
  create_at     DateTime        @default(now())
  update_at     DateTime        @updatedAt
}
```

### QuizQuestion Table
```prisma
model QuizQuestion {
  id             Int          @id @default(autoincrement())
  quiz_id        Int
  kanji_id       Int
  question_type  QuestionType
  question_text  String
  correct_answer String
  options        Json?        // array of strings
  explanation    String?
  points         Int          @default(1)
  order_index    Int?
}
```

### QuizResult Table
```prisma
model QuizResult {
  id              Int      @id @default(autoincrement())
  quiz_id         Int
  user_id         Int
  score           Int
  total_questions Int
  correct_answers Int
  time_taken      Int?
  answers         Json     // detailed answers
  completed_at    DateTime @default(now())
}
```

## 📝 Enums

### QuizType
```typescript
enum QuizType {
  MULTIPLE_CHOICE  // Trắc nghiệm
  TRUE_FALSE       // Đúng/Sai
  FILL_IN_BLANK    // Điền vào chỗ trống
  MATCHING         // Ghép cặp
}
```

### QuestionType
```typescript
enum QuestionType {
  KANJI_TO_MEANING    // Cho kanji, chọn nghĩa
  MEANING_TO_KANJI    // Cho nghĩa, chọn kanji
  KANJI_TO_ONYOMI     // Cho kanji, chọn âm Hán
  KANJI_TO_KUNYOMI    // Cho kanji, chọn âm Kun
  READING_TO_KANJI    // Cho reading, chọn kanji
}
```

### DifficultyLevel
```typescript
enum DifficultyLevel {
  EASY
  MEDIUM
  HARD
}
```

## 🚀 API Endpoints

### 1. Quiz Management

#### GET /quiz
Lấy danh sách quiz với filter

**Query Parameters:**
```typescript
{
  search?: string;           // Tìm kiếm theo tên
  difficulty?: DifficultyLevel;
  quiz_type?: QuizType;
  is_public?: boolean;
  user_id?: number;
}
```

**Response:**
```json
[
  {
    "id": 1,
    "title": "JLPT N5 Kanji Quiz",
    "description": "Basic kanji quiz for beginners",
    "is_public": true,
    "quiz_type": "MULTIPLE_CHOICE",
    "difficulty": "EASY",
    "time_limit": 600,
    "passing_score": 70,
    "User": {
      "id": 1,
      "account": "admin",
      "email": "admin@gmail.com"
    },
    "_count": {
      "Questions": 20,
      "Results": 5
    }
  }
]
```

#### GET /quiz/:id
Lấy chi tiết quiz

**Query Parameters:**
- `include_questions=true` - Bao gồm danh sách câu hỏi

**Response:**
```json
{
  "id": 1,
  "title": "JLPT N5 Kanji Quiz",
  "description": "Basic kanji quiz",
  "Questions": [
    {
      "id": 1,
      "question_text": "Kanji này đọc là gì? 日",
      "question_type": "KANJI_TO_ONYOMI",
      "options": ["ニチ", "ゲツ", "カ", "スイ"],
      "correct_answer": "ニチ",
      "points": 1,
      "Kanji": {
        "character": "日",
        "meanings": "day, sun"
      }
    }
  ]
}
```

#### POST /quiz
Tạo quiz mới (Yêu cầu authentication)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "title": "JLPT N5 Kanji Quiz",
  "description": "Basic kanji quiz for beginners",
  "is_public": true,
  "quiz_type": "MULTIPLE_CHOICE",
  "difficulty": "EASY",
  "time_limit": 600,
  "passing_score": 70
}
```

**Response:**
```json
{
  "id": 1,
  "title": "JLPT N5 Kanji Quiz",
  "description": "Basic kanji quiz for beginners",
  "user_id": 1,
  "is_public": true,
  "quiz_type": "MULTIPLE_CHOICE",
  "difficulty": "EASY",
  "time_limit": 600,
  "passing_score": 70,
  "create_at": "2025-11-14T02:00:00.000Z",
  "update_at": "2025-11-14T02:00:00.000Z"
}
```

#### PUT /quiz/:id
Cập nhật quiz (Yêu cầu authentication)

**Request Body:**
```json
{
  "title": "Updated Quiz Title",
  "difficulty": "MEDIUM",
  "time_limit": 900
}
```

#### DELETE /quiz/:id
Xóa quiz (Yêu cầu authentication)

**Response:**
```json
{
  "id": 1,
  "title": "JLPT N5 Kanji Quiz",
  "message": "Quiz deleted successfully"
}
```

### 2. Question Management

#### GET /quiz/:quizId/questions
Lấy danh sách câu hỏi của quiz

**Response:**
```json
[
  {
    "id": 1,
    "quiz_id": 1,
    "kanji_id": 1,
    "question_type": "KANJI_TO_MEANING",
    "question_text": "Kanji 日 có nghĩa là gì?",
    "correct_answer": "day, sun",
    "options": ["day, sun", "moon, month", "fire", "water"],
    "explanation": "日 (ニチ/ひ) có nghĩa là ngày, mặt trời",
    "points": 1,
    "order_index": 0,
    "Kanji": {
      "character": "日",
      "onyomi": "ニチ",
      "kunyomi": "ひ",
      "meanings": "day, sun"
    }
  }
]
```

#### GET /quiz/questions/:id
Lấy chi tiết câu hỏi

#### POST /quiz/:quizId/questions
Thêm câu hỏi vào quiz (Yêu cầu authentication)

**Request Body:**
```json
{
  "kanji_id": 1,
  "question_type": "KANJI_TO_MEANING",
  "question_text": "Kanji 日 có nghĩa là gì?",
  "correct_answer": "day, sun",
  "options": ["day, sun", "moon, month", "fire", "water"],
  "explanation": "日 (ニチ/ひ) có nghĩa là ngày, mặt trời",
  "points": 1,
  "order_index": 0
}
```

#### POST /quiz/:quizId/questions/bulk
Thêm nhiều câu hỏi cùng lúc (Yêu cầu authentication)

**Request Body:**
```json
{
  "questions": [
    {
      "kanji_id": 1,
      "question_type": "KANJI_TO_MEANING",
      "question_text": "Kanji 日 có nghĩa là gì?",
      "correct_answer": "day, sun",
      "options": ["day, sun", "moon, month", "fire", "water"],
      "points": 1
    },
    {
      "kanji_id": 2,
      "question_type": "KANJI_TO_ONYOMI",
      "question_text": "Kanji 月 đọc là gì?",
      "correct_answer": "ゲツ",
      "options": ["ゲツ", "ニチ", "カ", "スイ"],
      "points": 1
    }
  ]
}
```

**Response:**
```json
{
  "message": "Created 2 questions successfully",
  "count": 2
}
```

#### PUT /quiz/questions/:id
Cập nhật câu hỏi (Yêu cầu authentication)

**Request Body:**
```json
{
  "question_text": "Updated question text",
  "correct_answer": "new answer",
  "points": 2
}
```

#### DELETE /quiz/questions/:id
Xóa câu hỏi (Yêu cầu authentication)

### 3. Quiz Submission & Results

#### POST /quiz/:quizId/submit
Nộp bài quiz (Yêu cầu authentication)

**Request Body:**
```json
{
  "answers": [
    {
      "question_id": 1,
      "user_answer": "day, sun"
    },
    {
      "question_id": 2,
      "user_answer": "ゲツ"
    }
  ],
  "time_taken": 120
}
```

**Response:**
```json
{
  "id": 1,
  "quiz_id": 1,
  "user_id": 1,
  "score": 85,
  "total_questions": 20,
  "correct_answers": 17,
  "time_taken": 120,
  "answers": [
    {
      "question_id": 1,
      "user_answer": "day, sun",
      "is_correct": true,
      "correct_answer": "day, sun",
      "explanation": "日 (ニチ/ひ) có nghĩa là ngày, mặt trời"
    },
    {
      "question_id": 2,
      "user_answer": "ニチ",
      "is_correct": false,
      "correct_answer": "ゲツ",
      "explanation": "月 đọc là ゲツ (Hán) hoặc つき (Kun)"
    }
  ],
  "completed_at": "2025-11-14T02:15:00.000Z",
  "Quiz": {
    "title": "JLPT N5 Kanji Quiz",
    "passing_score": 70
  }
}
```

#### GET /quiz/results/:id
Lấy chi tiết kết quả quiz theo ID

#### GET /quiz/results
Lấy danh sách kết quả quiz

**Query Parameters:**
```typescript
{
  quiz_id?: number;    // Lọc theo quiz
  user_id?: number;    // Lọc theo user
  limit?: number;      // Giới hạn số lượng (default: 10)
}
```

#### GET /quiz/:quizId/my-results
Lấy lịch sử làm bài của user hiện tại (Yêu cầu authentication)

**Response:**
```json
[
  {
    "id": 1,
    "score": 85,
    "total_questions": 20,
    "correct_answers": 17,
    "time_taken": 120,
    "completed_at": "2025-11-14T02:15:00.000Z"
  },
  {
    "id": 2,
    "score": 90,
    "total_questions": 20,
    "correct_answers": 18,
    "time_taken": 110,
    "completed_at": "2025-11-13T10:30:00.000Z"
  }
]
```

## 🎯 Use Cases

### 1. Tạo một Quiz hoàn chỉnh

```javascript
// Bước 1: Tạo quiz
const quiz = await fetch('/quiz', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'JLPT N5 Kanji Quiz',
    difficulty: 'EASY',
    time_limit: 600,
    passing_score: 70
  })
});

// Bước 2: Thêm câu hỏi
const questions = await fetch(`/quiz/${quiz.id}/questions/bulk`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    questions: [
      {
        kanji_id: 1,
        question_type: 'KANJI_TO_MEANING',
        question_text: 'Kanji 日 có nghĩa là gì?',
        correct_answer: 'day, sun',
        options: ['day, sun', 'moon', 'fire', 'water']
      }
      // ... more questions
    ]
  })
});
```

### 2. Làm bài Quiz

```javascript
// Bước 1: Lấy quiz và câu hỏi
const quiz = await fetch('/quiz/1?include_questions=true');

// Bước 2: User trả lời câu hỏi
const answers = [
  { question_id: 1, user_answer: 'day, sun' },
  { question_id: 2, user_answer: 'ゲツ' }
];

// Bước 3: Nộp bài
const result = await fetch('/quiz/1/submit', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    answers: answers,
    time_taken: 120
  })
});

// Kết quả sẽ bao gồm điểm số và chi tiết từng câu trả lời
```

## 🔒 Authentication

Các endpoints cần authentication sử dụng JWT Bearer token:

```
Authorization: Bearer <access_token>
```

Token có thể lấy từ endpoint `/auth/login`

## 📊 Response Format

Tất cả response đều theo format:

**Success:**
```json
{
  "data": { ... },
  "message": "Success"
}
```

**Error:**
```json
{
  "code": "ERROR_CODE",
  "message": "Error description",
  "statusCode": 400
}
```

## 🧪 Testing

Bạn có thể test các API bằng:
- Swagger UI: `http://localhost:3000/api`
- Postman
- curl commands

## 📝 Notes

- Quiz có thể được tạo bởi user (private) hoặc system (public)
- Mỗi câu hỏi liên kết với một kanji cụ thể
- Hệ thống tự động tính điểm dựa trên số câu đúng và points của mỗi câu
- Kết quả quiz lưu chi tiết câu trả lời để review sau
- Hỗ trợ nhiều loại câu hỏi (meaning, reading, onyomi, kunyomi)
