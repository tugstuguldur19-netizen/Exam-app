# Сорил — exam prep app

A Mongolian-language mobile app for exam preparation.

- **Subjects → lessons → tests.** Three starter subjects (Математик, Биологи,
  Англи хэл), each split into lessons with a curated question bank and an
  explanation for every answer.
- **Free trial test** in every subject. Everything else in a subject (lesson
  tests with a chosen number of questions, mixed tests with a per-lesson
  count, "fix my mistakes" review) needs a time-based subscription to that
  subject (1 month / 3 months / 1 year, priced in ₮).
- **Upload your own .docx test** — independent of subjects. Free accounts get
  one upload per rolling week; any active subscription makes it unlimited.
  The parser understands Mongolian layouts (А) Б) В) Г) options,
  `Хариулт:` / `Тайлбар:` lines, answer keys like `1-Б 2-В`).
- **Progress**: streak, last-7-days activity, accuracy per subject and lesson,
  weakest lesson hint, full test history with per-question review and retake.

| | |
|---|---|
| `backend/` | Node/TypeScript, Express 5, Prisma, PostgreSQL — see `backend/README.md` |
| `mobile/` | Expo (React Native/TypeScript) — see `mobile/README.md` |

## Quick start

```bash
# Terminal 1 — backend (needs a local PostgreSQL, see backend/README.md)
cd backend
npm install
cp .env.example .env
npx prisma migrate deploy
npm run seed
npm run dev

# Terminal 2 — mobile
cd mobile
npm install
npm start
```

Demo login: `demo@example.com` / `password123`.

## Still a placeholder

**Payments are mocked**: "buying" a plan activates it immediately (the app
says so). Hook up QPay / a card processor and create subscriptions from its
webhook before charging real money. No password reset or email verification
yet.
