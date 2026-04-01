# word-match-kids — Claude Code Setup Guide

A kids' word-matching game built with React Native and Expo. Children spell words, find common letters between two picture words, then build new words from those letters.

## Prerequisites

- **Node.js v20** — install via [nvm](https://github.com/nvm-sh/nvm): `nvm install 20 && nvm use 20`
- **npm** (comes with Node)
- **Expo Go** app on your iOS or Android device (from App Store / Play Store)

## Install & Run

```bash
# 1. Clone the repo
git clone https://github.com/niksi091987-blip/kids-word-app.git
cd kids-word-app

# 2. Install dependencies
npm install

# 3. Start the dev server
npx expo start
```

Then scan the QR code with **Expo Go** on your phone.

### Run on specific platform
```bash
npx expo start --ios      # iOS simulator (requires Xcode on Mac)
npx expo start --android  # Android emulator (requires Android Studio)
```

## Project Structure

```
src/
├── screens/        # GameScreen, HomeScreen, LevelSelectScreen, ResultScreen
├── components/     # UI pieces: SpellingBoard, BuildWordSlots, TimerBar, etc.
├── context/        # GameContext (game state), ProgressContext (level progress)
├── hooks/          # useTimer, useSound, useSpeech
├── utils/          # gameLogic.js — puzzle generation, word validation
├── data/           # words.js (word list), wordEmojis.js (emoji mappings)
└── constants/      # colors, dimensions, config (scoring, timer values)
```

## Key Files

| File | Purpose |
|------|---------|
| `src/context/GameContext.js` | All game state and actions (reducer pattern) |
| `src/utils/gameLogic.js` | Puzzle generation, common letter finding, word validation |
| `src/hooks/useSpeech.js` | Text-to-speech: speakWord, speakPhonics, speakLetter |
| `src/screens/GameScreen.js` | Main game flow across all phases |
| `src/constants/config.js` | Timer durations, score values per level |

## Game Flow

1. **Spelling phase** — Kid spells word 1, then word 2 (shown as emoji picture)
2. **Common finding phase** — Kid taps letters that appear in BOTH words
3. **Word building phase** — Kid builds words using only the common letters found

## EAS Build (optional, for standalone app)

```bash
npm install -g eas-cli
eas build --platform android   # or ios
```

EAS Project ID: `d0d6128d-2553-4dd9-85d9-2afc2a3f4b9d`  
Android package: `com.avinjss.wordmatchkids`

## Notes for Claude Code

- Always run `npm install` first after cloning — do not commit `node_modules/`
- The app uses `react-native-reanimated` — babel plugin is already configured in `babel.config.js`
- `newArchEnabled: false` in `app.json` — keep this off to avoid reanimated compatibility issues
- Sound files live in `assets/sounds/` — referenced via `useSound` hook
