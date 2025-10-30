# Progress Module

## Overview

The Progress Module provides comprehensive user progress tracking, analytics, and gamification features for the Kanji learning platform. It aggregates data from flashcard sessions, quiz attempts, and user activities to provide insights into learning patterns, achievements, and competitive rankings.

## Features

### 1. **Progress Overview**
- Complete user snapshot with all key metrics
- Study streak tracking (current and longest)
- Total study time across all activities
- Accuracy metrics for flashcards and quizzes
- Kanji mastery count
- XP/leveling system
- Achievement count

### 2. **Flashcard Analytics**
- Card status breakdown (new, learning, review, mastered)
- Session statistics with accuracy tracking
- Average easiness factor from SM-2 algorithm
- Study time and session duration analysis
- Reviews per day calculation
- Filter by period and deck

### 3. **Quiz Analytics**
- Quiz attempts and completion tracking
- Question statistics (correct/incorrect)
- Accuracy and scoring analysis
- Best score tracking
- Time spent analysis
- Breakdown by difficulty level
- Filter by period and quiz

### 4. **Streak System**
- Current and longest streak tracking
- Active streak status
- Complete history of study dates
- Weekly and monthly study day counts
- Study consistency monitoring

### 5. **Leaderboard System**
- Multiple leaderboard types:
  - XP-based rankings
  - Streak-based rankings
  - Accuracy-based rankings
  - Cards studied rankings
- Current user rank and position
- Top N users display (configurable limit)
- Period-based filtering
- User profile integration (avatar, username)

### 6. **Achievement System**
- 13 predefined achievements across 4 categories:
  - **Flashcard**: First Steps, Dedicated Learner, Flashcard Master
  - **Quiz**: Quiz Starter, Quiz Expert, Quiz Legend
  - **Mastery**: Kanji Beginner, Kanji Scholar, Kanji Sage
  - **Streak**: Getting Started, Week Warrior, Consistency King, Unstoppable
- Progress tracking (0-100%)
- XP rewards for unlocking achievements
- Recently unlocked achievements feed
- Unlock timestamp tracking

### 7. **Chart Data**
- Multi-series time-based visualization
- Data series:
  - Study time (seconds)
  - Cards reviewed
  - Quiz attempts
  - Accuracy (percentage)
  - XP earned
- Configurable time points (1-365 days)
- Synchronized date labels

### 8. **Study Time Analytics**
- Total time breakdown (flashcard vs quiz)
- Average daily time
- Average session time
- Productivity insights:
  - Most productive day of week
  - Most productive hour of day
- Daily breakdown with detailed metrics

## API Endpoints

### 1. Get Progress Overview

```http
GET /progress/overview
```

**Authentication:** Required (JWT)

**Response:**
```json
{
  "userId": 1,
  "username": "john_doe",
  "currentStreak": 7,
  "longestStreak": 15,
  "totalStudyTime": 18000,
  "totalFlashcardSessions": 45,
  "totalQuizAttempts": 20,
  "flashcardAccuracy": 85,
  "quizAccuracy": 78,
  "kanjiMastered": 120,
  "achievements": 5,
  "level": 12,
  "xp": 14500,
  "lastActive": "2024-01-20T10:30:00Z"
}
```

### 2. Get Flashcard Progress

```http
GET /progress/flashcard?period=week&deckId=1
```

**Authentication:** Required (JWT)

**Query Parameters:**
- `period` (optional): `day` | `week` | `month` | `year` | `all` (default: `week`)
- `deckId` (optional): Filter by specific deck

**Response:**
```json
{
  "totalCardsStudied": 150,
  "cardsMastered": 45,
  "cardsInReview": 60,
  "cardsLearning": 35,
  "newCards": 10,
  "totalSessions": 25,
  "correctReviews": 320,
  "incorrectReviews": 80,
  "accuracy": 80,
  "avgEasinessFactor": 2.35,
  "totalStudyTime": 7200,
  "avgSessionTime": 288,
  "reviewsPerDay": 57.1
}
```

### 3. Get Quiz Progress

```http
GET /progress/quiz?period=month&quizId=5
```

