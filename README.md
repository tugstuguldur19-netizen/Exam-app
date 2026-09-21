# Exam Prep

A mobile exam-prep app: subjects are time-based subscriptions, and users can
upload a `.docx` exam file to have the app turn it into an interactive,
auto-graded exam.

- **`backend/`** — Node/TypeScript/Express/Prisma API. See `backend/README.md`
  for setup, the data model, and the docx→exam parsing pipeline.
- **`mobile/`** — Expo (React Native/TypeScript) app. See `mobile/README.md`
  for setup and a screen-by-screen tour.

## Quick start

```bash
# Terminal 1 — backend
cd backend
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run seed
npm run dev

# Terminal 2 — mobile
cd mobile
npm install
npm start
```

Demo login: `demo@example.com` / `password123`.

## What's here vs. what's still a placeholder

**Working end to end** (verified against a running backend): register/login,
subscribing to a subject (time-boxed access), uploading a `.docx` exam,
parsing it into multiple-choice/short-answer questions, taking the exam, and
auto-grading on submit with results revealed after.

**Placeholder, called out in `backend/README.md`**: subscription "purchase"
is mocked (grants access with no real payment) — wire up RevenueCat or native
StoreKit/Play Billing before charging real money. SQLite is for local dev;
switch to Postgres for production. No password reset/email verification yet.

## Product decisions made without checking back

Since you said to fill in the rest and give feedback later, here's what I
picked and why, so you can correct any of it:

- **3 starter subjects**: Mathematics, Biology, English — generic placeholders,
  easy to rename/replace/add to in `backend/prisma/seed.ts` (just data, no
  code changes needed for more subjects later).
- **Subscription plans**: 1/3/12 months per subject, priced $4.99/$12.99/$39.99,
  as a starting point — trivial to change in the same seed file.
- **Subscriptions are per-subject**, not a single account-wide plan — matches
  "accounts are time based subscriptions for each subject" literally. If you
  actually want bundle pricing (all 3 for less than buying separately), that's
  a straightforward addition to the plan model.
- **Exam grading**: multiple-choice is exact-match; short-answer is a
  normalized (case/punctuation-insensitive) exact-text match, not fuzzy or
  AI-graded. Literal matching will mark near-correct free-text answers wrong —
  flagging this as the thing most likely to need a follow-up pass (semantic
  grading via an LLM would be the natural upgrade).
- **Docx parsing** handles the common exam layout (numbered questions,
  `A)/B)/C)/D)` options, inline `Answer:` lines or a trailing answer key) via
  regex, with an optional Claude-based fallback for messier documents if
  `ANTHROPIC_API_KEY` is set. Anything it can't confidently grade is kept but
  marked ungraded rather than guessed at.
