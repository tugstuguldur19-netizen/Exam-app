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

## Deploying for real-device testing

`render.yaml` at the repo root is a [Render](https://render.com) Blueprint —
enough to get a real, internet-reachable URL for testing the mobile app on
an actual phone, without a credit card:

1. On [render.com](https://render.com), sign up (or log in) and connect
   your GitHub account.
2. **New** → **Blueprint** → pick this repo. Render reads `render.yaml`
   and proposes one service (`exam-prep-backend`); click **Apply**.
3. Wait for the first deploy to finish, then copy the service's URL
   (`https://exam-prep-backend-xxxx.onrender.com`).
4. Use that URL as the `api_url` input when manually triggering the
   `Build Android APK` GitHub Actions workflow (see `mobile/README.md`) —
   that's what makes the installed app able to actually reach this backend.

**This is a testing setup, not production**: Render's free tier has no
persistent disk, so the SQLite database resets on every redeploy and every
time the service spins back up from being idle (free services sleep after
15 minutes of no traffic, and cold-start on the next request — expect the
first request after a while to be slow). `npm run seed` reruns on every
start specifically so the 3 starter subjects and demo login always come
back; anything else you created (extra accounts, uploaded exams,
subscriptions) won't survive a restart. Good enough to click through the
app for real; not where you'd point a real user's install.

## Tests

```bash
npm test
```

Three suites:
- `src/services/docxParser.test.ts` — parsing heuristics, no DB needed.
- `src/services/grading.test.ts` — normalization/matching + the semantic-grading
  fallback's no-key/no-network behavior, no DB needed.
- `src/routes/examFlow.integration.test.ts` — the real Express app (from
  `src/app.ts`) against a dedicated SQLite test database, exercising the
  actual user journey over HTTP: register → get blocked from an unsubscribed
  subject → subscribe → upload the fixture `.docx` → confirm answers aren't
  leaked before submission → take the exam → grade against a known answer
  key → confirm a second submission is rejected → confirm a different user
  can't read the first user's exam or attempt.

`npm test`'s `pretest` step runs migrations against `prisma/test.db`
(gitignored, separate from your dev database) before vitest runs — no
manual setup needed.

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

Grading: multiple-choice is exact choice-id match. Short-answer first tries
a normalized (lowercased, punctuation-stripped) exact-text match; if that
fails and `ANTHROPIC_API_KEY` is set, `shortAnswerMatchesSemantically` in
`src/services/grading.ts` asks Claude to judge whether the answer is
substantively correct even if worded differently. Without a key, or if the
call fails, it just keeps the exact-match verdict — no crash, just less
lenient grading.

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
- **Auth rate limiting is IP-based and coarse** (20 requests/15min on
  `/auth/*`) — enough to stop naive scripted abuse, not a targeted botnet.
  No password reset or email verification yet.
