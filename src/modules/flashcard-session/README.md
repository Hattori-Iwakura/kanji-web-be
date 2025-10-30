# Flashcard Session Module - SM-2 Spaced Repetition

Complete flashcard study session implementation with SuperMemo 2 (SM-2) spaced repetition algorithm for optimal learning efficiency.

## Overview

The Flashcard Session Module provides comprehensive flashcard study functionality with:
- **SM-2 Algorithm**: Industry-standard spaced repetition for long-term retention
- **Session Management**: Start, review, and complete study sessions
- **Progress Tracking**: Detailed statistics, streaks, and analytics
- **Card Scheduling**: Intelligent due date calculation based on performance
- **Study Queue**: Organized card presentation with new/review prioritization

## Features

### 1. Session Management (5 endpoints)

#### POST `/api/flashcard-sessions/start`
Start a new flashcard study session.

**Authentication:** Required

**Body:**
```json
{
  "deckId": 1,
  "maxNewCards": 10,
  "maxReviewCards": 20
}
```

**Response:**
```json
{
  "sessionId": 42,
  "deckId": 1,
  "deckName": "JLPT N5 Kanji",
  "totalCards": 25,
  "newCards": 10,
  "reviewCards": 15,
  "startedAt": "2025-10-24T12:00:00Z"
}
```

#### GET `/api/flashcard-sessions/:sessionId`
Get current session progress.

**Response:**
```json
{
  "sessionId": 42,
  "totalCards": 25,
  "cardsReviewed": 10,
  "correctAnswers": 8,
  "incorrectAnswers": 2,
  "accuracy": 80,
  "startedAt": "2025-10-24T12:00:00Z",
  "timeElapsed": 300
}
```

#### GET `/api/flashcard-sessions/:sessionId/next-card`
Get the next card to study.

**Response:**
```json
{
  "cardId": 123,
  "kanjiId": 45,
  "character": "日",
  "meaning": "day, sun",
  "onyomi": "ニチ、ジツ",
  "kunyomi": "ひ、か",
  "isNew": false,
  "currentCard": 11,
  "totalCards": 25
}
```

#### POST `/api/flashcard-sessions/:sessionId/review/:cardId`
Review a card with SM-2 quality rating.

**Body:**
```json
{
  "quality": 5,
  "timeSpent": 4.5
}
```

**Quality Ratings:**
- `0` - Complete blackout (no recall)
- `1` - Incorrect but easy to recall correct answer
- `2` - Incorrect and hard to recall
- `3` - Correct but hard to recall
- `4` - Correct with hesitation
- `5` - Perfect recall

**Response:**
```json
{
  "cardId": 123,
  "character": "日",
  "easinessFactor": 2.6,
  "repetitions": 3,
  "interval": 10,
  "nextReviewAt": "2025-11-03T12:00:00Z",
  "isCorrect": true
}
```

#### POST `/api/flashcard-sessions/:sessionId/complete`
Complete the study session.

**Response:**
```json
{
  "sessionId": 42,
  "totalCards": 25,
  "correctAnswers": 20,
  "incorrectAnswers": 5,
  "accuracy": 80,
  "totalTime": 450,
  "cardsMastered": 8,
  "completedAt": "2025-10-24T12:15:00Z"
}
```

### 2. Study Statistics (3 endpoints)

#### GET `/api/flashcard-sessions/due-cards/:deckId`
Get due cards count for a deck.

**Response:**
```json
{
  "deckId": 1,
  "deckName": "JLPT N5 Kanji",
  "totalDue": 45,
  "newCards": 20,
  "dueToday": 30,
  "overdue": 15,
  "nextReviewAt": "2025-10-25T08:00:00Z"
}
```

#### GET `/api/flashcard-sessions/statistics/study?deckId=1&days=7`
Get study statistics with daily breakdown.

**Query Parameters:**
- `deckId` (optional): Filter by specific deck
- `days` (optional): Time period (default: 7)

**Response:**
```json
{
  "totalSessions": 15,
  "totalCardsReviewed": 250,
  "totalCorrect": 200,
  "totalIncorrect": 50,
  "accuracy": 80,
  "totalStudyTime": 3600,
  "avgSessionTime": 240,
  "cardsMastered": 45,
  "currentStreak": 7,
  "longestStreak": 14,
  "dailyStats": [
    {
      "date": "2025-10-24",
      "sessions": 2,
      "cardsReviewed": 35,
      "accuracy": 85,
      "studyTime": 420
    }
  ]
}
```

#### GET `/api/flashcard-sessions/statistics/deck/:deckId`
Get detailed deck statistics.

**Response:**
```json
{
  "deckId": 1,
  "deckName": "JLPT N5 Kanji",
  "totalCards": 200,
  "newCards": 50,
  "learningCards": 80,
  "reviewCards": 60,
  "masteredCards": 10,
  "dueCards": 45,
  "avgEasinessFactor": 2.5,
  "totalStudyTime": 7200,
  "lastStudiedAt": "2025-10-24T12:00:00Z"
}
```

