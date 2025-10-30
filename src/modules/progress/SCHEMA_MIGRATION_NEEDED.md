# Progress Module - Schema Migration Needed

## Issue

The Progress Module implementation requires additional fields in the `QuizAttempt` model that don't currently exist in the schema. The current implementation cannot accurately calculate quiz statistics without these fields.

## Required Schema Changes

### Current Schema (schema.prisma)

```prisma
model QuizAttempt {
  id        Int      @id @default(autoincrement())
  userId    Int
  quizId    Int
  score     Int      @default(0)
  maxScore  Int      @default(0)
  completed Boolean  @default(false)
  createdAt DateTime @default(now())

  user    User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  quiz    Quiz         @relation(fields: [quizId], references: [id], onDelete: Cascade)
  answers QuizAnswer[]

  @@index([userId])
  @@index([quizId])
}
```

### Recommended Schema Updates

```prisma
model QuizAttempt {
  id             Int      @id @default(autoincrement())
  userId         Int
  quizId         Int
  score          Int      @default(0)
  maxScore       Int      @default(0)
  completed      Boolean  @default(false)
  createdAt      DateTime @default(now())
  
  // NEW FIELDS FOR PROGRESS TRACKING
  correctAnswers Int      @default(0)  // Count of correct answers
  totalQuestions Int      @default(0)  // Total questions attempted
  timeSpent      Int      @default(0)  // Time spent in seconds
  
  user    User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  quiz    Quiz         @relation(fields: [quizId], references: [id], onDelete: Cascade)
  answers QuizAnswer[]

  @@index([userId])
  @@index([quizId])
  @@index([createdAt])  // For time-based queries
}
```

### User Model Updates

Current User model uses `name` field, but Progress Module expects `username` and `avatar`:

```prisma
model User {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  passwordHash String
  name         String?
  role         UserRole @default(USER)
  profileImage String?  // This is avatar
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  // Consider adding:
  // username     String?  @unique  // For display name (optional, can use name)
  // xp           Int      @default(0)  // For gamification
  // level        Int      @default(1)  // For gamification
  
  // ... relations
}
```

## Migration Steps

1. **Add fields to QuizAttempt**:
   ```bash
   # Edit prisma/schema.prisma to add the new fields above
   npx prisma migrate dev --name add_quiz_attempt_tracking_fields
   ```

2. **Backfill existing data** (if needed):
   ```typescript
   // Create a migration script to calculate values from QuizAnswer
   const attempts = await prisma.quizAttempt.findMany({
     include: { answers: true }
   });
   
   for (const attempt of attempts) {
     const correctCount = attempt.answers.filter(a => a.isCorrect).length;
     const totalCount = attempt.answers.length;
     
     await prisma.quizAttempt.update({
       where: { id: attempt.id },
       data: {
         correctAnswers: correctCount,
         totalQuestions: totalCount,
         // timeSpent remains 0 for historical data
       }
     });
   }
   ```

3. **Update Quiz submission logic** to populate these fields when creating QuizAttempt

## Workaround (Current Implementation)

Until the schema is updated, the Progress Module will:

1. **For Quiz Statistics**: Calculate from `QuizAnswer` relations (less efficient but accurate)
   ```typescript
   const quizAttempts = await prisma.quizAttempt.findMany({
     include: { answers: true }
   });
   const correctAnswers = quizAttempts.reduce(
     (sum, a) => sum + a.answers.filter(ans => ans.isCorrect).length, 
     0
   );
   ```

2. **For User Display**: Use `name` field instead of `username`

3. **For Avatar**: Use `profileImage` field

4. **For Time Tracking**: Will show 0 until schema is updated

## Impact

Without these schema updates:
- ✅ Core functionality works but with performance impact
- ⚠️ Quiz time tracking unavailable (shows 0)
- ⚠️ Less efficient queries (need to include answers relation)
- ⚠️ Username displays as name/email
- ⚠️ Avatar uses profileImage field

With schema updates:
- ✅ Optimal performance
- ✅ Complete time tracking
- ✅ Efficient aggregation queries
- ✅ Better data consistency

## Recommendation

**Priority**: HIGH - Should be done before production deployment

**Effort**: LOW - Simple schema migration

**Risk**: LOW - Additive changes only, no breaking changes

Execute the migration as soon as possible to enable full Progress Module functionality.
