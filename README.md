# VENTII — React Native

Mobile-first event discovery app for Atlanta nightlife/lifestyle. Bare React Native (0.80, TypeScript), Redux Toolkit, React Navigation. This is the **logically-architected rebuild** of the prototype — same visual design language, properly modularized.

## What's working right now

All screens render against seeded mock data (no backend yet):

| Screen | What it does |
|---|---|
| **Login** | Mock sign-in. Any email + password works. |
| **Home Feed** | Tinder-style swipe deck. Swipe right = going, up = interested, left = pass. Tap to open event. |
| **Calendar** | Month grid + saved events list. Saved events come from up-swipes on the feed. |
| **AI Concierge** | Purple-pulse styled chat (reserved AI accent). Mock responses. |
| **Activity** | 3 tabs: Notifications / RSVPs / Plans. Wallet shortcut in the header. |
| **Profile** | Avatar + stats + 4 tabs (Saved / Going / Communities / About). Settings entry. |
| **Event Detail** | Cinematic hero + 5 tabs (Details / Vibe / Ticket / Deal / Info) + sticky CTA. |
| **Wallet** | Ticket cards. |
| **Ticket Detail** | The pass — placeholder QR (intentionally not scannable), perforated card design. |
| **Settings** | Theme toggle (dark/light), notifications, privacy, account. |

Theme system toggles dark ↔ light instantly across the entire app. Reserved accent families respected (purple = AI only).

## What's NOT working yet (intentional)

- No backend wiring — uses mock data in `src/data/`
- No real auth (login is a 600ms simulated thunk)
- No real ticket purchases (CTAs are placeholders)
- No real WebSocket activity stream
- The QR code on tickets is a random pattern, **not a real scannable code** (explicit design guardrail — must look real enough to demo UX but never real enough to scam entry)

These all stand up when the Django backend lands.

## Setup (one time)

You need a Mac (or Linux box with Android Studio) with:
- Node 18+
- Java 17 (Android Gradle requirement)
- Android Studio with an Android SDK + either an emulator OR a real Android phone with USB debugging enabled

```bash
cd ventii_react_native

# 1. Install JS deps
npm install --legacy-peer-deps

# 2. Tell Gradle where your Android SDK lives
echo "sdk.dir=$ANDROID_SDK_ROOT" > android/local.properties
# (on Mac this is usually ~/Library/Android/sdk; check Android Studio settings)
```

That's it for setup. The `android/` folder is already wired with package `com.ventii`, app name `VENTII`, debug keystore, and gradle wrapper — copied from the working calendar app and renamed.

## Run on Android (your preferred workflow)

```bash
# Terminal 1: start the Metro bundler
npm start

# Terminal 2: build + install the debug APK on the connected phone
cd android
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 \
  ./gradlew assembleDebug --no-daemon \
  -PreactNativeArchitectures=arm64-v8a

adb install app/build/outputs/apk/debug/app-debug.apk
```

After the first install, leave Metro running and just edit source — JS changes push over USB in ~1 second (no rebuild required). Only native code changes (anything under `android/`) need a fresh `gradlew assembleDebug`.

## Run on iOS simulator (Mac only — ios/ folder NOT included yet)

Generate the ios/ folder once with:

```bash
npx @react-native-community/cli@latest init VentiiBoot --version 0.80.2 --skip-install
cp -r VentiiBoot/ios ./
rm -rf VentiiBoot
# Edit ios/Ventii/Info.plist + ios/Ventii.xcodeproj to set bundle id `com.ventii`
cd ios && pod install && cd ..
npm run ios
```

Skip iOS if you only have Android.

## Release builds (when you're ready to ship)

The release signing config in `android/app/build.gradle` is commented out — it currently falls back to the debug keystore so release builds don't fail. **Before publishing to Play Store**, generate a real release key:

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore android/app/ventii-release-key.keystore \
  -alias ventii-key -keyalg RSA -keysize 2048 -validity 10000
