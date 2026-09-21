# Exam Prep Backend

Node/TypeScript + Express + Prisma (SQLite by default) API for the exam-prep mobile app.

## Setup

```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run seed      # 3 starter subjects (Math, Biology, English) + 3 plans each + demo user
npm run dev        # http://localhost:4000
```

Demo login: `demo@example.com` / `password123`

## Core model

- **Subject**: a gated content area. Starter catalog = 3 subjects (seeded).
- **SubscriptionPlan**: a purchasable duration for a subject (1/3/12 months, seeded).
- **Subscription**: a user's time-boxed access to one subject (`endAt` gates access).
- **Exam**: generated from an uploaded `.docx` file, scoped to one subject.
- **Question / Choice**: parsed from the docx; multiple-choice or short-answer.
- **ExamAttempt / AnswerResponse**: a take of an exam, auto-graded on submit.

## Key endpoints

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | returns JWT |
| GET | `/subjects` | all subjects + caller's subscription state |
| POST | `/subjects/:subjectId/subscribe` | `{ planId }` — mock purchase, see below |
| POST | `/subjects/:subjectId/exams` | multipart `file` (.docx), requires active subscription |
| GET | `/subjects/:subjectId/exams` | list ready exams for a subject |
| GET | `/exams/:examId` | questions only, no answers |
| POST | `/exams/:examId/attempts` | start (or resume) an attempt |
| POST | `/attempts/:attemptId/submit` | `{ answers: [{questionId, choiceId?, answerText?}] }` — grades and scores |
| GET | `/attempts/:attemptId` | results; reveals correct answers only after submit |

## Docx → exam pipeline

1. `mammoth` extracts raw text from the uploaded `.docx`.
2. `src/services/docxParser.ts` runs regex heuristics for the common layout
   (numbered questions, `A)/B)/C)/D)` options, inline `Answer:` lines or a
   trailing answer-key section).
3. If that finds zero questions, and `ANTHROPIC_API_KEY` is set,
   `src/services/aiQuestionExtractor.ts` asks Claude to extract structured
   questions from messier documents (prose-style questions, inconsistent
   formatting).
4. Any question the parser can't confidently match to an answer is stored
   as ungraded (excluded from the attempt's `totalPoints`) and surfaced in
   `parseWarnings` on the exam.

Grading is deterministic: multiple-choice is exact choice-id match,
short-answer is a normalized (lowercased, punctuation-stripped) exact-text
match. Swap `shortAnswerMatches` in `src/services/grading.ts` for
semantic/AI grading later if literal matching is too strict.

## ⚠️ Not production-ready yet

- **Billing is mocked.** `POST /subjects/:subjectId/subscribe` grants access
  immediately with no payment. Wire up RevenueCat (simplest for cross-platform
  IAP receipt validation) or native StoreKit/Play Billing before charging real
  money, and verify webhooks server-side rather than trusting the client.
- **SQLite** is for local/dev convenience. Switch the `datasource` provider
  in `prisma/schema.prisma` to `postgresql` and point `DATABASE_URL` at a real
  Postgres instance for production.
- **Uploaded files aren't persisted** beyond parsing (memory storage only) —
  fine for the current synchronous pipeline, but move to a queue + object
  storage (S3) if exam files need to be re-processed or audited later.
- No rate limiting, password reset, or email verification yet.
