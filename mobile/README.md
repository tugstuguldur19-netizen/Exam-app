# Сорил mobile app

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

The whole UI is in Mongolian. Bottom tabs:

- **Нүүр (Home)** — greeting, streak, this week's activity, upload shortcut,
  subject cards with subscription status and accuracy.
- **Миний тест (My tests)** — upload a .docx test (weekly free quota shown),
  list of uploaded tests with last score, delete, and a format guide.
- **Ахиц (Progress)** — totals, 7-day chart, per-subject/lesson accuracy with
  the weakest lesson highlighted, recent tests.
- **Профайл (Profile)** — subscriptions with days left, change name/password,
  history, log out.

Other screens: subject detail (free trial test, mixed test, fix-mistakes,
lessons with a question-count picker), mixed test builder (per-lesson
steppers), plans, test taking (timer, flag questions, question grid),
result (score, per-question review with explanations, retake), history.

## Getting an installable APK

This project can't build an Android APK from inside a sandboxed Claude Code
session — neither a local Android SDK download nor EAS Build's cloud
service is reachable from there. `.github/workflows/build-apk.yml` solves
this by building on GitHub's own runners instead, which have full internet
access and a preinstalled Android SDK:

1. Push this repo to GitHub.
2. Go to the **Actions** tab → **Build Android APK** → **Run workflow**.
   Fill in `api_url` with a backend address your phone can actually reach
   (a deployed backend, or your computer's LAN IP with the phone on the
   same Wi-Fi — not `localhost`/`10.0.2.2`, which only resolve inside an
   emulator/simulator, not on a real device). Leave it blank and the app
   falls back to the emulator defaults instead.
3. When the run finishes, open it and scroll to **Artifacts** → download
   `exam-prep-apk` (a zip containing `app-release.apk`) → unzip → install
   the APK on your phone (allow installs from unknown sources — this isn't
   a Play Store build). You need to be logged into GitHub in the browser
   you download from; a sandboxed Claude Code session can't download this
   for you — Actions artifacts live on Azure blob storage, which such a
   session's network policy blocks, but your own browser has no such
   restriction.
4. It also runs automatically on every push to `main`/`master` that
   touches `mobile/`, using the emulator-default API URL — trigger it
   manually (step 2) whenever you need a build pointed at a real backend.

This is a **release build** (arm64-only, R8-minified — see the workflow
for why) signed with Android's auto-generated debug keystore: fine for
installing on your own device, not for Play Store distribution (that needs
a real release signing key — EAS Build's managed credentials are the
easiest way to get one when you're ready).

## Design

`src/theme.ts` is the single source of colors, spacing, radii, typography,
and shadows — every screen pulls from it instead of hardcoding values, so a
palette or density change is a one-file edit. Icons are `@expo/vector-icons`
(Ionicons) throughout. All interactive elements carry `accessibilityRole` /
`accessibilityLabel` (see `src/screens/*`) for VoiceOver/TalkBack.

## Notes

- Web (`npm run web`) is a convenience for quickly checking a screen renders
  in a browser (used for the screenshots verifying this app), not a shipping
  target — some native-only behavior (e.g. `expo-secure-store`, handled via
  an `@react-native-async-storage/async-storage` fallback on web in
  `src/api/client.ts`) is emulated rather than native there.
- `npm audit` will flag a moderate `uuid` advisory pulled in transitively by
  Expo's own CLI/build tooling (`@expo/config-plugins` and friends) — that
  code runs during `expo prebuild`/native builds, not in the shipped app, and
  fixing it means downgrading Expo itself. Left as-is; re-check next time
  dependencies are bumped.