```

Then uncomment the `release` block in `android/app/build.gradle` and set the password you chose. **Keep the keystore file safe** — losing it means you can never update the app on the Play Store.

## Project layout

```
ventii_react_native/
├── App.tsx                         Provider chain + GestureHandlerRoot + Navigator
├── index.js
├── app.json
├── package.json
├── babel.config.js / metro.config.js / tsconfig.json
├── src/
│   ├── theme/themes.ts            Dark/light tokens + reserved accent families (aurora/beam/glow/deal/pulse)
│   ├── hooks/useTheme.ts          One hook all components use to read theme
│   ├── types/                     Entity types (Event/Profile/Ticket/etc) + nav param lists
│   ├── data/                      Seeded mock events/profiles/tickets — Atlanta nightlife flavored
│   ├── store/
│   │   ├── store.ts               Redux + redux-persist (whitelist: auth + theme)
│   │   └── slices/                authSlice, themeSlice, feedSlice, walletSlice
│   ├── components/                Pill, HostStack, SwipeDeck (reanimated + gesture-handler)
│   ├── screens/                   One file per screen, no business logic mixed in
│   ├── navigation/AppNavigator.tsx  Bottom tabs + native stack + auth gate
│   ├── constants/config.ts        API URLs (placeholders for now)
│   └── utils/logger.ts            Structured logger (calendar-app compatible)
```

## Design language rules (DO NOT break)

These come from the prototype's design contract:

1. **Reserved purple is AI only.** `accents.pulse` (purple) appears exclusively on AI-related surfaces — the AI Concierge screen, the AI tab icon, AI suggestion pills inside other screens. No purple elsewhere.
2. **Five accent families, distinct uses:**
   - `aurora` — primary CTAs, premium surfaces, brand
   - `beam` — info, prices, links
   - `glow` — rewards, deals attention, urgency ("only X left")
   - `deal` — discounts, deals pills, "confirmed"
   - `pulse` — AI surfaces only
3. **The wallet QR placeholder is not real.** Random pattern by design. Must never look real enough that someone could try to bluff entry. Final tickets ship via a verified system, not this.
4. **Single-file React was prototype convenience, not architecture.** Anything you build here should be properly split — screens hold render logic, slices hold state, services hold I/O.

## Adding a new screen

1. Create `src/screens/MyScreen.tsx` — use `useTheme()` for styling
2. Add `MyScreen` to the right `*ParamList` in `src/types/navigation.ts`
3. Register it in `src/navigation/AppNavigator.tsx` (root stack or tab)
4. If it needs new state, add a slice in `src/store/slices/`

## Adding a new entity (Event, Profile, etc.)

1. Add the TS interface to `src/types/index.ts`
2. Add a mock seed file in `src/data/`
3. Add a slice in `src/store/slices/` for managing the collection
4. Register the slice in `src/store/store.ts`

## When the backend lands

Most of the work is already factored. The wiring you'll need:

- Create `src/services/api.ts` (axios with auth/refresh interceptors — pattern is in the calendar app)
- Create `src/services/storage.ts` (typed AsyncStorage wrapper)
- Create `src/services/websocketService.ts` (reconnect + per-resource subscription)
- Replace mock thunks in `authSlice.ts` and add real ones in `feedSlice.ts`, `walletSlice.ts`, etc.
- Update `src/constants/config.ts` with real URLs
- Add `react-native-safe-area-context` polyfill if needed (already in deps)

The calendar app at `/home/ab/projects/calendar_app/calendar_react_native/` has battle-tested versions of all of these — copy and adapt.

## Known sharp edges

- **Native folders not committed** — you need to either generate them (`npx @react-native-community/cli init`) or copy from the calendar app. See setup section above.
- **Lucide icons not installed yet** — currently using unicode glyphs (◇ ▣ ✦ ● ◯) for tab icons. Looks OK but proper SVG icons are next.
- **Calendar grid is basic** — works, but doesn't support multi-day events, week view, list mode. Acceptable for v0.
- **No real images on Day 1** — `picsum.photos` + `loremflickr.com` placeholders. Real flyers + venue photos come from the CMS/backend.

## What I deliberately skipped (to keep this lean for "look at it")

- Inbox screen (Partners + Friends tabs) — easy add later
- Public profile screen (capability-driven) — skeleton ready in types/profiles
- Booking flow sheet, ticketing checkout sheet — placeholder CTAs sit in EventDetail
- Push notifications — `@notifee/react-native` ready to drop in once we have a backend trigger
- Real auth screens (register, forgot password)
- Real settings (password change, deletion, etc.)

All of these are 30-60min adds once you've seen the foundation and decided what's worth investing in.
