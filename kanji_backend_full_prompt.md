# 🧠 TASK: Generate Full REST API for Kanji Learning Backend

## 🎯 Goal
Based on the existing **Prisma schema**, generate **NestJS REST API endpoints** for all modules:
- Authentication & User Management  
- Kanji  
- Kanji Lists  
- Flashcard Decks  
- Quizzes  
- Publish Requests  
- Progress Analytics (aggregated stats)

Each module should follow **Clean Architecture** with:
- Controller → Service → Repository → Prisma ORM
- DTOs (for Create, Update, and Response)
- Endpoints organized under `/api/[module]`
- Proper validation using `class-validator`
- Swagger documentation decorators
- Unit test stubs for each controller and service

---

## 🧩 MODULE REQUIREMENTS

### 1️⃣ AUTH MODULE (`/auth`)
**Endpoints:**
- `POST /auth/register` → Register new user  
- `POST /auth/login` → Authenticate user  
- `GET /auth/profile` → Get current user  
- `PATCH /auth/profile` → Update user profile  
- `POST /auth/forgot-password` → Send reset email  
- `POST /auth/reset-password` → Reset password using token  
- `POST /auth/2fa/setup` → Setup 2FA (generate secret)  
- `POST /auth/2fa/verify` → Verify 2FA code  

**Notes:**
- Use JWT-based authentication (NestJS Passport strategy)
- Hash passwords using bcrypt
- Return JWT + basic user info on login

---

### 2️⃣ KANJI MODULE (`/kanji`)
**Endpoints:**
- `GET /kanji` → Get all kanji  
- `GET /kanji/:id` → Get single kanji  
- `GET /kanji/character/:character` → Find by character  
- `GET /kanji/search?query=` → Search with filter (jlpt, grade, meaning)  
- `POST /kanji` → Create new kanji (Admin only)  
- `PUT /kanji/:id` → Update kanji (Admin only)  
- `DELETE /kanji/:id` → Delete kanji (Admin only)

**Notes:**
- Add filtering and pagination  
- Ensure unique constraint for `character`

---

### 3️⃣ KANJI LIST MODULE (`/kanji-lists`)
**Endpoints:**
- `GET /kanji-lists` → Get all lists of current user  
- `GET /kanji-lists/jlpt/:level` → Get JLPT-level lists  
- `GET /kanji-lists/:id` → Get list detail  
- `POST /kanji-lists` → Create list  
- `PUT /kanji-lists/:id` → Update list  
- `DELETE /kanji-lists/:id` → Delete list  
- `POST /kanji-lists/:id/kanji/:kanjiId` → Add kanji to list  
- `DELETE /kanji-lists/:id/kanji/:kanjiId` → Remove kanji from list  
- `POST /kanji-lists/:id/publish` → Request publish approval  

**Notes:**
- Auto attach `userId` from JWT  
- Allow optional `isPublic` flag  

---

### 4️⃣ FLASHCARD MODULE (`/flashcard-decks`)
**Endpoints:**
- `GET /flashcard-decks` → Get all decks  
- `GET /flashcard-decks/:id` → Get deck by ID  
- `GET /flashcard-decks/:id/cards` → Get cards in a deck  
- `GET /flashcard-decks/:deckId/cards/:cardId` → Get card details  
- `POST /flashcard-decks` → Create new deck  
- `PUT /flashcard-decks/:id` → Update deck  
- `DELETE /flashcard-decks/:id` → Delete deck  
- `POST /flashcard-decks/:id/cards/:kanjiId` → Add card to deck  
- `DELETE /flashcard-decks/:id/cards/:kanjiId` → Remove card  
- `POST /flashcard-decks/:id/publish` → Request publish  

**Notes:**
- Deck belongs to a specific user  
- Include optional difficulty tracking and review history  

---

### 5️⃣ QUIZ MODULE (`/quizzes`)
**Endpoints:**
- `GET /quizzes` → Get all quizzes of current user  
- `GET /quizzes/:id` → Get quiz detail  
- `GET /quizzes/:id/questions` → Get all questions of quiz  
- `GET /quizzes/:quizId/questions/:questionId` → Get question details  
- `POST /quizzes` → Create quiz  
- `PUT /quizzes/:id` → Update quiz  
- `DELETE /quizzes/:id` → Delete quiz  
- `POST /quizzes/:id/questions` → Add question  
- `PUT /quizzes/:id/questions/:questionId` → Update question  
- `DELETE /quizzes/:id/questions/:questionId` → Delete question  
- `PUT /quizzes/:id/questions/reorder` → Reorder question order  
- `POST /quizzes/:id/start` → Start quiz attempt  
- `POST /quizzes/attempts/:attemptId/submit` → Submit answers  
- `GET /quizzes/:id/attempts` → Get quiz attempts  
- `GET /quizzes/attempts/:attemptId` → Get attempt details  
- `POST /quizzes/:id/publish-request` → Request to publish quiz  

**Notes:**
- Questions can be of multiple types (`MULTIPLE_CHOICE`, `DRAWING`, etc.)
- QuizAttempt and QuizAnswer should track progress and score calculation  

---

### 6️⃣ PUBLISH REQUESTS MODULE (`/publish`)
**Endpoints:**
- `GET /publish/requests` → Get all requests (admin only)  
- `POST /publish/:type/:id/request` → Create publish request  
- `POST /publish/:type/:id/approve` → Approve request (admin only)  
- `POST /publish/:type/:id/reject` → Reject request (admin only)

**Notes:**
- Support `quiz`, `kanji-list`, and `flashcard` types  

---

### 7️⃣ PROGRESS MODULE (`/progress`)
**Endpoints:**
- `GET /progress/user/:userId` → Get user’s learning summary  
- `GET /progress/quiz` → Get quiz performance stats  
- `GET /progress/flashcards` → Get flashcard accuracy & streak  
- `POST /progress/log` → Save daily progress summary  

**Notes:**
- Aggregate data from `QuizAttempt` and `FlashcardStudySession`  
- Use the optional `ProgressLog` model if persistence is needed  

---

## ⚙️ Implementation Requirements

### Common Structure
src/
├── modules/
│ ├── auth/
│ ├── kanji/
│ ├── kanji-list/
│ ├── flashcard/
│ ├── quiz/
│ ├── publish/
│ └── progress/
├── core/
│ ├── guards/
│ ├── interceptors/
│ ├── filters/
│ └── prisma/
└── main.ts

### Use:
- `@nestjs/common`, `@nestjs/swagger`, `@nestjs/passport`
- `class-validator`, `class-transformer`
- `@prisma/client`
- Testing with `@nestjs/testing` and `supertest`

### Include:
- Input validation
- Pagination (limit, offset)
- Error handling (try/catch + HttpException)
- Unit & integration test templates
- Swagger API tags per module

---

## ✅ Output Expectations
- Create or update files under `/src/modules/[module]/`
- Include controller, service, and dto files
- Each controller includes `@ApiTags()` for Swagger
- Include mock test examples for one endpoint per module
- Format all generated code using Prettier

---

## 🧪 After Generating
Run these commands to verify:
```bash
yarn format
yarn lint
yarn test
yarn start:dev
```