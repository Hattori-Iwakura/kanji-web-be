# Database Seed Data Documentation

## Overview
This document describes the seed data available in the database after running `npm run seed` or `yarn seed`.

## Seed Command
```bash
# Run seed
npm run seed
# or
yarn seed
```

## Seeded Data Summary

### ✅ Admin User
- **Account**: `admin`
- **Password**: `123456`
- **Email**: `admin@gmail.com`
- **Role**: ADMIN
- **Purpose**: System administration and testing

### ✅ Demo Users (3 users)
Testing accounts for development:

1. **user1**
   - Email: `user1@example.com`
   - Password: `password123`
   - Has sample progress data (15 kanji)

2. **user2**
   - Email: `user2@example.com`
   - Password: `password123`
   - Clean account for testing

3. **testuser**
   - Email: `test@example.com`
   - Password: `test123`
   - Clean account for testing

### ✅ Kanji (2,159 characters)
Complete kanji dataset from `prisma/data/kanji_hanviet.json` including:
- All JLPT levels (N5-N1)
- School grades (1-6)
- Readings (onyomi, kunyomi)
- Meanings (English)
- Stroke counts
- Radicals
- Frequency data

**Sample Queries:**
```sql
-- JLPT N5 kanji
SELECT * FROM "Kanji" WHERE jlpt = 5;

-- Grade 1 kanji
SELECT * FROM "Kanji" WHERE grade = 1;

-- High frequency kanji
SELECT * FROM "Kanji" WHERE frequency < 100 ORDER BY frequency;
```

### ✅ Achievements (16 achievements)
Gamification achievements across 7 categories:

#### Kanji Mastery (5 achievements)
1. 🌱 **First Step** - Learn your first kanji (5 points)
2. 📚 **Kanji Apprentice** - Learn 10 kanji (10 points)
3. 🎓 **Kanji Scholar** - Learn 50 kanji (25 points)
4. 👑 **Kanji Master** - Master 100 kanji (50 points)
5. ⭐ **Kanji Legend** - Master 500 kanji (100 points)

#### Study Streak (3 achievements)
6. 🔥 **Consistent Learner** - Study 3 days in a row (15 points)
7. 💪 **Week Warrior** - Study 7 days in a row (30 points)
8. 🏆 **Month Master** - Study 30 days in a row (100 points)

#### Quiz Master (2 achievements)
9. 🎯 **Quiz Beginner** - Complete first quiz (5 points)
10. 🎮 **Quiz Expert** - Complete 10 quizzes (20 points)

#### Perfectionist (2 achievements)
11. 💯 **Perfect Score** - Get 100% on a quiz (25 points)
12. ✨ **Perfectionist** - Get perfect scores on 5 quizzes (50 points)

#### Flashcard Pro (4 achievements)
13. 📝 **Deck Creator** - Create first flashcard deck (10 points)
14. 📚 **Deck Master** - Create 5 flashcard decks (25 points)
15. 🃏 **Flashcard Enthusiast** - Study 100 flashcards (30 points)
16. 💎 **Flashcard Devotee** - Study 500 flashcards (75 points)

**Total Possible Points**: 560

### ✅ Flashcard Decks (3 decks)
Sample flashcard decks created by admin:

1. **N5 Vocabulary**
   - Description: Essential vocabulary for JLPT N5
   - Cards: Empty (ready for testing)

2. **Hiragana Practice**
   - Description: Practice hiragana characters
   - Cards: Empty

3. **Common Phrases**
   - Description: Everyday Japanese phrases
   - Cards: Empty

**API Endpoints:**
```bash
GET /flashcard/decks      # List all decks
POST /flashcard/decks     # Create new deck
GET /flashcard/decks/:id  # Get deck details
```

### ✅ Quizzes (3 quizzes)
Sample quizzes with questions:

1. **JLPT N5 Practice Quiz**
   - Difficulty: BEGINNER
   - Questions: 5 multiple choice
   - Topics: N5 kanji meanings
   - Public: Yes

2. **Hiragana Reading Quiz**
   - Difficulty: BEGINNER
   - Questions: 5 multiple choice
   - Topics: N5 kanji meanings
   - Public: Yes

3. **Daily Kanji Challenge**
   - Difficulty: INTERMEDIATE
   - Questions: 5 multiple choice
   - Topics: N5 kanji meanings
   - Public: Yes

**Sample Question Format:**
```json
{
  "type": "MULTIPLE_CHOICE",
  "question": "What does 日 mean?",
  "options": {
    "A": "sun, day",
    "B": "incorrect option 1",
    "C": "incorrect option 2",
    "D": "incorrect option 3"
  },
  "correct_answer": "sun, day",
  "points": 1
}
```

### ✅ Sample Progress Data
**user1** has progress for 15 kanji:
- 5 kanji with status "learning"
- 5 kanji with status "known"
- 5 kanji with status "mastered"
- All from JLPT N5 level

