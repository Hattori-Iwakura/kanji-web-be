# Progress Module - Quick Start (Current Schema)

## Current Status

⚠️ **The Progress Module is partially functional with the current database schema.**

### Working Features ✅
- ✅ Flashcard progress tracking (fully functional)
- ✅ Streak calculation (fully functional)
- ✅ XP and leveling system (fully functional)
- ✅ Achievement system (fully functional)
- ✅ Flashcard chart data (fully functional)
- ✅ Flashcard study time tracking (fully functional)

### Limited Features ⚠️
- ⚠️ Quiz progress tracking (limited - no time/question details)
- ⚠️ Leaderboard (works but quiz stats show 0)
- ⚠️ Chart data (quiz metrics show 0)

### Not Available ❌
- ❌ Quiz time spent tracking (schema field missing)
- ❌ Detailed quiz question statistics (needs migration)

## Running the Module

The module will compile and run, but some quiz-related statistics will return 0 or incomplete data.

### Test Endpoints

1. **Progress Overview** (Works with flashcard data only)
   ```bash
   GET /api/progress/overview
   Authorization: Bearer YOUR_TOKEN
   ```

2. **Flashcard Progress** (Fully functional)
   ```bash
   GET /api/progress/flashcard?period=week
   Authorization: Bearer YOUR_TOKEN
   ```

3. **Quiz Progress** (Limited - returns 0 for time)
   ```bash
   GET /api/progress/quiz?period=week
   Authorization: Bearer YOUR_TOKEN
   ```

4. **Streak** (Fully functional)
   ```bash
   GET /api/progress/streak
   Authorization: Bearer YOUR_TOKEN
   ```

5. **Achievements** (Fully functional)
   ```bash
   GET /api/progress/achievements
   Authorization: Bearer YOUR_TOKEN
   ```

## Required Schema Migration

See `SCHEMA_MIGRATION_NEEDED.md` for full details on required schema changes.

### Quick Migration Command

```bash
# 1. Update schema.prisma with new fields
# 2. Run migration
npx prisma migrate dev --name add_quiz_tracking_fields

# 3. Generate Prisma client
npx prisma generate
```

### Required Schema Changes Summary

**QuizAttempt model** needs:
- `correctAnswers Int @default(0)`
- `totalQuestions Int @default(0)`
- `timeSpent Int @default(0)`

**User model** needs (optional improvements):
- Use `name` as username (current workaround)
- `profileImage` as avatar (current workaround)

## Workarounds in Current Code

The service uses these workarounds:
1. Username = `name ?? email.split('@')[0]`
2. Avatar = `profileImage`
3. Quiz time = 0 (not available)
4. Quiz stats calculated from `QuizAnswer` relations (slower but accurate)

## Next Steps

1. ✅ Module is integrated and endpoints are available
2. ⏳ Run schema migration for full functionality
3. ⏳ Update quiz submission logic to populate new fields
4. ⏳ Backfill historical data (if needed)

## Testing

Start the server:
```bash
yarn start:dev
```

Access Swagger UI:
```
http://localhost:3000/api
```

Test the 8 Progress endpoints under the "Progress" section.