## SM-2 Spaced Repetition Algorithm

### How It Works

The SM-2 algorithm calculates optimal review intervals based on:
1. **Easiness Factor (EF)**: Difficulty rating (1.3 - 2.5+)
2. **Repetitions**: Number of correct consecutive reviews
3. **Interval**: Days until next review
4. **Quality**: User's recall performance (0-5)

### Card Lifecycle

```
New Card (interval: 0)
  ↓ quality ≥ 3
First Review (interval: 1 day)
  ↓ quality ≥ 3
Second Review (interval: 6 days)
  ↓ quality ≥ 3
Third Review (interval: EF × 6 days)
  ↓ quality ≥ 3
Fourth Review (interval: EF × previous interval)
  ...
```

### Quality Impact

- **Quality 5 (Perfect)**: EF increases, longer intervals
- **Quality 4 (Hesitation)**: Slight EF increase
- **Quality 3 (Hard)**: EF maintained, standard intervals
- **Quality < 3**: EF decreases, card resets to interval 1

### Card Status Categories

- **New**: Never studied (interval: 0)
- **Learning**: interval < 21 days
- **Review**: 21 ≤ interval < 180 days
- **Mastered**: interval ≥ 180 days

## Database Schema

### FlashcardCard
```prisma
model FlashcardCard {
  id             Int       @id @default(autoincrement())
  deckId         Int
  kanjiId        Int
  front          String
  back           String
  difficulty     Int       @default(0)
  nextReviewAt   DateTime  @default(now())
  // SM-2 fields
  easinessFactor Float     @default(2.5)
  repetitions    Int       @default(0)
  interval       Int       @default(0)
  lastReviewedAt DateTime?
  // Relations
  deck         FlashcardDeck  @relation
  kanji        Kanji          @relation
  sessionCards SessionCard[]
}
```

### FlashcardStudySession
```prisma
model FlashcardStudySession {
  id               Int       @id @default(autoincrement())
  deckId           Int
  userId           Int
  totalCards       Int       @default(0)
  cardsReviewed    Int       @default(0)
  correctAnswers   Int       @default(0)
  incorrectAnswers Int       @default(0)
  totalTimeSpent   Int       @default(0)
  startedAt        DateTime  @default(now())
  completedAt      DateTime?
  // Relations
  deck         FlashcardDeck     @relation
  user         User              @relation
  sessionCards SessionCard[]
}
```

### SessionCard (Queue)
```prisma
model SessionCard {
  sessionId  Int
  cardId     Int
  orderIndex Int
  isNew      Boolean
  reviewedAt DateTime?
  quality    Int?
  timeSpent  Float?
  isCorrect  Boolean?
  // Relations
  session FlashcardStudySession @relation
  card    FlashcardCard         @relation
  @@id([sessionId, cardId])
}
```

## Implementation Details

### Service Layer

**Key Methods:**
- `startSession(userId, dto)` - Create session with card queue
- `getNextCard(sessionId, userId)` - Get next unreviewed card
- `reviewCard(sessionId, cardId, userId, dto)` - Apply SM-2 algorithm
- `completeSession(sessionId, userId)` - Finalize session
- `getDueCards(userId, dto)` - Count cards needing review
- `getStudyStatistics(userId, dto)` - Aggregate study data
- `getDeckStatistics(userId, deckId)` - Deck-specific metrics
- `calculateSM2(EF, reps, interval, quality)` - SM-2 core logic
- `calculateStreaks(userId)` - Study streak tracking
- `generateDailyStats(sessions, days)` - Daily breakdown

### Controller Layer

**Route Structure:**
- `/api/flashcard-sessions/*` - Session management
- `/api/flashcard-sessions/statistics/*` - Analytics
- `/api/flashcard-sessions/due-cards/:deckId` - Due cards

**Validation:**
- All DTOs use `class-validator`
- Quality rating: 0-5 (CardQuality enum)
- Max limits enforced (50 new, 100 review)

## Usage Example

### Complete Study Flow

```typescript
// 1. Start session
POST /api/flashcard-sessions/start
Body: { "deckId": 1, "maxNewCards": 10, "maxReviewCards": 20 }
→ sessionId: 42

// 2. Get first card
GET /api/flashcard-sessions/42/next-card
→ { cardId: 123, character: "日", ... }

// 3. Review card
POST /api/flashcard-sessions/42/review/123
Body: { "quality": 5, "timeSpent": 4.5 }
→ { nextReviewAt: "2025-11-03...", interval: 10 }

// 4. Repeat steps 2-3 for all cards

// 5. Complete session
POST /api/flashcard-sessions/42/complete
→ { accuracy: 80, cardsMastered: 8 }

// 6. Check next due cards
GET /api/flashcard-sessions/due-cards/1
→ { totalDue: 15, dueToday: 10 }
```

## Performance Optimization

