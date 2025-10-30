# Integration Test Infrastructure

This directory contains helper utilities for integration testing.

## Overview

The test infrastructure provides:
- **Test Setup**: Application initialization and configuration
- **Database Helpers**: Database cleanup, seeding, and transaction management
- **Test Data Factories**: Generate test data for all entities
- **Auth Helpers**: User authentication and authorization utilities

## Usage

### Basic Test Structure

```typescript
import { INestApplication } from '@nestjs/common';
import { setupTestApp, closeTestApp, getPrismaService } from './helpers/test-setup';
import { TestDataFactory } from './helpers/test-data-factory';
import { createAndLoginUser } from './helpers/auth-helper';
import { createDatabaseHelper } from './helpers/database-helper';

describe('My Module (e2e)', () => {
  let app: INestApplication;
  let factory: TestDataFactory;
  let dbHelper: DatabaseHelper;

  beforeAll(async () => {
    app = await setupTestApp();
    const prisma = getPrismaService(app);
    factory = new TestDataFactory(prisma);
    dbHelper = createDatabaseHelper(app);
  });

  beforeEach(async () => {
    await dbHelper.cleanup();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe('Test Suite', () => {
    it('should do something', async () => {
      // Create test user
      const user = await factory.users.createUser();
      
      // Login
      const auth = await createAndLoginUser(app, {
        email: user.email,
        password: 'Test123!@#',
      });
      
      // Make authenticated request
      const response = await request(app.getHttpServer())
        .get('/endpoint')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .expect(200);
    });
  });
});
```

## Files

### test-setup.ts

Provides application setup and teardown utilities:

- `setupTestApp()` - Initialize NestJS application with all modules
- `closeTestApp(app)` - Close application and database connections
- `getPrismaService(app)` - Get Prisma service instance
- `cleanupDatabase(prisma)` - Remove all test data
- `resetSequences(prisma)` - Reset database ID sequences

### test-data-factory.ts

Factory classes for creating test data:

```typescript
// Create users
const user = await factory.users.createUser({
  email: 'test@example.com',
  password: 'Test123!@#',
  name: 'Test User',
});

const admin = await factory.users.createAdminUser();

// Create kanji
const kanji = await factory.kanji.createKanji({
  character: '日',
  meaning: 'day, sun',
  jlptLevel: 5,
});

const multipleKanji = await factory.kanji.createMultipleKanji(10);

// Create kanji list
const list = await factory.kanjiLists.createKanjiList(user.id, {
  name: 'My Test List',
  jlptLevel: 5,
});

await factory.kanjiLists.addKanjiToList(list.id, kanji.id, 1);

// Create flashcard deck
const deck = await factory.flashcardDecks.createDeck(user.id, {
  name: 'Test Deck',
});

await factory.flashcardDecks.addCardToDeck(deck.id, kanji.id);

// Create quiz
const quiz = await factory.quizzes.createQuiz(user.id, {
  title: 'Test Quiz',
  difficulty: 'EASY',
});

await factory.quizzes.addQuestion(quiz.id, {
  questionText: 'What is this kanji?',
  questionType: 'MULTIPLE_CHOICE',
  options: ['day', 'night', 'month'],
  correctAnswer: 'day',
});

// Create category
const category = await factory.categories.createCategory({
  name: 'Test Category',
});
```

### auth-helper.ts

Authentication utilities:

```typescript
// Register and login in one step
const auth = await createAndLoginUser(app, {
  email: 'test@example.com',
  password: 'Test123!@#',
  name: 'Test User',
});

// Create admin user
const adminAuth = await createAndLoginAdmin(app);

// Make authenticated requests
const response = await authenticatedGet(app, '/endpoint', auth.accessToken);
const response = await authenticatedPost(app, '/endpoint', auth.accessToken, { data: 'value' });
const response = await authenticatedPut(app, '/endpoint', auth.accessToken, { data: 'value' });
const response = await authenticatedPatch(app, '/endpoint', auth.accessToken, { data: 'value' });
const response = await authenticatedDelete(app, '/endpoint', auth.accessToken);

// Get auth header
const headers = getAuthHeader(auth.accessToken);
// { Authorization: 'Bearer <token>' }
```

