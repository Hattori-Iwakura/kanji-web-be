# Quiz Module - Backend Implementation

## Overview
Complete Quiz module with support for 3 question types:
- **Multiple Choice**: Traditional 4-option quiz questions
- **Fill in the Blank**: Text input questions
- **Drawing**: Kanji recognition-based questions

## Database Schema

### Models Created
1. **Quiz** - Main quiz container
   - Fields: id, user_id, title, description, difficulty, category, tags, is_public
   - Relations: User (owner), Questions[], Attempts[]

2. **Question** - Individual quiz questions
   - Fields: id, quiz_id, type, question, correct_answer, options (JSON), metadata (JSON), order_index, points, time_limit, explanation
   - Types: MULTIPLE_CHOICE, FILL_IN_BLANK, DRAWING
   - Relations: Quiz, Answers[]

3. **QuizAttempt** - User quiz attempts/sessions
   - Fields: id, user_id, quiz_id, score, max_score, started_at, completed_at, time_spent, is_completed
   - Relations: User, Quiz, Answers[]

4. **QuizAnswer** - Individual question answers
   - Fields: id, attempt_id, question_id, user_answer, is_correct, points, time_spent, metadata (JSON)
   - Relations: Attempt, Question

### Enums
- **QuizDifficulty**: BEGINNER, INTERMEDIATE, ADVANCED, EXPERT
- **QuizQuestionType**: MULTIPLE_CHOICE, FILL_IN_BLANK, DRAWING

## API Endpoints (12 total)

### Quiz Management
1. **POST /api/quiz**
   - Create a new quiz
   - Auth: Required
   - Body: CreateQuizDto (title, description, difficulty, category, tags, is_public)

2. **GET /api/quiz**
   - Get all quizzes (with filters)
   - Auth: Required
   - Query params: my_quizzes (true/false), public (true/false), category, difficulty
   - Returns: List of quizzes with question count and attempt count

3. **GET /api/quiz/:id**
   - Get quiz details
   - Auth: Required
   - Returns: Quiz with all questions (correct answers hidden unless user is owner)

4. **PUT /api/quiz/:id**
   - Update quiz
   - Auth: Required (must be owner)
   - Body: UpdateQuizDto

5. **DELETE /api/quiz/:id**
   - Delete quiz
   - Auth: Required (must be owner)

### Question Management
6. **POST /api/quiz/:id/question**
   - Add question to quiz
   - Auth: Required (must be quiz owner)
   - Body: CreateQuestionDto (type, question, correct_answer, options, metadata, order_index, points, time_limit, explanation)

7. **DELETE /api/quiz/question/:id**
   - Delete question
   - Auth: Required (must be quiz owner)

### Quiz Taking
8. **POST /api/quiz/start**
   - Start a quiz attempt
   - Auth: Required
   - Body: { quiz_id: number }
   - Returns: QuizAttempt with all questions

9. **POST /api/quiz/answer**
   - Submit answer to a question
   - Auth: Required
   - Body: SubmitAnswerDto (attempt_id, question_id, user_answer, time_spent, metadata)
   - Returns: QuizAnswer with correctness and points awarded
   - Auto-completes attempt when all questions answered

10. **GET /api/quiz/attempt/:id**
    - Get attempt results
    - Auth: Required (must be attempt owner or quiz owner)
    - Returns: Complete attempt with all answers and questions

### Analytics
11. **GET /api/quiz/my-attempts**
    - Get user's quiz attempts
    - Auth: Required
    - Query params: quiz_id (optional)
    - Returns: List of user's attempts with scores

12. **GET /api/quiz/:id/statistics**
    - Get quiz statistics
    - Auth: Required (must be quiz owner)
    - Returns: total_attempts, average_score, average_time, completion_rate

## Question Type Specifications

### 1. Multiple Choice
```typescript
{
  type: "MULTIPLE_CHOICE",
  question: "What is the meaning of 日?",
  correct_answer: "A",  // or B, C, D
  options: {
    A: "Sun/Day",
    B: "Moon",
    C: "Star",
    D: "Earth"
  }
}
```