**Authentication:** Required (JWT)

**Query Parameters:**
- `period` (optional): `day` | `week` | `month` | `year` | `all` (default: `week`)
- `quizId` (optional): Filter by specific quiz

**Response:**
```json
{
  "totalAttempts": 15,
  "quizzesCompleted": 8,
  "totalQuestions": 150,
  "correctAnswers": 120,
  "incorrectAnswers": 30,
  "accuracy": 80,
  "avgScore": 78,
  "bestScore": 95,
  "totalTime": 3600,
  "avgTimePerQuiz": 240,
  "byDifficulty": [
    { "difficulty": "easy", "attempts": 5, "accuracy": 90 },
    { "difficulty": "medium", "attempts": 7, "accuracy": 78 },
    { "difficulty": "hard", "attempts": 3, "accuracy": 65 }
  ]
}
```

### 4. Get Streak Information

```http
GET /progress/streak
```

**Authentication:** Required (JWT)

**Response:**
```json
{
  "currentStreak": 7,
  "longestStreak": 15,
  "isActive": true,
  "lastStudyDate": "2024-01-20T00:00:00Z",
  "streakDates": [
    "2024-01-20T00:00:00Z",
    "2024-01-19T00:00:00Z",
    "2024-01-18T00:00:00Z"
  ],
  "totalStudyDays": 45,
  "daysThisWeek": 5,
  "daysThisMonth": 18
}
```

### 5. Get Leaderboard

```http
GET /progress/leaderboard?type=xp&period=week&limit=10
```

**Authentication:** Required (JWT)

**Query Parameters:**
- `type` (optional): `xp` | `streak` | `accuracy` | `cards` (default: `xp`)
- `period` (optional): `day` | `week` | `month` | `year` | `all` (default: `week`)
- `limit` (optional): Number of entries (1-100, default: 10)

**Response:**
```json
{
  "type": "xp",
  "period": "week",
  "entries": [
    {
      "rank": 1,
      "userId": 5,
      "username": "kanji_master",
      "avatar": "https://example.com/avatar5.jpg",
      "score": 2500,
      "xp": 2500,
      "level": 15,
      "streak": 12,
      "isCurrentUser": false
    },
    {
      "rank": 2,
      "userId": 1,
      "username": "john_doe",
      "avatar": "https://example.com/avatar1.jpg",
      "score": 2100,
      "xp": 2100,
      "level": 14,
      "streak": 7,
      "isCurrentUser": true
    }
  ],
  "currentUserRank": 2,
  "currentUser": {
    "rank": 2,
    "userId": 1,
    "username": "john_doe",
    "avatar": "https://example.com/avatar1.jpg",
    "score": 2100,
    "xp": 2100,
    "level": 14,
    "streak": 7,
    "isCurrentUser": true
  },
  "totalUsers": 50
}
```

### 6. Get Achievements

```http
GET /progress/achievements
```

**Authentication:** Required (JWT)

**Response:**
```json
{
  "achievements": [
    {
      "id": "flashcard_10",
      "name": "First Steps",
      "description": "Complete 10 flashcard sessions",
      "icon": "🎴",
      "category": "flashcard",
      "unlocked": true,
      "unlockedAt": "2024-01-15T10:00:00Z",
      "progress": 100,
      "currentValue": 45,
      "targetValue": 10,
      "xpReward": 100
    },
    {
      "id": "flashcard_50",
      "name": "Dedicated Learner",
      "description": "Complete 50 flashcard sessions",
      "icon": "📚",
      "category": "flashcard",
      "unlocked": false,
      "progress": 90,
      "currentValue": 45,
      "targetValue": 50,
      "xpReward": 500
    }
  ],
  "totalUnlocked": 5,
  "totalAvailable": 13,
  "completionPercentage": 38,
  "recentlyUnlocked": [
    {
      "id": "streak_7",
      "name": "Week Warrior",
      "description": "Study for 7 days in a row",
      "icon": "💪",
      "category": "streak",
      "unlocked": true,
      "unlockedAt": "2024-01-20T08:00:00Z",
      "progress": 100,
      "currentValue": 7,
      "targetValue": 7,
      "xpReward": 150
    }
  ]
}
```