### database-helper.ts

Database management utilities:

```typescript
const dbHelper = createDatabaseHelper(app);

// Clean all test data
await dbHelper.cleanup();

// Reset sequences to start from 1
await dbHelper.resetSequences();

// Seed basic test data (categories, common kanji)
await dbHelper.seedBasicData();

// Run in transaction for isolation
await dbHelper.runInTransaction(async (tx) => {
  // Operations here are isolated
  await tx.user.create({ data: { ... } });
});

// Check table counts
const userCount = await dbHelper.getTableCount('User');

// Verify database is empty
const isEmpty = await dbHelper.isDatabaseEmpty();
```

## Best Practices

### 1. Clean Database Between Tests

Always clean the database before each test to ensure isolation:

```typescript
beforeEach(async () => {
  await dbHelper.cleanup();
});
```

### 2. Use Factories for Test Data

Use factories instead of creating data manually:

```typescript
// ✅ Good
const user = await factory.users.createUser();

// ❌ Bad
const user = await prisma.user.create({
  data: {
    email: 'test@example.com',
    password: await bcrypt.hash('password', 10),
    name: 'Test',
  },
});
```

### 3. Reuse Authentication

Create and reuse authenticated users:

```typescript
describe('Protected endpoints', () => {
  let auth: AuthTokens;

  beforeEach(async () => {
    auth = await createAndLoginUser(app);
  });

  it('test 1', async () => {
    await authenticatedGet(app, '/endpoint', auth.accessToken);
  });

  it('test 2', async () => {
    await authenticatedPost(app, '/endpoint', auth.accessToken, data);
  });
});
```

### 4. Test Both Success and Error Cases

```typescript
describe('GET /kanji/:id', () => {
  it('should return kanji when found', async () => {
    const kanji = await factory.kanji.createKanji();
    const response = await request(app.getHttpServer())
      .get(`/kanji/${kanji.id}`)
      .expect(200);
    
    expect(response.body.character).toBe(kanji.character);
  });

  it('should return 404 when not found', async () => {
    await request(app.getHttpServer())
      .get('/kanji/99999')
      .expect(404);
  });

  it('should return 401 when not authenticated (if protected)', async () => {
    await request(app.getHttpServer())
      .get('/kanji/1')
      .expect(401);
  });
});
```

### 5. Test Authorization

Always test role-based access:

```typescript
it('should allow admin access', async () => {
  const admin = await createAndLoginAdmin(app);
  await authenticatedGet(app, '/admin/dashboard', admin.accessToken)
    .expect(200);
});

it('should deny user access to admin routes', async () => {
  const user = await createAndLoginUser(app);
  await authenticatedGet(app, '/admin/dashboard', user.accessToken)
    .expect(403);
});
```

## Running Tests

```bash
# Run all integration tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- auth-flow.e2e-spec.ts

# Run with coverage
npm run test:e2e -- --coverage

# Run in watch mode
npm run test:e2e -- --watch
```

## Troubleshooting

### Database Connection Issues

Ensure database is running and .env.test has correct connection string:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/kanji_test?schema=public"
```

### Transaction Errors

If you see "Cannot start a transaction within a transaction", make sure you're not nesting transactions:

```typescript
// ❌ Bad
await dbHelper.runInTransaction(async (tx) => {
  await dbHelper.runInTransaction(async (tx2) => {
    // Nested transaction!
  });
});

// ✅ Good
await dbHelper.runInTransaction(async (tx) => {
  // Single transaction
});
```

### Foreign Key Constraint Errors

If cleanup fails with foreign key errors, check the deletion order in `database-helper.ts`. Child tables must be deleted before parent tables.

## Coverage Goals

Target coverage for integration tests:
- **Endpoints**: 100% of all API endpoints
- **Scenarios**: Common user workflows (register, login, create, update, delete)
- **Edge Cases**: Error handling, validation, authorization
- **Cross-Module**: Integration between modules (e.g., quiz → kanji → progress)

## Next Steps

After infrastructure setup (Task 1), proceed to:
1. Task 2: Auth Module Integration Tests
2. Task 3: Kanji Module Integration Tests
3. Task 4: Kanji List Module Integration Tests
... and so on through Task 15.
