# Exam Prep Mobile App

Expo (React Native + TypeScript) client for the exam-prep backend.

## Setup

```bash
cd mobile
npm install
npm start        # then press i (iOS simulator), a (Android emulator), or scan the QR code with Expo Go
```

Point the app at your backend by setting `EXPO_PUBLIC_API_URL` (see
`src/config.ts`) — it defaults to `http://localhost:4000` on iOS/web and
`http://10.0.2.2:4000` on the Android emulator. A physical device needs your
computer's LAN IP instead of localhost.

## Screens

- **Login / Register** — email + password, JWT stored in `expo-secure-store`.
- **Subjects** — the 3 starter subjects, each showing subscription status
  (locked/"Subscribe" vs. active-until-date/"Open"). Subscribing shows a plan
  picker (1/3/12 months) and calls the mock purchase endpoint.
- **Subject detail** — lists exams generated for that subject and an
  "Upload .docx exam" button (`expo-document-picker` → multipart upload).
- **Take exam** — renders multiple-choice and short-answer questions, collects
  answers, submits for grading.
- **Results** — score, and per-question correct/incorrect with the right
  answer revealed (only after submission).

## Notes

- Web (`npm run web`) is not a real target platform: `expo-secure-store` has
  no web implementation, so token storage silently fails there. It's fine for
  quickly checking that a screen renders, not for exercising login end to end.
- `npm audit` will flag a moderate `uuid` advisory pulled in transitively by
  Expo's own CLI/build tooling (`@expo/config-plugins` and friends) — that
  code runs during `expo prebuild`/native builds, not in the shipped app, and
  fixing it means downgrading Expo itself. Left as-is; re-check next time
  dependencies are bumped.
