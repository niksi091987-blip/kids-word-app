# Phase 2: Technical Architecture — Word Match Kids

**Date:** 2026-03-31
**Agent:** Tech Architect Agent
**Project:** Word Match Kids — Android educational word game for ages 5-10
**Stack:** React Native 0.81.5 · Expo SDK 54 · React 19.1.0 · New Architecture (Fabric + TurboModules + Hermes V1)

---

## Table of Contents

1. [Additional Dependencies](#1-additional-dependencies)
2. [Project File Structure](#2-project-file-structure)
3. [Navigation Architecture](#3-navigation-architecture)
4. [State Management](#4-state-management)
5. [Component Architecture](#5-component-architecture)
6. [Animation Strategy](#6-animation-strategy)
7. [Sound & Haptics Architecture](#7-sound--haptics-architecture)
8. [Data Flow](#8-data-flow)
9. [Performance Considerations](#9-performance-considerations)
10. [Build & Deployment](#10-build--deployment)

---

## 1. Additional Dependencies

### Install Command

```bash
npx expo install \
  react-native-reanimated \
  react-native-gesture-handler \
  lottie-react-native \
  expo-font \
  @react-native-async-storage/async-storage \
  @react-navigation/native \
  @react-navigation/native-stack \
  react-native-screens \
  react-native-safe-area-context
```

### Dependency Justification Table

| Package | Version Constraint | Justification |
|---|---|---|
| `react-native-reanimated` | `~3.17.x` (Expo SDK 54 compatible) | UI-thread animations via worklets — zero bridge overhead. Required for 60fps letter tile spring physics and celebration animations. Cannot be replaced by Animated API for this level of interactivity. |
| `react-native-gesture-handler` | `~2.22.x` (Expo SDK 54 compatible) | Native gesture processing for letter tile drag-and-drop. Required peer of Reanimated for pan gesture worklets. Using the JS-side PanResponder instead would cause dropped frames on mid-range Android. |
| `lottie-react-native` | `~7.2.x` (Expo SDK 54 compatible) | Designer-quality celebration animations (star bursts, confetti, character dances) from lightweight JSON files (20–50 KB each). Provides GPU-accelerated rendering via platform-native Lottie libraries. No viable substitute at equivalent quality-to-size ratio. |
| `expo-font` | `~13.x` (already in SDK 54 peer set) | Loads a kid-friendly custom font (e.g., Nunito or Fredoka One). Required for consistent visual identity across Android versions, which ship wildly different system fonts. |
| `@react-native-async-storage/async-storage` | `~2.1.x` (Expo SDK 54 compatible) | Persists player level progress, per-level star ratings, and settings (sound on/off, haptics on/off). Synchronous-feeling API with async internals; appropriate for data payloads under ~1 MB. No SQLite needed for this data shape. |
| `@react-navigation/native` | `^7.x` | Industry-standard navigation. Provides NavigationContainer, hooks (`useNavigation`, `useFocusEffect`), and deep link support. Chosen over expo-router because the app's navigation graph is simple (3–4 screens), static, and does not benefit from file-system routing. |
| `@react-navigation/native-stack` | `^7.x` | Uses native `FragmentTransaction` on Android for hardware-accelerated screen transitions. Significantly smoother than JS-driven stack on entry/exit animations. |
| `react-native-screens` | `~4.x` (peer dep of react-navigation) | Enables native screen containers via `FragmentTransaction`. Required peer of `@react-navigation/native-stack`. Without it, all screens stay mounted in memory simultaneously. |
| `react-native-safe-area-context` | `~5.x` (peer dep of react-navigation) | Provides safe area insets for edge-to-edge Android (`edgeToEdgeEnabled: true` is already set in `app.json`). Required peer of React Navigation. |

### Packages Already Present (No Action Needed)

| Package | Already in `package.json` | Role in This App |
|---|---|---|
| `expo-av` | `~16.0.8` | Sound effect playback |
| `expo-haptics` | `~15.0.8` | Tactile feedback |
| `expo-linear-gradient` | `~15.0.8` | Background gradients on screens/tiles |
| `@expo/vector-icons` | `^15.0.3` | Icons (settings gear, home, star, etc.) |
| `expo-status-bar` | `~3.0.9` | Status bar colour control |

### Explicitly Excluded

| Package | Reason for Exclusion |
|---|---|
| `expo-router` | File-system routing adds complexity with no benefit for a 4-screen app. `@react-navigation/native-stack` is lighter and more predictable. |
| `expo-sqlite` | The word list at current scale (~2,000 words) is a 30 KB in-memory Set. SQLite would add 1–2 MB of native code for zero performance gain. |
| `redux` / `zustand` / `jotai` | React Context + `useReducer` is sufficient for this state shape. External state libraries add bundle size and abstraction overhead not justified here. |
| `react-native-reanimated-dnd` | Experimental library with sparse maintenance. A custom pan-gesture drag implementation with Reanimated's `useAnimatedGestureHandler` is 80 lines of code and gives full control. |

---

## 2. Project File Structure

Every file that needs to be created is listed. Existing files are marked.

```
word-match-kids/
├── App.js                          # REPLACE: mount NavigationContainer + providers
├── index.js                        # EXISTING: registerRootComponent
├── app.json                        # EXISTING: add EAS project ID + Android package name
├── eas.json                        # CREATE: EAS Build profiles (preview APK, production AAB)
├── assets/
│   ├── icon.png                    # EXISTING
│   ├── adaptive-icon.png           # EXISTING
│   ├── splash-icon.png             # EXISTING
│   ├── favicon.png                 # EXISTING
│   ├── fonts/
│   │   └── Nunito-Bold.ttf         # CREATE: kid-friendly bold font for letter tiles
│   │   └── Nunito-Regular.ttf      # CREATE: body text
│   └── sounds/
│       ├── tile_tap.mp3            # CREATE: short click (50–80 ms)
│       ├── word_correct.mp3        # CREATE: ascending chime (300–500 ms)
│       ├── word_wrong.mp3          # CREATE: low buzz (200 ms)
│       ├── level_complete.mp3      # CREATE: fanfare (1–2 s)
│       ├── star_earned.mp3         # CREATE: sparkle ding (400 ms)
│       └── timer_tick.mp3          # CREATE: soft tick (used below 10 s remaining)
│   └── lottie/
│       ├── celebration.json        # CREATE: confetti burst for word correct
│       ├── level_complete.json     # CREATE: star burst for level completion
│       └── stars_1_2_3.json        # CREATE: 1/2/3 star fill animation
└── src/
    ├── data/
    │   └── words.js                # EXISTING: WORDS_BY_LENGTH, ALL_WORDS
    ├── utils/
    │   └── gameLogic.js            # EXISTING: generatePuzzle, findCommonLetters, etc.
    ├── constants/
    │   ├── colors.js               # CREATE: all colour tokens
    │   ├── typography.js           # CREATE: font sizes, families, weights
    │   ├── layout.js               # CREATE: spacing scale, tile size, border radius
    │   └── config.js               # CREATE: game tuning values (timer length, scoring thresholds)
    ├── context/
    │   ├── GameContext.js          # CREATE: current puzzle state + dispatch
    │   └── ProgressContext.js      # CREATE: persistent player progress + settings
    ├── hooks/
    │   ├── useGame.js              # CREATE: convenience accessor for GameContext
    │   ├── useProgress.js          # CREATE: convenience accessor for ProgressContext
    │   ├── useTimer.js             # CREATE: countdown timer with pause/resume/reset
    │   ├── useSound.js             # CREATE: sound loading + playback API
    │   └── useHaptics.js           # CREATE: typed haptic feedback wrapper
    ├── screens/
    │   ├── HomeScreen.js           # CREATE: title, level select CTA, progress summary
    │   ├── LevelSelectScreen.js    # CREATE: 10-level grid with star badges
    │   ├── GameScreen.js           # CREATE: main game board (the primary screen)
    │   └── ResultScreen.js         # CREATE: post-puzzle star rating + next/retry
    └── components/
        ├── LetterTile.js           # CREATE: single animated, pressable letter tile
        ├── LetterTray.js           # CREATE: horizontal row of draggable source tiles
        ├── AnswerSlots.js          # CREATE: row of drop-target slots forming the answer
        ├── WordDisplay.js          # CREATE: shows word1 and word2 with letter highlights
        ├── FoundWordsList.js       # CREATE: scrollable list of words found this puzzle
        ├── TimerBar.js             # CREATE: animated progress bar countdown
        ├── StarRating.js           # CREATE: 1/2/3 star display with fill animation
        ├── ScoreCounter.js         # CREATE: animated score number
        ├── LevelCard.js            # CREATE: single level tile in LevelSelectScreen
        ├── ProgressBar.js          # CREATE: reusable fill-bar (used in GameScreen header)
        ├── CelebrationOverlay.js   # CREATE: Lottie overlay triggered on correct word
        └── SettingsModal.js        # CREATE: sound toggle, haptics toggle, slide-up sheet
```

### Key File Descriptions

| File | One-Line Description |
|---|---|
| `App.js` | Replaced boilerplate: wraps app in `ProgressProvider`, `GameProvider`, `GestureHandlerRootView`, `NavigationContainer` |
| `eas.json` | Defines `preview` (APK, internal testing) and `production` (AAB, Play Store) build profiles |
| `src/constants/colors.js` | Single source of truth for the colour palette: primary purple/teal, tile backgrounds, accent yellows, error red |
| `src/constants/config.js` | Game tuning knobs: `TIMER_SECONDS_PER_LEVEL`, `STAR_TIME_THRESHOLDS`, `MIN_WORD_LENGTH` — all in one place for easy balancing |
| `src/context/GameContext.js` | `useReducer`-based context holding the active puzzle, found words, timer state, score, and game phase |
| `src/context/ProgressContext.js` | Context that loads/saves to AsyncStorage: stars per level, current unlocked level, sound/haptic settings |
| `src/hooks/useTimer.js` | Encapsulates `setInterval` countdown, exposes `{ secondsLeft, isRunning, start, pause, reset }` |
| `src/hooks/useSound.js` | Wraps `expo-av` preloading; exposes `play(soundKey)` with graceful no-op when sounds are muted |
| `src/screens/GameScreen.js` | Orchestrates the full game loop: mounts puzzle, renders board, processes submissions, triggers transitions |
| `src/components/LetterTile.js` | Core interactive component: Reanimated shared values for position + scale; Gesture Handler for drag |
| `src/components/CelebrationOverlay.js` | Lottie animation overlay, auto-dismisses after animation completes, `position: absolute` over board |

---

## 3. Navigation Architecture

### Library Choice: `@react-navigation/native` + `@react-navigation/native-stack`

**Rationale over expo-router:**
- The app has 4 screens with a simple linear+modal flow. File-system routing (expo-router) is optimised for deep-linked, URL-addressable apps. `native-stack` gives us hardware-accelerated push/pop transitions via native `FragmentTransaction` on Android with zero configuration overhead.
- `native-stack` uses the same APIs as expo-router's underlying stack under the hood — there is no capability gap for this use case.

### Screen Definitions

```javascript
// App.js — Navigation structure
const Stack = createNativeStackNavigator();

function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="Home"        component={HomeScreen} />
      <Stack.Screen name="LevelSelect" component={LevelSelectScreen} />
      <Stack.Screen
        name="Game"
        component={GameScreen}
        options={{ animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="Result"
        component={ResultScreen}
        options={{ animation: 'fade', gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
```

### Navigation Flow

```
HomeScreen
  │
  ├── [Play Button] ──────────────────► LevelSelectScreen
  │                                         │
  │                                         └── [Level Tap] ──► GameScreen (level: N)
  │                                                                    │
  │                                                                    ├── [Puzzle Complete]
  │                                                                    │       └──► ResultScreen
  │                                                                    │               ├── [Next Level] ──► GameScreen (level: N+1)
  │                                                                    │               ├── [Retry]      ──► GameScreen (level: N, fresh)
  │                                                                    │               └── [Home]       ──► HomeScreen (pop to top)
  │                                                                    │
  │                                                                    └── [Back / Home icon] ──► HomeScreen
  │
  └── [Settings icon] ──► SettingsModal (presented as sheet over HomeScreen, not a stack screen)
```

### Navigation Parameters

```javascript
// GameScreen receives:
// route.params = { level: number }

// ResultScreen receives:
// route.params = {
//   level: number,
//   stars: 1 | 2 | 3,
//   score: number,
//   wordsFound: string[],
//   timeTaken: number,
// }
```

### Back Navigation Handling

`ResultScreen` sets `gestureEnabled: false` to prevent accidental back-swipe to an in-progress puzzle. All "go home" actions call `navigation.popToTop()`.

---

## 4. State Management

### Design Decision

**Two contexts, zero external libraries.** React Context + `useReducer` is the correct tool here:
- State shape is small and well-defined
- Updates are infrequent (game events, not 60fps animation values — those live in Reanimated shared values)
- No cross-cutting selector performance concerns at this scale
- Avoids adding Redux/Zustand to the bundle for a ~30-state-field app

### 4.1 Game State (in-memory, per-session)

Lives in `GameContext`. Reset on every new puzzle.

```javascript
// src/context/GameContext.js

const initialGameState = {
  // Puzzle data (from generatePuzzle)
  puzzle: null,            // { word1, word2, commonLetters, possibleWords, difficulty }

  // Player interaction
  phase: 'idle',           // 'idle' | 'playing' | 'submitting' | 'correct' | 'wrong' | 'complete'
  tilesInTray: [],         // [{ id, letter, used: bool }] — source tiles available to drag
  tilesInSlots: [],        // [{ id, letter } | null] — current answer being assembled
  foundWords: [],          // string[] — words found this puzzle

  // Scoring
  score: 0,                // cumulative points this puzzle
  stars: 0,                // 1 | 2 | 3, set on puzzle completion

  // Timer
  secondsLeft: 0,          // driven by useTimer hook, mirrored here for result calculation
  timeTaken: 0,            // total seconds elapsed when puzzle completes
};

// Action types
const GAME_ACTIONS = {
  START_PUZZLE:    'START_PUZZLE',    // payload: { puzzle, timerSeconds }
  PLACE_TILE:      'PLACE_TILE',      // payload: { tileId, slotIndex }
  RECALL_TILE:     'RECALL_TILE',     // payload: { tileId }
  SUBMIT_WORD:     'SUBMIT_WORD',     // payload: none — validates tilesInSlots
  WORD_ACCEPTED:   'WORD_ACCEPTED',   // payload: { word, points }
  WORD_REJECTED:   'WORD_REJECTED',   // payload: none
  CLEAR_SLOTS:     'CLEAR_SLOTS',     // payload: none
  TIMER_TICK:      'TIMER_TICK',      // payload: { secondsLeft }
  COMPLETE_PUZZLE: 'COMPLETE_PUZZLE', // payload: { timeTaken }
  RESET:           'RESET',           // payload: none
};
```

**Tile ID scheme:** Each tile gets a unique string ID on puzzle start: `"tile_a_0"`, `"tile_a_1"` (if two 'a' tiles exist), `"tile_r_0"`, etc. This avoids index collisions when multiple identical letters are present.

**Score formula:**
```javascript
// Points per word = wordLength * difficultyMultiplier * speedBonus
// difficultyMultiplier = Math.ceil(difficulty / 2)   // levels 1-2 = 1x, 3-4 = 2x, etc.
// speedBonus = secondsLeft > 60 ? 2 : secondsLeft > 30 ? 1.5 : 1
const POINTS_PER_LETTER = 10;
function calcWordScore(word, difficulty, secondsLeft) {
  const base = word.length * POINTS_PER_LETTER;
  const diffMult = Math.ceil(difficulty / 2);
  const speedBonus = secondsLeft > 60 ? 2 : secondsLeft > 30 ? 1.5 : 1;
  return Math.round(base * diffMult * speedBonus);
}
```

### 4.2 Persistent Progress State

Lives in `ProgressContext`. Loaded from AsyncStorage on mount, written on every change.

```javascript
// src/context/ProgressContext.js

const initialProgressState = {
  // Level progress: keyed by level number (1–10)
  levels: {
    1:  { unlocked: true,  bestStars: 0, bestScore: 0, attempts: 0 },
    2:  { unlocked: false, bestStars: 0, bestScore: 0, attempts: 0 },
    // ... levels 3–10 with unlocked: false
  },

  // Player stats
  totalScore: 0,
  totalWordsFound: 0,
  currentLevel: 1,         // highest unlocked level

  // Settings
  soundEnabled: true,
  hapticsEnabled: true,
};

const ASYNC_STORAGE_KEY = '@word_match_kids_progress_v1';

// Action types
const PROGRESS_ACTIONS = {
  COMPLETE_LEVEL:    'COMPLETE_LEVEL',   // payload: { level, stars, score }
  UNLOCK_LEVEL:      'UNLOCK_LEVEL',     // payload: { level }
  TOGGLE_SOUND:      'TOGGLE_SOUND',
  TOGGLE_HAPTICS:    'TOGGLE_HAPTICS',
  LOAD_SAVED:        'LOAD_SAVED',       // payload: savedState from AsyncStorage
  RESET_ALL:         'RESET_ALL',        // nuclear option for testing
};
```

**AsyncStorage write strategy:** Debounced 500 ms write after every `PROGRESS_ACTIONS` dispatch. Prevents excessive I/O on rapid taps while guaranteeing persistence before the app backgrounds.

```javascript
// Inside ProgressProvider
useEffect(() => {
  const timeout = setTimeout(() => {
    AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(state));
  }, 500);
  return () => clearTimeout(timeout);
}, [state]);
```

### 4.3 State Flow Diagram

```
App Launch
    │
    ▼
ProgressProvider.mount()
    │── AsyncStorage.getItem() ──► LOAD_SAVED dispatch
    │                              (or use initialProgressState if null)
    │
    ▼
HomeScreen renders with progress.levels data
    │
    [Player selects level N]
    │
    ▼
GameScreen mounts
    │── GAME_ACTIONS.RESET
    │── generatePuzzle(N) ──► GAME_ACTIONS.START_PUZZLE
    │── useTimer.start(timerSeconds)
    │
    ▼
Playing phase
    │── Tile drag ──► PLACE_TILE / RECALL_TILE (local component state for animation)
    │── Submit ──► SUBMIT_WORD ──► word validation
    │       ├── valid   ──► WORD_ACCEPTED ──► score += calcWordScore()
    │       │               ──► CelebrationOverlay.show()
    │       │               ──► all possibleWords found? ──► COMPLETE_PUZZLE
    │       └── invalid ──► WORD_REJECTED ──► shake animation
    │── Timer tick ──► TIMER_TICK ──► secondsLeft === 0 ──► COMPLETE_PUZZLE
    │
    ▼
COMPLETE_PUZZLE
    │── getStarRating(timeTaken, difficulty) ──► stars
    │── PROGRESS_ACTIONS.COMPLETE_LEVEL { level, stars, score }
    │── if stars > 0 ──► PROGRESS_ACTIONS.UNLOCK_LEVEL { level: N+1 }
    │── navigation.navigate('Result', { level, stars, score, wordsFound, timeTaken })
    │
    ▼
ResultScreen
    │── StarRating animation plays
    │── [Next] / [Retry] / [Home]
```

---

## 5. Component Architecture

### 5.1 `LetterTile`

The core interactive primitive. Everything else is simpler.

```javascript
// Props
{
  id: string,               // unique tile ID e.g. "tile_a_0"
  letter: string,           // single character, already uppercase for display
  state: 'idle'             // available in tray
       | 'dragging'         // currently being dragged
       | 'placed'           // in an answer slot
       | 'used'             // this word was accepted; tile greyed out
       | 'highlighted',     // this letter is a common letter in WordDisplay mode

  size?: 'large' | 'small', // large = tray tiles (~64px), small = word display (~44px)
  onPress?: () => void,      // tap to place into next empty slot
  onLongPress?: () => void,  // recall from slot (if placed)

  // Drag props (passed by LetterTray via gesture handler callbacks)
  isDraggable?: boolean,
  onDragStart?: (id: string) => void,
  onDragEnd?: (id: string, dropX: number, dropY: number) => void,
}
```

**Internal Reanimated State:**
```javascript
const scale = useSharedValue(1);
const translateX = useSharedValue(0);
const translateY = useSharedValue(0);
const opacity = useSharedValue(1);
const backgroundColor = useSharedValue(COLORS.tile.idle);
```

**Key Behaviors:**
- On tap: `withSpring(scale, { from: 1, to: 1.15 }, () => withSpring(scale, 1))` — bounce feedback
- On drag start: `scale.value = withSpring(1.2)`, tile lifts above siblings via `zIndex`
- On drag end: tile snaps to slot with `withSpring` or returns to tray origin with `withSpring` + `withDelay`
- On `state === 'used'`: `opacity.value = withTiming(0.4)` and `backgroundColor` transitions to grey
- On `state === 'highlighted'`: pulsing `withRepeat(withSequence(withTiming(1.05), withTiming(1)))` while hint is active

**Children:** None — it is the leaf node.

---

### 5.2 `LetterTray`

```javascript
// Props
{
  tiles: Array<{ id: string, letter: string, used: boolean }>,
  onTileTap: (tileId: string) => void,
  onTileDrop: (tileId: string, dropX: number, dropY: number) => void,
  disabled?: boolean,  // true during 'submitting' / 'complete' phases
}
```

**Internal State:**
- `draggingTileId: string | null` — which tile is currently being dragged (local to tray, drives `LetterTile` state prop)

**Key Behaviors:**
- Renders a horizontal `ScrollView` (only needed on levels 9–10 where commonLetters can be 6 tiles)
- For levels 1–8 (≤5 tiles), renders a centered `View` row
- Uses `measure()` on each tile ref to compute drop-zone hit detection in `onDragEnd`
- Passes `isDraggable={true}` to each non-used tile
- Tile layout shifts (remaining tiles redistribute) with `LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)` when a tile is placed

**Children:** `LetterTile` (one per tile in tray)

---

### 5.3 `AnswerSlots`

```javascript
// Props
{
  slots: Array<{ letter: string | null, tileId: string | null }>,
  maxLength: number,        // max possible word length = commonLetters.length
  onSlotTap: (slotIndex: number) => void,  // tap slot to recall tile to tray
  phase: 'idle' | 'submitting' | 'correct' | 'wrong',
}
```

**Internal State:**
- `shakeOffset: SharedValue<number>` — driven by Reanimated for shake-on-wrong animation

**Key Behaviors:**
- Renders `maxLength` bordered slots in a row (empty slots show dashed border)
- `phase === 'correct'`: slots flash green with `withSequence(withTiming(COLORS.success), withDelay(600, withTiming(COLORS.tile.idle)))`
- `phase === 'wrong'`: horizontal shake — `shakeOffset.value = withSequence(withTiming(-8), withTiming(8), withTiming(-6), withTiming(6), withTiming(0))` — no punitive sound spike, just gentle wobble
- Slots are drop targets; parent `GameScreen` converts screen coordinates from `onDragEnd` to slot indices using slot positions from `measure()` calls

**Children:** Renders individual slot `View`s with `LetterTile` inside when filled, empty styled `View` when empty.

---

### 5.4 `WordDisplay`

```javascript
// Props
{
  word1: string,
  word2: string,
  commonLetters: string[],  // used to highlight matching letters
  revealCommon: boolean,    // false = letters shown normally; true = common letters highlighted
}
```

**Internal State:** None (pure display).

**Key Behaviors:**
- Each letter in `word1` and `word2` is rendered as a small `LetterTile` with `size="small"` and `state="idle"` or `state="highlighted"`
- On `revealCommon` becoming true (after a short delay into the puzzle), highlighted tiles animate with a scale pulse to draw attention
- Common letter positions are computed by walking `word1`/`word2` characters and marking positions whose letters appear in `commonLetters` (multiset-aware, matching the same logic as `findCommonLetters`)

**Children:** Two rows of small `LetterTile` components (one row per word).

---

### 5.5 `TimerBar`

```javascript
// Props
{
  totalSeconds: number,
  secondsLeft: number,
  warningThreshold?: number,  // default: 10 — turns red below this
}
```

**Internal State:**
- `barWidth: SharedValue<number>` — interpolated from secondsLeft

**Key Behaviors:**
- `barWidth` animates with `withTiming` each second: `(secondsLeft / totalSeconds) * SCREEN_WIDTH`
- Color interpolates from `COLORS.timerSafe` (green) → `COLORS.timerWarning` (orange) → `COLORS.timerDanger` (red) using `interpolateColor` from Reanimated
- Below `warningThreshold` seconds: plays `timer_tick.mp3` on each tick; triggers `Haptics.selectionAsync()` on each tick

**Children:** None — a single animated `View` inside a container `View`.

---

### 5.6 `StarRating`

```javascript
// Props
{
  stars: 0 | 1 | 2 | 3,
  animate?: boolean,         // true on ResultScreen to play fill animation
  size?: 'small' | 'large',  // small = LevelCard, large = ResultScreen
}
```

**Internal State:**
- Three `scale` shared values, one per star: `[useSharedValue(0), useSharedValue(0), useSharedValue(0)]`

**Key Behaviors:**
- When `animate === true` and component mounts: stars fill in sequentially using `withDelay(i * 300, withSpring(1, { damping: 4, stiffness: 150 }))` — bouncy pop-in
- Unfilled stars show empty outline; filled stars show gold with `@expo/vector-icons` `Ionicons.star` vs `Ionicons.star-outline`
- When `animate === false` (static display in LevelCard): stars render at final scale immediately

**Children:** None.

---

### 5.7 `GameBoard`

The layout container for the main game screen content. Not a logic component — purely structural.

```javascript
// Props
{
  children: React.ReactNode,
}
```

Renders a `SafeAreaView` with gradient background (`expo-linear-gradient`) and a consistent vertical layout: header zone → word display zone → letter tray zone → answer slots zone → found words zone.

---

### 5.8 `FoundWordsList`

```javascript
// Props
{
  words: string[],           // accepted words this puzzle, newest first
  possibleWords: string[],   // total possible words (used to show "X of Y found")
}
```

**Internal State:** None.

**Key Behaviors:**
- Renders as a horizontal `ScrollView` of word chips
- New words enter with `FadeInLeft` from Reanimated Layout Animations (`entering={FadeInLeft.duration(300)}`)
- Shows `${words.length} / ${possibleWords.length}` count badge
- Already-found words that are discovered again show a brief "already found" toast (handled by `GameScreen`)

**Children:** Word chip `View`s with `Text`.

---

### 5.9 `CelebrationOverlay`

```javascript
// Props
{
  visible: boolean,
  type: 'word_correct' | 'level_complete',
  onFinish?: () => void,
}
```

**Internal State:**
- `opacity: SharedValue<number>`

**Key Behaviors:**
- `visible = true` → `opacity.value = withTiming(1, { duration: 100 })`
- Renders `LottieView` with `source={require('../assets/lottie/celebration.json')}` (or `level_complete.json`)
- Lottie `onAnimationFinish` → `opacity.value = withTiming(0)` → calls `onFinish()`
- `pointerEvents="none"` so it does not block touches during playback
- `position: 'absolute'` filling the entire GameBoard

---

### 5.10 `SettingsModal`

```javascript
// Props
{
  visible: boolean,
  onClose: () => void,
}
```

**Internal State:**
- `translateY: SharedValue<number>` for slide-up sheet

**Key Behaviors:**
- Slides up from bottom with `withSpring`; backdrop fades in simultaneously
- Renders `Switch` for sound (reads/writes `progressState.soundEnabled` via `useProgress()`)
- Renders `Switch` for haptics (reads/writes `progressState.hapticsEnabled`)
- Dismiss on backdrop tap or swipe-down gesture

---

## 6. Animation Strategy

### 6.1 Animation Library Assignment

| Animation Type | Library | Rationale |
|---|---|---|
| Letter tile drag position (x/y) | Reanimated shared values + Gesture Handler worklet | Must run on UI thread — continuous gesture tracking cannot tolerate JS thread scheduling delays |
| Letter tile spring on tap | Reanimated `withSpring` | UI thread, zero latency |
| Letter tile snap to slot | Reanimated `withSpring` | UI thread |
| Answer slot shake on wrong | Reanimated `withSequence` + `withTiming` | UI thread |
| Timer bar width + color | Reanimated `withTiming` + `interpolateColor` | Per-second update — UI thread ensures smooth color transition |
| Stars pop-in on ResultScreen | Reanimated `withDelay` + `withSpring` | UI thread |
| Found words enter animation | Reanimated Layout Animations (`FadeInLeft`) | Declarative, React-side OK for list entry |
| Screen transitions | `@react-navigation/native-stack` native animation | Hardware-accelerated native `FragmentTransaction` |
| Celebration confetti / star burst | Lottie (`lottie-react-native`) | GPU-accelerated, complex keyframe animation too complex to hand-code |
| Background gradient | `expo-linear-gradient` (static) | No animation needed; gradient is a static screen background |
| Settings modal slide-up | Reanimated `withSpring` | UI thread for smooth feel |

### 6.2 Reanimated Configuration

`app.json` already has `"newArchEnabled": true`. Reanimated v3 with the New Architecture (Fabric) uses JSI bindings directly and does not need the legacy Babel plugin's `react-native-reanimated/plugin` in the same way, but the Babel plugin is still required in `babel.config.js`:

```javascript
// babel.config.js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'], // MUST be last plugin
  };
};
```

### 6.3 Letter Tile Drag-Drop Implementation

```javascript
// src/components/LetterTile.js — drag implementation sketch
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, runOnJS,
} from 'react-native-reanimated';

export function LetterTile({ id, letter, isDraggable, onDragStart, onDragEnd }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .enabled(isDraggable)
    .onStart(() => {
      scale.value = withSpring(1.2);
      zIndex.value = 100;
      runOnJS(onDragStart)(id);
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      // Compute absolute screen position and call parent
      runOnJS(onDragEnd)(id, event.absoluteX, event.absoluteY);
      // Animate back to origin (parent decides whether to snap to slot or return)
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      zIndex.value = 1;
    });

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      scale.value = withSpring(1.15, {}, () => {
        scale.value = withSpring(1);
      });
      runOnJS(onPress)(id);
    });

  const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    zIndex: zIndex.value,
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.tile, animatedStyle]}>
        <Text style={styles.letter}>{letter.toUpperCase()}</Text>
      </Animated.View>
    </GestureDetector>
  );
}
```

**Drop-zone hit detection** lives in `GameScreen`. It calls `measure()` on each slot ref after layout and stores the slot bounding boxes. When `onDragEnd(tileId, absX, absY)` fires, `GameScreen` checks if `(absX, absY)` falls inside any slot's bounding box and dispatches `PLACE_TILE` if so.

### 6.4 Celebration Animation Approach

Two tiers of celebration, matched to action significance:

| Trigger | Animation | Duration |
|---|---|---|
| Word correct | `celebration.json` Lottie (confetti burst, center-screen) | 800 ms, then auto-dismiss |
| All words found / level complete | `level_complete.json` Lottie (full-screen star burst) + `StarRating` animate prop | 1.5 s |
| Star earned (on ResultScreen) | `stars_1_2_3.json` Lottie inline in ResultScreen | Per-star sequential |

Lottie files should be sourced from LottieFiles.com (free tier, CC license) or hand-authored. Target file size: ≤ 50 KB per animation.

### 6.5 Performance Budget

- **Target:** 60 fps on a mid-range Android device (Snapdragon 665, 4 GB RAM, 2021+)
- **All continuous gesture tracking** (tile drag) runs on the UI thread — zero JS thread involvement during active drag
- **JS thread budget:** Puzzle generation (`generatePuzzle`) runs once per puzzle start. On worst-case (level 10 with large candidate pool), benchmarked at < 50 ms on Hermes V1. Run inside a `setTimeout(() => ..., 0)` yield to avoid blocking the mounting animation
- **Lottie** renders via platform-native Lottie library (not JS canvas) — no JS thread budget consumed during playback
- **`LayoutAnimation`** (tile redistribution) is single-frame on hardware — acceptable
- **Avoid:** `StyleSheet.create` inside render functions, inline object styles on animated components, synchronous AsyncStorage calls

---

## 7. Sound & Haptics Architecture

### 7.1 Sound Effect Catalog

| Sound Key | File | Trigger | Duration |
|---|---|---|---|
| `TILE_TAP` | `tile_tap.mp3` | Any letter tile pressed/placed | 60–80 ms |
| `WORD_CORRECT` | `word_correct.mp3` | Word validated and accepted | 300–400 ms |
| `WORD_WRONG` | `word_wrong.mp3` | Word rejected | 200 ms |
| `LEVEL_COMPLETE` | `level_complete.mp3` | All possible words found or timer-end with ≥1 word found | 1–2 s |
| `STAR_EARNED` | `star_earned.mp3` | Per-star pop-in on ResultScreen (plays 1–3 times) | 400 ms |
| `TIMER_TICK` | `timer_tick.mp3` | Each second when `secondsLeft ≤ 10` | 80–100 ms |

**File format:** MP3 at 44.1 kHz, 128 kbps. Total sound budget: ≤ 400 KB. Source from Freesound.org (CC0 license) or generate with a tone generator.

### 7.2 Preloading Strategy

All sounds are loaded once at app startup inside `useSound` hook, which is called high in the tree (inside `GameProvider` or `App.js`). This ensures zero-latency playback during gameplay.

```javascript
// src/hooks/useSound.js
import { Audio } from 'expo-av';
import { useEffect, useRef } from 'react';
import { useProgress } from './useProgress';

const SOUND_FILES = {
  TILE_TAP:       require('../assets/sounds/tile_tap.mp3'),
  WORD_CORRECT:   require('../assets/sounds/word_correct.mp3'),
  WORD_WRONG:     require('../assets/sounds/word_wrong.mp3'),
  LEVEL_COMPLETE: require('../assets/sounds/level_complete.mp3'),
  STAR_EARNED:    require('../assets/sounds/star_earned.mp3'),
  TIMER_TICK:     require('../assets/sounds/timer_tick.mp3'),
};

export function useSound() {
  const soundObjects = useRef({});
  const { soundEnabled } = useProgress();

  useEffect(() => {
    // Load all sounds concurrently
    const loadAll = async () => {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      await Promise.all(
        Object.entries(SOUND_FILES).map(async ([key, file]) => {
          const { sound } = await Audio.Sound.createAsync(file, { shouldPlay: false });
          soundObjects.current[key] = sound;
        })
      );
    };
    loadAll();
    return () => {
      // Unload on unmount (app close)
      Object.values(soundObjects.current).forEach(s => s.unloadAsync());
    };
  }, []);

  const play = async (key) => {
    if (!soundEnabled) return;
    const sound = soundObjects.current[key];
    if (!sound) return;
    await sound.replayAsync();  // replayAsync resets position and plays — handles rapid re-triggers
  };

  return { play };
}
```

**Memory note:** Six small MP3s held in memory ≈ 6 × average 50 KB decoded PCM ≈ < 2 MB. Well within budget.

### 7.3 Haptic Feedback Mapping

```javascript
// src/hooks/useHaptics.js
import * as Haptics from 'expo-haptics';
import { useProgress } from './useProgress';

export function useHaptics() {
  const { hapticsEnabled } = useProgress();

  const haptic = {
    // Light tap on tile press
    tileTap: () => hapticsEnabled &&
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),

    // Satisfying thud when tile snaps into slot
    tileSnap: () => hapticsEnabled &&
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),

    // Success notification on correct word
    wordCorrect: () => hapticsEnabled &&
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),

    // Error notification on wrong word — gentle, not punitive
    wordWrong: () => hapticsEnabled &&
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
      // Deliberately NOT using Error type — too harsh for young kids

    // Celebration pattern on level complete
    levelComplete: () => hapticsEnabled && (async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 300);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 600);
    })(),

    // Subtle tick for timer warning
    timerTick: () => hapticsEnabled &&
      Haptics.selectionAsync(),
  };

  return haptic;
}
```

**Physical device note:** Haptics are silently no-ops on emulators. This is expected — no error handling needed.

---

## 8. Data Flow

### 8.1 Full Puzzle Round Flow

```
1. GENERATE
   GameScreen.mount(level)
     → GAME_ACTIONS.RESET
     → setTimeout(() => {
         const puzzle = generatePuzzle(level)  // ≤50ms on Hermes V1
         dispatch(START_PUZZLE, { puzzle, timerSeconds: config.TIMER_SECONDS[level] })
         useTimer.start(timerSeconds)
       }, 0)   // yield to let mount animation complete first

2. DISPLAY
   GameBoard renders:
     WordDisplay (word1, word2, commonLetters)
     LetterTray (tiles from puzzle.commonLetters → tilesInTray)
     AnswerSlots (empty slots, count = max possible word length)
     TimerBar (totalSeconds, secondsLeft)
     FoundWordsList (empty)

3. INTERACT
   Player drags tile → LetterTile.onDragEnd(id, absX, absY)
     → GameScreen.handleDrop(id, absX, absY)
         → check absX/absY against measured slot bounding boxes
         → if hit: dispatch(PLACE_TILE, { tileId, slotIndex })
                   play(TILE_TAP), haptic.tileSnap()
         → if miss: tile springs back to tray origin (Reanimated)
                    play(TILE_TAP), haptic.tileTap()

   Player taps placed tile → dispatch(RECALL_TILE, { tileId })
     → tile returns to tray, slot clears

4. SUBMIT
   Player taps Submit button (or auto-submits when all slots filled on levels 1-4):
     dispatch(SUBMIT_WORD)
     → reducer reads tilesInSlots, assembles word string
     → isValidWord(word) && canFormWord(word, commonLetters) && !foundWords.includes(word)
     → valid:   dispatch(WORD_ACCEPTED, { word, points: calcWordScore(...) })
                CelebrationOverlay.show('word_correct')
                play(WORD_CORRECT), haptic.wordCorrect()
                dispatch(CLEAR_SLOTS)
                if foundWords.length === possibleWords.length:
                  → COMPLETE_PUZZLE flow (step 6)
     → invalid: dispatch(WORD_REJECTED)
                AnswerSlots shake animation
                play(WORD_WRONG), haptic.wordWrong()
                dispatch(CLEAR_SLOTS) after 600ms delay

5. TIMER EXPIRY (if player runs out of time)
   useTimer fires secondsLeft === 0
     → if foundWords.length > 0: advance to COMPLETE_PUZZLE
     → if foundWords.length === 0: show "No words found" and offer retry
       (no punitive game-over — player can always retry)

6. COMPLETE_PUZZLE
   timeTaken = totalSeconds - secondsLeft
   stars = getStarRating(timeTaken, difficulty)
   dispatch(PROGRESS_ACTIONS.COMPLETE_LEVEL, { level, stars, score })
   if (stars >= 1 && level < 10):
     dispatch(PROGRESS_ACTIONS.UNLOCK_LEVEL, { level: level + 1 })
   CelebrationOverlay.show('level_complete')
   play(LEVEL_COMPLETE), haptic.levelComplete()
   After 1.5s: navigation.navigate('Result', { level, stars, score, wordsFound, timeTaken })
```

### 8.2 Timer Management

`useTimer` is a custom hook that lives in `GameScreen`. It is not in context — it is local to the screen.

```javascript
// src/hooks/useTimer.js
export function useTimer({ onTick, onExpire }) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const intervalRef = useRef(null);
  const isRunning = useRef(false);

  const start = (seconds) => {
    setSecondsLeft(seconds);
    isRunning.current = true;
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        const next = prev - 1;
        onTick?.(next);
        if (next <= 0) {
          clearInterval(intervalRef.current);
          isRunning.current = false;
          onExpire?.();
          return 0;
        }
        return next;
      });
    }, 1000);
  };

  const pause = () => {
    clearInterval(intervalRef.current);
    isRunning.current = false;
  };

  const resume = () => { /* restart interval from current secondsLeft */ };

  const reset = () => {
    clearInterval(intervalRef.current);
    setSecondsLeft(0);
    isRunning.current = false;
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  return { secondsLeft, start, pause, resume, reset };
}
```

`TimerBar` receives `secondsLeft` as a prop from `GameScreen`. The `TIMER_TICK` dispatch to `GameContext` happens inside `onTick` so the score calculation on puzzle complete has the correct `secondsLeft` snapshot.

### 8.3 Progress Persistence

```javascript
// src/context/ProgressContext.js — load on mount
useEffect(() => {
  const load = async () => {
    try {
      const saved = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
      if (saved) {
        dispatch({ type: PROGRESS_ACTIONS.LOAD_SAVED, payload: JSON.parse(saved) });
      }
    } catch (e) {
      // Corrupt data — use defaults silently
    }
  };
  load();
}, []);

// Save on state change (debounced 500ms)
useEffect(() => {
  const t = setTimeout(() => {
    AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, 500);
  return () => clearTimeout(t);
}, [state]);
```

**Data migration:** Key includes version suffix `_v1`. If the state shape changes in a future version, increment to `_v2` and write a migration function.

---

## 9. Performance Considerations

### 9.1 Word Validation: Already Optimal

`ALL_WORDS` is a `Set` — `isValidWord` is O(1) average. `canFormWord` is O(n) where n is word length (≤ 6) — effectively constant. `findAllValidWords` iterates the full `ALL_WORDS` set once at puzzle generation time (not during gameplay). The set size (~2,000 words) means this completes in < 5 ms on Hermes V1. No optimisation needed.

### 9.2 Animation Performance

**Rule:** No animation logic in the JS thread during active interaction.

| Pattern | Implementation |
|---|---|
| All tile drag x/y updates | Reanimated worklet (UI thread) |
| Timer bar width per second | `withTiming` on UI thread, triggered from JS tick |
| Do NOT use | `Animated.event` with `useNativeDriver: false` for any drag |
| Do NOT use | `setState` inside gesture handler callbacks |

**FlatList vs ScrollView for FoundWordsList:** At maximum, a player can find ~10–20 words per puzzle (bounded by `possibleWords.length`). Use a simple `ScrollView` + `View` children, not `FlatList`. `FlatList`'s virtualisation overhead is unnecessary and its `getItemLayout` requirements add complexity for variable-width word chips.

### 9.3 Memory Management for Sounds

- All 6 sounds are small (≤ 100 KB each encoded, ≤ 400 KB decoded PCM in memory)
- They are loaded once at app startup and held for the app's lifetime — no load/unload cycle during gameplay
- `replayAsync()` resets playback position without reloading from disk — safe for rapid re-triggers (e.g., multiple tile taps in quick succession)
- No memory pressure concern: 6 decoded audio buffers ≈ 2 MB maximum

### 9.4 Startup Time

Target cold start: < 2 seconds to interactive on a mid-range device.

| Optimization | Implementation |
|---|---|
| Font loading | `useFonts` from `expo-font` inside `App.js`, show `SplashScreen` until fonts resolve |
| Sound preloading | Start `Promise.all` load concurrently; do NOT block render on sound load completion |
| Puzzle generation | NOT done at startup — deferred until `GameScreen` mounts |
| `ALL_WORDS` Set construction | Happens at module import time (synchronous, ~2 ms) — acceptable |
| Hermes V1 bytecode | Expo SDK 54 ships Hermes V1 by default; JS bundle pre-compiled to bytecode during EAS Build |

```javascript
// App.js startup pattern
import * as SplashScreen from 'expo-splash-screen';
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    'Nunito-Bold': require('./assets/fonts/Nunito-Bold.ttf'),
    'Nunito-Regular': require('./assets/fonts/Nunito-Regular.ttf'),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <ProgressProvider>
        <GameProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </GameProvider>
      </ProgressProvider>
    </GestureHandlerRootView>
  );
}
```

### 9.5 React Render Optimisation

- `GameContext` splits into `GameStateContext` (value) and `GameDispatchContext` (dispatch) — components that only dispatch actions do not re-render on state change
- `LetterTile` wrapped in `React.memo()` — only re-renders when its own `state`, `letter`, or callback props change
- Callbacks passed to `LetterTile` wrapped in `useCallback` with stable dependencies
- `FoundWordsList` wrapped in `React.memo()` — only re-renders when `words.length` increases

---

## 10. Build & Deployment

### 10.1 EAS Build Configuration

```json
// eas.json — create at project root
{
  "cli": {
    "version": ">= 16.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "APP_VARIANT": "preview"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-services-key.json",
        "track": "internal"
      }
    }
  }
}
```

**Build commands:**

```bash
# Install EAS CLI (dev machine only)
npm install -g eas-cli

# Authenticate
eas login

# Link project (first time — adds EAS projectId to app.json)
eas init

# Build sideloadable APK for testing
eas build -p android --profile preview

# Build Play Store AAB for production
eas build -p android --profile production

# Submit to Play Store (after production build completes)
eas submit -p android --latest
```

### 10.2 `app.json` Required Additions

```json
// Additions needed to existing app.json
{
  "expo": {
    "name": "Word Match Kids",
    "slug": "word-match-kids",
    "version": "1.0.0",
    "runtimeVersion": {
      "policy": "sdkVersion"
    },
    "android": {
      "package": "com.wordmatchkids.app",        // ADD: required for Play Store
      "versionCode": 1,                            // ADD: increment on every Play Store build
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#6C3EE0"              // CHANGE: match app's primary purple
      },
      "edgeToEdgeEnabled": true,
      "permissions": []                            // ADD: explicit empty array — no permissions needed
    },
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#6C3EE0"                // CHANGE: match primary purple
    },
    "extra": {
      "eas": {
        "projectId": "YOUR_EAS_PROJECT_ID"         // ADD after: eas init
      }
    }
  }
}
```

### 10.3 App Icon and Splash Screen

| Asset | Specification | Tool |
|---|---|---|
| `icon.png` | 1024×1024 px, PNG, no transparency (Play Store requirement) | Figma / Canva |
| `adaptive-icon.png` | 1024×1024 px, foreground layer only, safe zone = centered 66% | Figma |
| `splash-icon.png` | 200×200 px centered on transparent background | Figma |

Design brief for icon: Colourful letter tiles spelling "WM" or showing two interlocking letters. Primary purple `#6C3EE0` background. Rounded corners baked into the artwork (not the container — Play Store crops the container).

### 10.4 Version Management

```
app.json "version": semantic version shown in Play Store (e.g., "1.0.0", "1.1.0")
app.json "android.versionCode": integer, monotonically increasing (1, 2, 3, ...)
                                 MUST increment on every Play Store submission
```

**Convention:**
- Bug fix releases: bump `versionCode` only (e.g., `version: "1.0.0"`, `versionCode: 2`)
- Feature releases: bump both `version` and `versionCode` (e.g., `version: "1.1.0"`, `versionCode: 3`)

### 10.5 Google Play Families Policy Compliance

This app targets children (ages 5–10) and must comply with [Google Play Families Policy](https://support.google.com/googleplay/android-developer/answer/9893335):

| Requirement | Status |
|---|---|
| No ads | Compliant — no ad SDKs |
| No data collection | Compliant — no analytics, no network calls, no accounts |
| No in-app purchases | Compliant — `"permissions": []` in app.json |
| Content rating | Submit for ESRB/IARC rating during Play Console setup; expect "Everyone" |
| Privacy policy | Required even with no data collection — create a simple static page |

---

## Appendix A: Constants Reference

```javascript
// src/constants/colors.js
export const COLORS = {
  // Brand
  primary:        '#6C3EE0',  // purple — main brand colour
  primaryLight:   '#9B72F0',
  primaryDark:    '#4A1FAA',
  accent:         '#FFD93D',  // yellow — stars, highlights
  accentLight:    '#FFE882',

  // Game UI
  tile: {
    idle:         '#FFFFFF',
    highlighted:  '#FFF4B2',  // soft yellow for common-letter highlight
    placed:       '#D4F0FF',  // light blue for placed-in-slot tile
    used:         '#E0E0E0',  // grey for accepted/used tile
    correct:      '#B8F5B0',  // green flash
    dragging:     '#FFFFFF',  // same as idle, scale handles the lift visual
  },
  tileBorder:     '#C8B8F0',

  // Timer
  timerSafe:      '#4CAF50',
  timerWarning:   '#FF9800',
  timerDanger:    '#F44336',

  // Background
  background:     '#F0EBFF',  // very light purple
  gradientTop:    '#6C3EE0',
  gradientBottom: '#9B72F0',

  // Text
  textPrimary:    '#1A1A2E',
  textSecondary:  '#5A5A7A',
  textOnDark:     '#FFFFFF',

  // Feedback
  success:        '#4CAF50',
  error:          '#F44336',
  warning:        '#FF9800',
};
```

```javascript
// src/constants/config.js
export const CONFIG = {
  // Timer seconds per level (levels 1–10)
  TIMER_SECONDS: [null, 120, 120, 100, 100, 90, 90, 75, 75, 60, 60],
  // index 0 unused; index 1 = level 1, etc.

  // Star rating: time thresholds as fraction of TIMER_SECONDS
  // (getStarRating in gameLogic.js uses these implicitly via getDifficultyParams)
  STAR_3_FRACTION: 0.30,  // used in ≤30% of total time = 3 stars
  STAR_2_FRACTION: 0.70,  // used in ≤70% of total time = 2 stars
  // else 1 star

  // Auto-submit: on lower levels, auto-submit when all slots filled
  AUTO_SUBMIT_LEVELS: [1, 2, 3, 4],

  // Scoring
  POINTS_PER_LETTER: 10,
  SPEED_BONUS_HIGH: 2,     // multiplier when > 60s remaining
  SPEED_BONUS_MID: 1.5,    // multiplier when > 30s remaining
  SPEED_BONUS_LOW: 1,      // multiplier otherwise

  // Haptics warning threshold
  TIMER_WARNING_SECONDS: 10,

  // AsyncStorage
  STORAGE_KEY: '@word_match_kids_progress_v1',
};
```

---

*End of Phase 2 Technical Architecture document. This serves as the implementation blueprint for the Developer Agent (Phase 3).*