### 7. Get Chart Data

```http
GET /progress/chart-data?period=week&points=7
```

**Authentication:** Required (JWT)

**Query Parameters:**
- `period` (optional): `day` | `week` | `month` | `year` | `all` (default: `week`)
- `points` (optional): Number of data points (1-365, default: 7)

**Response:**
```json
{
  "labels": [
    "2024-01-14",
    "2024-01-15",
    "2024-01-16",
    "2024-01-17",
    "2024-01-18",
    "2024-01-19",
    "2024-01-20"
  ],
  "studyTime": [1200, 1500, 1800, 1400, 1600, 1700, 1900],
  "cardsReviewed": [30, 35, 40, 32, 38, 42, 45],
  "quizAttempts": [2, 3, 2, 4, 3, 2, 3],
  "accuracy": [82, 85, 78, 88, 83, 86, 90],
  "xpEarned": [350, 450, 400, 500, 420, 480, 550]
}
```

### 8. Get Study Time

```http
GET /progress/study-time?period=week
```

**Authentication:** Required (JWT)

**Query Parameters:**
- `period` (optional): `day` | `week` | `month` | `year` | `all` (default: `week`)

**Response:**
```json
{
  "totalTime": 12600,
  "flashcardTime": 8400,
  "quizTime": 4200,
  "avgDailyTime": 1800,
  "totalSessions": 30,
  "avgSessionTime": 420,
  "mostProductiveDay": "Wednesday",
  "mostProductiveHour": 19,
  "dailyBreakdown": [
    {
      "date": "2024-01-14",
      "totalTime": 1200,
      "flashcardTime": 800,
      "quizTime": 400,
      "sessions": 3
    },
    {
      "date": "2024-01-15",
      "totalTime": 1500,
      "flashcardTime": 1000,
      "quizTime": 500,
      "sessions": 4
    }
  ]
}
```

## XP and Leveling System

### XP Calculation

XP is earned through various activities:

```typescript
XP = (flashcardSessions × 50) + 
     (quizAttempts × 100) + 
     (kanjiMastered × 200) + 
     (currentStreak × 25)
```

**Examples:**
- Complete 1 flashcard session: +50 XP
- Complete 1 quiz: +100 XP
- Master 1 kanji: +200 XP
- Maintain 10-day streak: +250 XP

### Level Calculation

Level is calculated from total XP:

```typescript
Level = floor(sqrt(XP / 100)) + 1
```

**Level Thresholds:**
- Level 1: 0 XP
- Level 5: 1,600 XP
- Level 10: 8,100 XP
- Level 15: 19,600 XP
- Level 20: 36,100 XP

## Achievement System

### Categories

1. **Flashcard Achievements**
   - Focus on session completion
   - Rewards: 100-1000 XP

2. **Quiz Achievements**
   - Focus on quiz completion
   - Rewards: 100-1000 XP

3. **Mastery Achievements**
   - Focus on kanji mastery (interval ≥ 180 days)
   - Rewards: 200-2000 XP

4. **Streak Achievements**
   - Focus on study consistency
   - Rewards: 50-2000 XP

### Achievement Definitions

| ID | Name | Description | Target | XP Reward |
|----|------|-------------|--------|-----------|
| flashcard_10 | First Steps | Complete 10 flashcard sessions | 10 | 100 |
| flashcard_50 | Dedicated Learner | Complete 50 flashcard sessions | 50 | 500 |
| flashcard_100 | Flashcard Master | Complete 100 flashcard sessions | 100 | 1000 |
| quiz_10 | Quiz Starter | Complete 10 quizzes | 10 | 100 |
| quiz_50 | Quiz Expert | Complete 50 quizzes | 50 | 500 |
| quiz_100 | Quiz Legend | Complete 100 quizzes | 100 | 1000 |
| kanji_10 | Kanji Beginner | Master 10 kanji | 10 | 200 |
| kanji_50 | Kanji Scholar | Master 50 kanji | 50 | 1000 |
| kanji_100 | Kanji Sage | Master 100 kanji | 100 | 2000 |
| streak_3 | Getting Started | Study for 3 days in a row | 3 | 50 |
| streak_7 | Week Warrior | Study for 7 days in a row | 7 | 150 |
| streak_30 | Consistency King | Study for 30 days in a row | 30 | 500 |
| streak_100 | Unstoppable | Study for 100 days in a row | 100 | 2000 |

