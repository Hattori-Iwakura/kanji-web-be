# 🚀 Task for Copilot — Build Full Kanji Learning Backend (NestJS + Prisma)

**Goal:** Implement a production-grade REST API backend for the Kanji Learning Platform using NestJS + Prisma + PostgreSQL. Follow Clean Architecture (controller → service → repository/adapter → prisma), include DTOs, validation, Swagger docs, authentication (JWT), password reset via email, 2FA, and full test scaffolding (unit, integration, e2e). Use `class-validator` for DTOs and NestJS standard practices.

---

## Global requirements
- Language / stack: **TypeScript, NestJS, Prisma, PostgreSQL**
- Auth: **JWT (Passport)**, **bcrypt** for passwords, **role-based guards** (ADMIN / USER)
- Email: implement a `mail` provider (abstract) with an in-memory/mock and a real-smtp adapter (configurable via env)
- 2FA: support TOTP secret generation (e.g., speakeasy) + email OTP endpoint
- Password reset: generate single-use token persisted in DB with expiry; send email with reset link
- API docs: `@nestjs/swagger` decorators on controllers & DTOs
- Validation: `class-validator` + global validation pipe
- Pagination & filtering on list endpoints (limit, offset, q, filters)
- Logging & error handling: consistent JSON error responses
- Tests: unit (service/controller), integration (controller + real prisma test db), e2e (supertest)
- Project structure: follow modular layout (see below)

.env sample (include in repo):
DATABASE_URL=postgresql://user:pass@localhost:5432/kanji_db
JWT_SECRET=change_me
JWT_EXP=3600s
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
APP_URL=http://localhost:3000

yaml
Copy code

---

## Project structure (expected)
src/
├─ main.ts
├─ core/
│ ├─ guards/
│ ├─ interceptors/
│ ├─ filters/
│ ├─ prisma/
│ └─ mail/
├─ modules/
│ ├─ auth/
│ ├─ users/
│ ├─ kanji/
│ ├─ kanji-lists/
│ ├─ flashcards/
│ ├─ quizzes/
│ ├─ publish/
│ ├─ ai/
│ └─ progress/
└─ shared/
├─ dtos/
└─ utils/
test/
├─ unit/
├─ integration/
└─ e2e/

yaml
Copy code

---

## Prisma schema changes / expectations
- Use the schema you already provided as base.
- **Remove** `Category` model (user requested).
- Add `PasswordResetToken` and `TwoFaOtp` models (or reuse comparable names) for password reset and temporary OTP storage.
- Ensure relations are correct for lists, decks, cards, quizzes, attempts, etc.
- Provide migrations (Prisma Migrate) scaffold.

Modules and Endpoints (detailed)
1) AUTH (/api/auth)
POST /api/auth/register -> register new user

Accepts: { email, password, name? }

Hash password, validate uniqueness, return created user (no password)

POST /api/auth/login -> login

Accepts: { account, password, otp? } (account = email or username)

If user has 2FA enabled require otp, issue JWT with user id & role

Response: { accessToken, user }

POST /api/auth/forgot-password -> send reset email

Accepts: { email }, create token, save to PasswordResetToken, send email link: ${APP_URL}/reset?token=...

POST /api/auth/reset-password -> reset password

Accepts: { token, newPassword }, validate token, update passwordHash, delete token

GET /api/auth/profile -> get current user (JWT)

PATCH /api/auth/profile -> update profile (name, profileImage)

POST /api/auth/2fa/setup -> setup 2FA (JWT)

Return TOTP secret (or QR url) for authenticator apps (speakeasy), store secret in DB when user confirms

POST /api/auth/2fa/verify -> verify code to enable 2FA

POST /api/auth/2fa/send -> send one-time OTP via email (for devices without TOTP), valid short time

Notes:

All auth endpoints under /api/auth.

Implement AuthService, AuthController, JwtStrategy, LocalStrategy optionally.

Use flutter friendly JSON responses.

2) KANJI (/api/kanji)
GET /api/kanji -> list (pagination, filter: jlpt, grade, q)

GET /api/kanji/:id

GET /api/kanji/character/:character

GET /api/kanji/search?q=... -> advanced search (meaning, onyomi, kunyomi)

POST /api/kanji -> create (Admin only)

PUT /api/kanji/:id -> update (Admin only)

DELETE /api/kanji/:id -> delete (Admin only)

Implement KanjiService, KanjiController, DTOs, validation, unique check for character.

3) KANJI LISTS (/api/kanji-lists)
GET /api/kanji-lists -> lists for current user (or public if query param)

GET /api/kanji-lists/jlpt/:level -> predefined JLPT lists (system lists)

GET /api/kanji-lists/:id

POST /api/kanji-lists -> create list (auto set userId from token)

PUT /api/kanji-lists/:id -> update (only owner or admin)

DELETE /api/kanji-lists/:id -> delete

POST /api/kanji-lists/:id/kanji/:kanjiId -> add kanji to list

DELETE /api/kanji-lists/:id/kanji/:kanjiId -> remove kanji from list

POST /api/kanji-lists/:id/publish -> request publish (create publish request entry)

4) FLASHCARD (/api/flashcard-decks, /api/flashcard-cards)
GET /api/flashcard-decks -> all decks owned by user / public