## Testing Scenarios

### 1. Login Testing
```bash
# Admin login
POST /auth/login
{
  "account": "admin",
  "password": "123456"
}

# User login
POST /auth/login
{
  "account": "user1",
  "password": "password123"
}
```

### 2. Achievement Testing
```bash
# View all achievements
GET /achievements
Authorization: Bearer <token>

# View user progress
GET /achievements/user
Authorization: Bearer <token>

# Check for new achievements
POST /achievements/check
Authorization: Bearer <token>
```

### 3. Quiz Testing
```bash
# List public quizzes
GET /quiz?is_public=true

# Start quiz attempt
POST /quiz/:id/attempts
Authorization: Bearer <token>

# Submit answers
POST /quiz/attempts/:attemptId/submit
Authorization: Bearer <token>
Body: { "answers": [...] }
```

### 4. Flashcard Testing
```bash
# List decks
GET /flashcard/decks
Authorization: Bearer <token>

# Create deck
POST /flashcard/decks
Authorization: Bearer <token>
Body: {
  "name": "My Deck",
  "description": "Test deck"
}

# Add cards to deck
POST /flashcard/decks/:deckId/cards
Authorization: Bearer <token>
```

### 5. Progress Testing
```bash
# View kanji progress
GET /kanji/progress
Authorization: Bearer <user1_token>

# Should return 15 kanji with different statuses

# Update progress
PUT /kanji/:id/progress
Authorization: Bearer <token>
Body: {
  "status": "known"
}
```

## Resetting Seed Data

To reset and re-seed the database:

```bash
# Option 1: Reset migration (CAUTION: Deletes all data)
npx prisma migrate reset

# Option 2: Manual reset
# 1. Drop database
# 2. Create database
# 3. Run migrations
npx prisma migrate deploy

# 4. Run seed
npm run seed
```

## Adding Custom Seed Data

To add your own seed data, edit `prisma/seed.ts`:

```typescript
async function customSeed() {
  // Your custom seed logic here
  const customData = await prisma.yourModel.create({
    data: { ... }
  });
}

// Add to main()
async function main() {
  await adminCreate();
  await kanjiSeed();
  await achievementsSeed();
  await customSeed(); // Add here
}
```

## Seed Data Statistics

| Category | Count | Notes |
|----------|-------|-------|
| **Users** | 4 | 1 admin + 3 demo users |
| **Kanji** | 2,159 | Complete dataset |
| **Achievements** | 16 | Across 7 categories |
| **Flashcard Decks** | 3 | Empty decks for testing |
| **Quizzes** | 3 | With 5 questions each |
| **Quiz Questions** | 15 | Multiple choice format |
| **Progress Records** | 15 | For user1 only |

## Environment Variables

Ensure these are set in `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/kanji_db"
```

## Troubleshooting

### Seed Fails with "Already Exists"
This is normal - upsert operations will skip existing records.

### Kanji File Not Found
Ensure `prisma/data/kanji_hanviet.json` exists:
```bash
ls prisma/data/kanji_hanviet.json
```

### Foreign Key Violations
Run migrations first:
```bash
npx prisma migrate deploy
```

### Slow Seed Performance
The kanji import may take 30-60 seconds for 2,000+ records. This is normal.

## Production Considerations

⚠️ **WARNING**: Do not run seed in production with these test accounts!

For production:
1. Remove demo users from seed
2. Use strong passwords for admin
3. Consider separate seed files for production vs development
4. Use environment variables to control seed behavior

```typescript
// Example production-safe seed
async function main() {
  if (process.env.NODE_ENV === 'production') {
    await adminCreate(); // Only create admin
    await kanjiSeed();   // Only import kanji
    return;
  }
  
  // Development seeds
  await demoUsersSeed();
  await flashcardDecksSeed();
  // etc...
}
```

## Next Steps

After seeding:
1. ✅ Test login with demo accounts
2. ✅ Verify kanji data loaded
3. ✅ Test achievement system
4. ✅ Create custom quiz
5. ✅ Test flashcard workflow
6. ✅ Monitor progress tracking

## API Testing Collection

Import this into Postman/Insomnia:

```json
{
  "name": "Kanji App Seed Data Tests",
  "requests": [
    {
      "name": "Login as Admin",
      "method": "POST",
      "url": "{{base_url}}/auth/login",
      "body": {
        "account": "admin",
        "password": "123456"
      }
    },
    {
      "name": "Login as User1",
      "method": "POST",
      "url": "{{base_url}}/auth/login",
      "body": {
        "account": "user1",
        "password": "password123"
      }
    },
    {
      "name": "Get User1 Progress",
      "method": "GET",
      "url": "{{base_url}}/kanji/progress",
      "headers": {
        "Authorization": "Bearer {{user1_token}}"
      }
    }
  ]
}
```

---

**Last Updated**: 2025-10-18
**Version**: 1.0.0