### Database Queries
- Indexed on: `nextReviewAt`, `lastReviewedAt`, `startedAt`, `completedAt`
- Uses `Promise.all()` for parallel queries
- Efficient aggregations with proper filtering

### Recommended Caching
```typescript
// Due cards: 1 minute TTL (frequently changing)
// Study statistics: 5 minutes TTL
// Deck statistics: 10 minutes TTL
```

## Testing

### Manual Testing with Swagger

1. Start server: `npm run start:dev`
2. Navigate to: `http://localhost:3000/api`
3. Authenticate as user
4. Test each endpoint under "Flashcard Sessions" section

### Test Scenarios

**Scenario 1: New User First Session**
```bash
# 1. Start session with new deck
curl -X POST http://localhost:3000/api/flashcard-sessions/start \
  -H "Authorization: Bearer <token>" \
  -d '{"deckId":1,"maxNewCards":5}'

# 2. Review all cards with perfect quality
# 3. Complete session
# 4. Check deck statistics
```

**Scenario 2: Review Due Cards**
```bash
# 1. Check due cards
curl -X GET http://localhost:3000/api/flashcard-sessions/due-cards/1 \
  -H "Authorization: Bearer <token>"

# 2. Start review session
# 3. Review with varying quality (0-5)
# 4. Verify intervals adjust correctly
```

**Scenario 3: Study Streak Tracking**
```bash
# 1. Complete sessions on consecutive days
# 2. Check study statistics
curl -X GET "http://localhost:3000/api/flashcard-sessions/statistics/study?days=7" \
  -H "Authorization: Bearer <token>"

# 3. Verify currentStreak increments
```

## SM-2 Algorithm Details

### Easiness Factor Formula
```
EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
EF' = max(1.3, EF')
```

### Interval Calculation
```
If q < 3:
  repetitions = 0
  interval = 1
Else if repetitions == 1:
  interval = 1
Else if repetitions == 2:
  interval = 6
Else:
  interval = round(previous_interval * EF)
```

### Example Progression (Quality 5)

| Review | Quality | EF   | Reps | Interval | Next Date     |
|--------|---------|------|------|----------|---------------|
| 1      | 5       | 2.6  | 1    | 1 day    | Tomorrow      |
| 2      | 5       | 2.7  | 2    | 6 days   | +6 days       |
| 3      | 5       | 2.8  | 3    | 17 days  | +17 days      |
| 4      | 5       | 2.9  | 4    | 49 days  | +49 days      |
| 5      | 5       | 3.0  | 5    | 147 days | +147 days     |

## Error Handling

### Common Errors

**400 Bad Request**
- No cards available for study
- Invalid quality rating (must be 0-5)

**404 Not Found**
- Deck not found or access denied
- Session not found or already completed
- Card not found in session
- No more cards in session

**401 Unauthorized**
- Missing or invalid JWT token

## Future Enhancements

1. **Adaptive Difficulty**
   - Auto-adjust new card limit based on accuracy
   - Suggest optimal session length

2. **Learning Analytics**
   - Retention rate by card type
   - Difficulty heatmap
   - Prediction of mastery date

3. **Advanced Features**
   - Cram mode (ignore intervals)
   - Custom study (by JLPT level, tag, etc.)
   - Shared deck progress sync

4. **Gamification**
   - XP points for reviews
   - Achievements for streaks
   - Leaderboards

## Module Structure

```
src/modules/flashcard-session/
├── README.md                           # This file
├── flashcard-session.module.ts        # Module definition
├── flashcard-session.controller.ts    # REST API endpoints
├── flashcard-session.service.ts       # Business logic + SM-2
└── dto/
    └── flashcard-session.dto.ts       # Request/response DTOs
```

## Dependencies

- `@nestjs/common` - Core NestJS decorators
- `@nestjs/swagger` - API documentation
- `@prisma/client` - Database access
- `class-validator` - DTO validation
- `class-transformer` - Type transformation

## Related Modules

- **FlashcardDeckModule**: Deck CRUD operations
- **AuthModule**: JWT authentication
- **ProgressModule**: Cross-module progress tracking

## Status

✅ **Complete** - All 8 endpoints implemented and tested
- Session Management: 5 endpoints
- Study Statistics: 3 endpoints
- SM-2 Algorithm: Fully implemented
- Database Schema: Updated with migration
- Documentation: Complete

## References

- [SuperMemo SM-2 Algorithm](https://www.supermemo.com/en/archives1990-2015/english/ol/sm2)
- [Spaced Repetition Research](https://www.gwern.net/Spaced-repetition)
- [Anki Documentation](https://docs.ankiweb.net/)

## API Progress

**Total API:** 88% (95/108 endpoints)
- Auth: 13/13 ✅
- Admin: 13/13 ✅
- Flashcard Sessions: 8/8 ✅
- Kanji: 7/7 ✅
- Lists: 13/13 ✅
- Decks: 11/11 ✅
- Quiz: 16/16 ✅
- Progress: 0/8 ⏳
- Other: 14/19 ✅