GET /api/flashcard-decks/:id -> deck details + cards

POST /api/flashcard-decks -> create deck

PUT /api/flashcard-decks/:id -> update

DELETE /api/flashcard-decks/:id -> delete

POST /api/flashcard-decks/:id/cards/:kanjiId -> add card (use Kanji id to populate front/back)

DELETE /api/flashcard-decks/:id/cards/:kanjiId -> remove card

GET /api/flashcard-cards/:id -> card detail

GET /api/flashcard-decks/:id/sessions -> get study sessions & review history

Include spaced repetition fields (nextReviewAt, difficulty) in model and endpoints to schedule reviews.

5) QUIZZES (/api/quizzes)
GET /api/quizzes -> user's quizzes & public

GET /api/quizzes/:id -> full quiz + questions

POST /api/quizzes -> create

PUT /api/quizzes/:id -> update

DELETE /api/quizzes/:id

POST /api/quizzes/:id/questions -> add question (body varies by type)

GET /api/quizzes/:id/questions/:questionId -> question details

PUT /api/quizzes/:id/questions/:questionId -> update

DELETE /api/quizzes/:id/questions/:questionId -> delete

PUT /api/quizzes/:id/questions/reorder -> reorder question list

POST /api/quizzes/:id/start -> start attempt (create QuizAttempt)

POST /api/quizzes/attempts/:attemptId/submit -> submit answers, calculate score

GET /api/quizzes/:id/attempts -> list attempts for quiz

GET /api/quizzes/attempts/:attemptId -> attempt detail

POST /api/quizzes/:id/publish-request -> request publish

Quiz question types: MULTIPLE_CHOICE, TRUE_FALSE, FILL_IN_BLANK, DRAWING — DTOs per type, validation and type discriminator.

6) PUBLISH REQUESTS (/api/publish)
GET /api/publish/requests -> admin only (list)

POST /api/publish/:type/:id/request -> create request (type in quiz|kanji-list|flashcard)

POST /api/publish/:type/:id/approve -> admin approve

POST /api/publish/:type/:id/reject -> admin reject (store reviewer id & message)

7) AI & RECOGNITION (/api/ai & /api/kanji-recognition)
POST /api/ai/predict -> accept image (multipart/form-data) or base64; return top predictions (mock or forward to model microservice)

POST /api/kanji-recognition/recognize -> accept drawn canvas PNG; return top-5 matched kanji (to be used by Flutter canvas search)

GET /api/ai/health -> returns health status; ready for microservice integration

8) PROGRESS & ANALYTICS (/api/progress)
GET /api/progress/user/:userId -> aggregated user summary (quiz accuracy, flashcard accuracy, streaks)

GET /api/progress/quiz -> aggregated quiz stats (avg score)

GET /api/progress/flashcards -> accuracy, next reviews count

POST /api/progress/log -> optional daily progress log for persistence

Implementation details & expectations
Controllers return typed DTO responses. Use @ApiTags, @ApiOperation, @ApiResponse.

Use pipe validation globally in main.ts:

ts
Copy code
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
Protect routes with @UseGuards(AuthGuard('jwt')) and role guard @Roles('ADMIN') where required.

Use getUser() decorator to extract user from request.

All services should handle Prisma errors and throw meaningful HttpExceptions. E.g., duplicate character -> 409 Conflict.

Provide a repository/service separation (Service uses Prisma client to implement business logic).

Add logging for important actions (user registered, password reset requested, publish approved).

Use class-transformer to control response fields (exclude passwordHash).

Testing requirements
For each module provide:

Unit tests for at least one service method (Jest).

Controller integration tests using @nestjs/testing + in-memory sqlite or test Postgres DB with Prisma Migrate (or use prisma-test-utils).

One e2e test per module using supertest hitting the actual HTTP server:

Auth: register -> login -> profile -> forgot/reset flow

Kanji: create (admin) -> list -> search -> get by id

Flashcard: create deck -> add card -> start study session

Quiz: create -> add questions -> start attempt -> submit -> verify score

Provide test templates & examples; tests should be runnable with:

arduino
Copy code
npm run test
npm run test:cov
npm run test:e2e
Deliverables (per Copilot)
Full NestJS module scaffold code under src/modules/* for all modules above

Prisma schema (updated), migration files, simple seed script for sample JLPT lists and an admin user

DTOs, controllers, services, guards, decorators, and helpers

Mail adapter (console & SMTP) and example config

Swagger setup in main.ts (serve at /api/docs)

Unit, integration, and e2e test files (stubs + a few full examples)

README with how to run (migrations, seed, test, start)

Non-goals / clarifications
The recognition model itself may be mocked initially; but endpoints must be present and return consistent JSON.

Frontend & Flutter logic are NOT part of this prompt — only backend API with test coverage.

Keep the API stable / documented so the Flutter client can integrate.

Run commands to check
After generation, run:

bash
Copy code
yarn
yarn prisma:migrate:dev
yarn prisma:seed
yarn start:dev
yarn test
yarn test:e2e
If anything is ambiguous, implement a sensible default (e.g., pagination defaults limit=20, offset=0), and leave TODO comments in code for further expansion.

Thank you — now generate the full backend scaffold and tests per above.