### 2. Fill in the Blank
```typescript
{
  type: "FILL_IN_BLANK",
  question: "今日は____です。 (Today is...)",
  correct_answer: "月曜日",  // Exact match (case-insensitive)
  metadata: {
    hint: "Day of the week"
  }
}
```

### 3. Drawing (Kanji Recognition)
```typescript
{
  type: "DRAWING",
  question: "Draw the kanji for 'water'",
  correct_answer: "水",  // Expected kanji character
  metadata: {
    hint: "3 strokes",
    strokeCount: 3
  }
}

// When submitting answer for drawing:
{
  user_answer: "水",  // Top prediction from recognition API
  metadata: {
    confidence: 0.95,
    predictions: [
      { character: "水", probability: 0.95 },
      { character: "氷", probability: 0.03 }
    ]
  }
}
```

## Backend Files Created

### DTOs
- `create-quiz.dto.ts` - Quiz creation
- `create-question.dto.ts` - Question creation
- `start-quiz.dto.ts` - Start quiz attempt
- `submit-answer.dto.ts` - Submit answer
- `update-quiz.dto.ts` - Update quiz
- `index.ts` - DTO exports

### Core Files
- `quiz.repository.ts` - Database operations (329 lines)
- `quiz.service.ts` - Business logic with authorization (186 lines)
- `quiz.controller.ts` - REST API endpoints (143 lines)
- `quiz.module.ts` - Module configuration

## Features

### Security
- All endpoints require JWT authentication
- Quiz visibility control (public/private)
- Owner-only operations (create, update, delete, add questions)
- Access control for quiz taking (public quizzes or owned quizzes)

### Answer Validation
- Multiple Choice: Exact match on option key (A/B/C/D)
- Fill in Blank: Case-insensitive text comparison
- Drawing: Exact character match (confidence from frontend)

### Auto-scoring
- Questions award configured points when correct
- Attempt score auto-updates with each answer
- Attempt auto-completes when all questions answered
- Time tracking per question and total attempt

### Statistics
- Total attempts count
- Average score
- Average completion time
- Completion rate percentage

## Integration Points

### With Kanji Recognition
Drawing questions integrate with existing endpoint:
- `POST /api/kanji-recognition/predict`
- Submit canvas image → Get character predictions
- Match top prediction with question.correct_answer

### With Flutter
All endpoints return properly structured JSON:
```json
{
  "statusCode": 200,
  "data": { ... },
  "timestamp": "2024-01-17T06:46:00.000Z"
}
```

## Next Steps for Flutter

### Domain Layer (Entities)
- Quiz entity
- Question entity  
- QuizAttempt entity
- QuizAnswer entity
- QuizQuestionType enum
- QuizDifficulty enum

### Data Layer
- Quiz models (from JSON)
- Remote data source (API calls)
- Repository implementation

### BLoC Layer
- QuizListBloc (browse/search quizzes)
- QuizDetailBloc (view quiz, start attempt)
- QuizSessionBloc (active quiz taking)
- QuizResultBloc (view results)

### UI Pages
- QuizListPage (browse all quizzes with filters)
- QuizDetailPage (preview quiz before starting)
- QuizSessionPage (take quiz with question renderers)
  - MultipleChoiceWidget
  - FillInBlankWidget
  - DrawingQuestionWidget (with canvas)
- QuizResultPage (show score, review answers)
- CreateQuizPage (create/edit quizzes)

### Bottom Navigation Integration
Add Quiz tab to MainHomePage (5th tab):
```dart
BottomNavigationBarItem(
  icon: Icon(Icons.quiz),
  label: 'Quiz',
)
```

## Migration Applied
Migration: `20251017064606_add_quiz_module`
- Created Quiz, Question, QuizAttempt, QuizAnswer tables
- Added enums QuizQuestionType, QuizDifficulty
- Established relations with Users table
- Prisma client regenerated

✅ Backend implementation complete!