## Streak Calculation

### Logic

1. **Study Date Extraction**: Unique dates from flashcard sessions and quiz attempts
2. **Active Check**: Last study date is today or yesterday
3. **Current Streak**: Consecutive days from today backward (if active)
4. **Longest Streak**: Maximum consecutive days in history

### Examples

**Scenario 1: Active Streak**
- Study dates: Jan 20, Jan 19, Jan 18, Jan 17
- Today: Jan 20
- Current streak: 4 days
- Is active: true

**Scenario 2: Broken Streak**
- Study dates: Jan 20, Jan 19, Jan 16, Jan 15
- Today: Jan 20
- Current streak: 2 days (Jan 19-20 only, broken by Jan 17-18 gap)
- Is active: true

**Scenario 3: Inactive Streak**
- Study dates: Jan 18, Jan 17, Jan 16
- Today: Jan 20
- Current streak: 0 days
- Is active: false

## Card Status Definitions

Based on SM-2 algorithm intervals:

- **New**: Never reviewed (`lastReviewedAt` is null)
- **Learning**: Reviewed but interval < 21 days
- **Review**: Interval 21-179 days
- **Mastered**: Interval ≥ 180 days

## Implementation Details

### Service Methods

```typescript
class ProgressService {
  // Core endpoints
  getProgressOverview(userId: number): Promise<ProgressOverviewDto>
  getFlashcardProgress(userId: number, query: FlashcardProgressQueryDto): Promise<FlashcardProgressDto>
  getQuizProgress(userId: number, query: QuizProgressQueryDto): Promise<QuizProgressDto>
  getStreaks(userId: number): Promise<StreakDto>
  getLeaderboard(userId: number, query: LeaderboardQueryDto): Promise<LeaderboardDto>
  getAchievements(userId: number): Promise<AchievementsDto>
  getChartData(userId: number, query: ChartDataQueryDto): Promise<ChartDataDto>
  getStudyTime(userId: number, query: StudyTimeQueryDto): Promise<StudyTimeDto>

  // Helper methods
  private calculateStreaks(userId: number): Promise<{currentStreak, longestStreak}>
  private calculateStreaksDetailed(userId: number): Promise<StreakDto>
  private calculateXP(sessions, quizzes, mastered, streak): number
  private calculateLevel(xp: number): number
  private getStartDate(period: ProgressPeriod): Date
  private getDaysInPeriod(period: ProgressPeriod): number
  private generateDailyStudyTimeBreakdown(...): Promise<DailyBreakdown[]>
  private getAchievementDefinitions(): Achievement[]
  private getAchievementCurrentValue(id, overview): number
}
```

### Database Queries

**Tables Used:**
- `User`: Basic user info (username, avatar)
- `FlashcardStudySession`: Session data with time and accuracy
- `SessionCard`: Individual card reviews with quality ratings
- `FlashcardCard`: Card status with SM-2 fields (EF, interval, repetitions)
- `QuizAttempt`: Quiz completion with scores and time
- `FlashcardDeck`: Deck ownership for filtering

**Optimization Strategies:**
1. **Parallel Queries**: Use `Promise.all()` for independent data fetching
2. **Aggregation**: Use Prisma aggregations for counts and sums
3. **Indexing**: Ensure indexes on `userId`, `createdAt`, `deckId`, `quizId`
4. **Caching**: Consider caching leaderboards and expensive queries (5-10 min TTL)

### Performance Considerations

**Expensive Operations:**
1. **Leaderboard**: Queries all users and calculates stats
   - Solution: Cache results, limit to top N
   - Consider background job for pre-calculation

2. **Chart Data**: Multiple daily queries
   - Solution: Limit data points, cache results

3. **Study Time Breakdown**: Daily aggregations
   - Solution: Generate only for requested period

