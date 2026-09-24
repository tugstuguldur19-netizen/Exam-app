# Сорил backend

Node/TypeScript + Express 5 + Prisma + PostgreSQL. All user-facing error
messages are Mongolian; every error response is `{ error, code }` so the app
can react to specific cases (`SUBSCRIPTION_REQUIRED`, `UPLOAD_LIMIT_REACHED`,
`SESSION_EXPIRED`, …).

## Setup

Needs PostgreSQL 14+. For example, on Debian/Ubuntu:

```bash
sudo -u postgres psql -c "CREATE ROLE examprep LOGIN PASSWORD 'examprep' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE examprep_dev OWNER examprep;"
sudo -u postgres psql -c "CREATE DATABASE examprep_test OWNER examprep;"
```

```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate deploy
npm run seed      # subjects, lessons, question bank, plans, demo user (idempotent)
npm run dev       # http://localhost:4000
```

The curated content lives in `prisma/seedData.ts` — add questions, lessons or
subjects there and rerun `npm run seed`. Ids are derived from the keys, so
reseeding updates content in place and never breaks users' history.

## Tests

```bash
npm test
```

`pretest` resets and seeds the `examprep_test` database. Suites:

- `src/services/docxParser.test.ts` — English and Mongolian layouts,
  Latin/Cyrillic look-alike answer letters, answer keys, explanations.
- `src/services/grading.test.ts` — answer normalization and the optional
  semantic grading fallback.
- `src/routes/api.integration.test.ts` — the real app over HTTP: auth,
  subscriptions, trial/lesson/mixed/mistakes tests, grading, stats, retakes,
  uploads with the weekly quota, ownership checks.

CI runs the same suite against a Postgres service
(`.github/workflows/backend-tests.yml`).

## API

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | returns `{ token, user }` |
| GET/PATCH | `/auth/me` | profile + active subscriptions / change name |
| POST | `/auth/change-password` | |
| GET | `/subjects` | subjects with lessons, counts, your accuracy, plans, subscription |
| GET | `/subjects/:id` | same for one subject, plus `mistakeCount` |
| POST | `/subjects/:id/subscribe` | `{ planId }` — mock purchase; extends an active subscription |
| POST | `/tests` | create a test: `TRIAL` (free), `LESSON` `{lessonId, count?}`, `MIXED` `{subjectId, lessons:[{lessonId,count}], shuffle?}`, `MISTAKES`, `UPLOAD` `{uploadId}` |
| GET | `/tests/:id` | questions (answers hidden until submitted, then full review) |
| POST | `/tests/:id/submit` | `{ answers:[{questionId, choiceId?, answerText?}], durationSec }` |
| POST | `/tests/:id/retake` | same questions, new session |
| GET | `/tests` | history |
| GET | `/stats` | totals, streak, last 7 days, per-subject/lesson accuracy |
| GET | `/uploads`, `/uploads/quota` | your uploaded tests / weekly quota |
| POST | `/uploads` | multipart `file` (.docx, ≤15MB) |
| DELETE | `/uploads/:id` | soft delete (still counts toward the weekly quota) |

## Docx → test pipeline

1. `mammoth` extracts the text.
2. `src/services/docxParser.ts` parses numbered questions, options
   (`А)`…`Д)` or `A)`…`E)`), inline `Хариулт:`/`Answer:` and `Тайлбар:` lines,
   or an answer key at the end (`1-Б 2-В` or one per line).
3. If that finds nothing, or no answers for most questions, and
   `ANTHROPIC_API_KEY` is set, `src/services/aiQuestionExtractor.ts` asks
   Claude to extract the questions instead.
4. Questions without a known answer are kept but not scored, and listed as
   warnings.

## Deploying (Render)

`render.yaml` at the repo root is a Render Blueprint with a free web service
and a free PostgreSQL database. **New → Blueprint** → pick the repo → **Apply**.
Migrations and the (idempotent) seed run on every start.

Render's free database expires 30 days after creation — upgrade its plan to
keep the data. The free web service sleeps after 15 minutes idle; the first
request afterwards takes ~30–60 s.

## Not production-ready yet

- **Billing is mocked** — see the root README.
- Uploaded files aren't stored, only the parsed questions.
- Auth rate limit is per IP (20 requests / 15 min on login/register).