**Recommended Caching Strategy:**
```typescript
// High traffic, infrequent changes
Leaderboard: 5 minutes TTL
Achievements: 10 minutes TTL
Chart Data: 10 minutes TTL

// User-specific, frequent changes
Progress Overview: No cache (or 1 minute)
Flashcard Progress: No cache (or 1 minute)
Study Time: 5 minutes TTL
```

## Testing

### Manual Testing with Swagger

1. Navigate to `/api` (Swagger UI)
2. Authenticate with JWT token
3. Test each endpoint:
   - Overview: No parameters
   - Flashcard: Try different periods and deckId
   - Quiz: Try different periods and quizId
   - Streak: No parameters
   - Leaderboard: Try different types (xp, streak, accuracy, cards)
   - Achievements: No parameters
   - Chart Data: Try different points (7, 30, 90)
   - Study Time: Try different periods

### Test Scenarios

**Scenario 1: New User**
- Should show 0 for all metrics
- Current streak: 0
- No achievements unlocked
- Level 1, 0 XP

**Scenario 2: Active User**
- Complete 5 flashcard sessions
- Complete 2 quizzes
- Check progress overview (should show XP, level increases)
- Check flashcard progress (should show cards studied)
- Check achievements (should show progress toward flashcard_10)

**Scenario 3: Streak Building**
- Study today and yesterday
- Check streak (should be 2, active: true)
- Skip a day, study again
- Check streak (should reset to 1)

**Scenario 4: Leaderboard**
- Multiple users with different activities
- Check XP leaderboard (sorted by total XP)
- Check streak leaderboard (sorted by current streak)
- Check accuracy leaderboard (sorted by overall accuracy)
- Verify current user rank and position

## Integration

### Frontend Integration

```typescript
// Example: Fetch progress overview
const response = await fetch('/api/progress/overview', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const overview = await response.json();

// Example: Fetch leaderboard
const leaderboard = await fetch(
  '/api/progress/leaderboard?type=xp&limit=10',
  { headers: { 'Authorization': `Bearer ${token}` } }
).then(r => r.json());

// Example: Fetch chart data for last 7 days
const chartData = await fetch(
  '/api/progress/chart-data?period=week&points=7',
  { headers: { 'Authorization': `Bearer ${token}` } }
).then(r => r.json());
```

### Mobile App Integration

```dart
// Example: Progress overview
class ProgressRepository {
  Future<ProgressOverview> getOverview() async {
    final response = await dio.get('/progress/overview');
    return ProgressOverview.fromJson(response.data);
  }
  
  Future<Leaderboard> getLeaderboard({
    String type = 'xp',
    int limit = 10,
  }) async {
    final response = await dio.get('/progress/leaderboard',
      queryParameters: {'type': type, 'limit': limit});
    return Leaderboard.fromJson(response.data);
  }
}
```

## Future Enhancements

### Planned Features
1. **Custom Achievements**: Allow users to create personal goals
2. **Social Features**: Share achievements, compare with friends
3. **Badges**: Visual badges for achievement milestones
4. **Challenges**: Time-limited challenges with special rewards
5. **Weekly Goals**: Set and track weekly study targets
6. **Progress Reports**: Weekly/monthly email summaries
7. **Study Recommendations**: AI-based suggestions based on progress

### Database Enhancements
1. **Achievement Tracking Table**: Store unlock timestamps properly
2. **User Profile Extension**: Add XP, level, achievements count to User table
3. **Study Goals Table**: Track user-set goals and progress
4. **Badge System**: Separate table for badge definitions and user badges

### Performance Improvements
1. **Materialized Views**: Pre-calculate expensive leaderboard queries
2. **Background Jobs**: Calculate daily statistics in background
3. **Redis Caching**: Cache frequently accessed data
4. **Query Optimization**: Add compound indexes for common queries

## Conclusion

The Progress Module provides comprehensive analytics and gamification features that drive user engagement and motivation. It integrates seamlessly with the SM-2 flashcard system and quiz functionality to provide meaningful insights into learning patterns and progress.

All endpoints are authenticated, well-documented with Swagger, and designed for optimal performance with proper database queries and potential caching strategies.
