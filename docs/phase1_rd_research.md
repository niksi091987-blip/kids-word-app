# Phase 1: R&D Research Report -- Word Match Kids

**Date:** 2026-03-31
**Agent:** R&D / Latest Research Agent
**Project:** Word Match Kids -- Android educational word game for ages 5-10

---

## Technology Landscape

### Current State of the Art (2025-2026)

Cross-platform mobile development has consolidated around two dominant frameworks: **React Native (with Expo)** and **Flutter**. Both have matured significantly:

- **React Native** has completed its New Architecture migration. As of RN 0.82+ (late 2025), the New Architecture is always enabled -- Fabric renderer + TurboModules + Hermes V1 engine are the default. Expo SDK 54 (our current scaffold) has ~83% New Architecture adoption in EAS builds. Hermes V1 delivers ~40% faster cold starts and 20-30% lower memory usage vs. old bridge architecture.

- **Flutter** holds ~46% cross-platform market share vs React Native's ~35% (2025-2026 surveys). Flutter's Impeller rendering engine is now stable on both platforms, delivering consistent 60/120 FPS. Flutter 3.x+ offers pixel-perfect cross-platform rendering via its custom Skia-based engine.

- **Native Android (Kotlin + Jetpack Compose)** continues as Google's recommended approach. Compose's December 2025 release added pausable composition (eliminating frame drops in lazy layouts) and K2 compiler integration for faster builds. Animation capabilities are on par with or exceed cross-platform options.

### Native vs Cross-Platform for This Use Case

For a single-platform Android word game targeting kids 5-10:
- **Native Kotlin** would provide the best raw performance and smallest APK, but requires Android SDK/Java setup and Kotlin expertise.
- **Cross-platform** offers faster development, web previewing, and future iOS expansion potential. The performance overhead is negligible for a word game (not a high-FPS action game).
- The game's requirements (letter animations, drag-drop, sound, haptics) are well within the capability of all major frameworks.

---

## Framework/Tool Evaluation

| Option | Maturity | Community | Performance | Learning Curve | Offline Support | APK Build Ease | Fit Score (1-10) |
|--------|----------|-----------|-------------|----------------|----------------|---------------|-----------------|
| **React Native (Expo)** | 9/10 - SDK 54, New Arch stable | 9/10 - Massive JS ecosystem, 121k GitHub stars | 8/10 - Hermes V1, 60fps animations | 3/10 (low) - JS/React familiar | 9/10 - expo-sqlite, AsyncStorage, bundled assets | 10/10 - EAS cloud build, no local SDK needed | **9** |
| **Flutter** | 9/10 - Flutter 3.x stable | 8/10 - 170k GitHub stars, growing | 9/10 - Impeller engine, 120fps capable | 6/10 - Dart learning required | 9/10 - sqflite, Hive, bundled assets | 7/10 - Codemagic cloud, but new tooling setup | **7** |
| **Kotlin + Jetpack Compose** | 9/10 - Google's flagship | 7/10 - Android-specific | 10/10 - Native performance | 7/10 - Kotlin + Compose + Android SDK setup | 10/10 - Room/SQLite native | 3/10 - Requires local Android SDK + Java install | **5** |
| **PWA wrapped as APK (TWA)** | 6/10 - TWA is niche | 5/10 - Limited PWA-game community | 5/10 - Browser rendering layer | 2/10 (low) - Standard web tech | 6/10 - Service workers, limited storage | 6/10 - Bubblewrap/PWABuilder, but HTTPS required | **4** |
| **Capacitor (Ionic)** | 7/10 - Capacitor 6.x stable | 6/10 - Smaller than RN/Flutter | 6/10 - WebView-based rendering | 3/10 (low) - Web tech | 7/10 - SQLite plugin, web storage | 4/10 - Requires local Android SDK; no free cloud build | **5** |

### Detailed Per-Option Assessment

#### 1. React Native (Expo) -- ALREADY SCAFFOLDED

**APK without local Android SDK:** YES. EAS Build runs entirely in Expo's cloud. Free tier provides 30 builds/month (lower priority). Configure `eas.json` with `"buildType": "apk"` for sideloadable APKs, or default AAB for Play Store. Zero local Android tooling required.

**Animation/game feel:**
- `react-native-reanimated` v3/v4: UI-thread animations at 60fps. Worklets eliminate bridge overhead entirely.
- `react-native-gesture-handler`: Pan gestures for drag-and-drop letter tiles. A dedicated `react-native-reanimated-dnd` library exists for sortable drag-drop grids -- ideal for letter tiles.
- `lottie-react-native`: Designer-quality animations from After Effects JSON files (20-50KB per animation vs. MB for video). Perfect for reward celebrations, star bursts, character reactions.
- `expo-haptics`: Built-in, already in package.json. Impact, notification, and selection feedback types.
- `expo-av`: Built-in, already in package.json. Sound effect playback for correct/wrong answers, timer ticks, level-up fanfares.

**Offline dictionary:** `expo-sqlite` supports shipping a pre-bundled `.db` file as an asset. Load 2,000-5,000 curated words into SQLite at build time. Alternatively, a simple JSON word list bundled in assets (a 5,000-word JSON is ~50KB).

**Sideloading + Play Store:**
- Sideloading: EAS Build produces `.apk` directly. Share via file transfer.
- Play Store: EAS Build produces `.aab` (Android App Bundle) by default. EAS Submit can automate Play Store upload. Expo handles signing.

**Development speed:** Highest of all options. Expo Go for instant previewing on device (no build needed during development). Hot reload. Already scaffolded with dependencies installed. JavaScript/React is the most widely known web technology.

**APK size:** ~25-27MB for a universal APK (Hello World baseline). With dictionary assets and sounds, estimate ~30-35MB. App Bundles (AAB) for Play Store reduce per-device download to ~15-18MB.

**Cost:** EAS Free tier = 30 builds/month. More than sufficient for a solo/small team project. Paid starts at $19/month if needed.

---

#### 2. Flutter

**APK without local Android SDK:** Partially. Codemagic provides cloud builds for Flutter (free tier: 500 build minutes/month on macOS, 120 min on Linux). However, you still need Flutter SDK locally for development (which itself requires Java/Android SDK for Android emulator testing). Cloud-only development is awkward -- you'd develop blind without a local emulator.

**Animation/game feel:** Excellent. Flutter's custom rendering engine excels at animations. `flutter_animate`, `Rive`, and built-in `AnimationController` provide smooth transitions. Impeller engine targets 120fps. Arguably the best animation framework for mobile.

**Offline dictionary:** `sqflite` or `Hive` for embedded databases. Well-supported.

**Development speed for this project:** SLOWER than Expo. Requires: (1) Install Homebrew, (2) Install Java/Android SDK, (3) Install Flutter SDK, (4) Learn Dart, (5) Start from scratch (no existing scaffold). Estimated 2-3 days of setup + learning before productive development begins.

**APK size:** ~15-20MB for a minimal Flutter app (smaller than RN due to AOT compilation and no JS engine).

---

#### 3. Kotlin + Jetpack Compose

**APK without local Android SDK:** NO. Kotlin/Compose development absolutely requires local Android SDK, Java JDK, and Android Studio (or at minimum the command-line tools). On this macOS machine with no Java, no Homebrew, and no Android SDK, setup is substantial: install Homebrew -> install JDK -> install Android SDK -> install Android Studio.

**Animation/game feel:** Best-in-class for Android. Compose's animation APIs (animateFloatAsState, AnimatedContent, transition APIs) are deeply integrated. `Compottie` library brings Lottie to Compose Multiplatform. Pausable composition eliminates jank.

**Development speed:** SLOWEST start. Full Android toolchain setup + Kotlin + Compose learning curve. No cross-platform benefit. No existing scaffold.

**APK size:** Smallest possible. ~8-12MB for a minimal Compose app.

---

#### 4. PWA Wrapped as APK (TWA)

**APK without local Android SDK:** YES, via Bubblewrap or PWABuilder. However, requires HTTPS hosting for the PWA source and Digital Asset Links verification.

**Animation/game feel:** Limited to browser capabilities. CSS animations and Web Animations API are decent but cannot match native feel. No haptic feedback API on most Android browsers. Sound playback has autoplay restrictions.

**Offline support:** Service workers can cache assets, but storage is limited and can be evicted by the OS. Not as reliable as native SQLite.

**Fundamental problem:** A word game for kids needs to feel like a native app, not a website. TWA's browser chrome limitations and lack of native APIs make this a poor fit.

---

#### 5. Capacitor (Ionic)

**APK without local Android SDK:** NO for local builds. Requires Android SDK locally. Codemagic supports Ionic/Capacitor cloud builds, but configuration is more complex than EAS. No equivalent to Expo's streamlined cloud build experience.

**Animation/game feel:** WebView-based. Better than raw PWA (has native bridge for haptics, etc.) but animations still run in a WebView. Ionic's animation library is decent for UI transitions but not ideal for game-like interactions.

**Development speed:** Moderate. Web tech (familiar) but requires Android SDK setup for builds. Recent compatibility issues with Android Studio 2025.2.3 noted in community forums.

---

## Word Dictionary Strategy

### Approach Comparison

| Strategy | Word Count | Size | Age-Appropriate | Maintenance | Recommended? |
|----------|-----------|------|----------------|-------------|-------------|
| **Curated hand-picked list** | 500-2,000 | 10-30KB | Guaranteed safe | Manual, slow growth | YES -- primary |
| **TWL06 (Scrabble dictionary) filtered** | ~5,000 (3-6 letter subset) | ~50KB | Needs profanity filter | Low after initial filter | YES -- secondary/validation |
| **EOWL (English Open Word List)** | ~128,985 total | ~1.2MB | Needs heavy filtering | Medium | Possible supplement |
| **Wordnik open-source list** | ~175,000 | ~1.5MB | Needs filtering | Low | Overkill for this use |
| **Stanford Wordbank (child vocabulary)** | Research data, not a word list | N/A | Research-backed | N/A | Use for curation guidance |

### Recommended Strategy: Tiered Curated Approach

**Primary word list (ship with app):**
1. Start with a **curated core of ~1,000-2,000 words** appropriate for ages 5-10, drawn from:
   - Grade K-5 vocabulary lists (Flocabulary, GreatSchools, Spelling Words Well)
   - Stanford Wordbank data for age-appropriate vocabulary
   - Common 3-6 letter words that kids encounter in reading

2. Organize words by **difficulty tier** (mapping to game levels 1-10):
   - Levels 1-3: 3-4 letter words, common vocabulary (cat, dog, run, play, sun, hat)
   - Levels 4-6: 4-5 letter words, grade 2-3 vocabulary (light, dream, brave, cloud)
   - Levels 7-10: 5-6 letter words, grade 4-5 vocabulary (planet, bridge, forest, silver)

3. Store as a **JSON file bundled in app assets** (~20-40KB for 2,000 words with metadata). No SQLite needed for this size -- simple in-memory lookup is faster.

**Validation dictionary (for checking player-formed words):**
- Use a filtered subset of TWL06 (~5,000 common 3-6 letter words) as a broader validation set
- This catches valid words the player might form that aren't in the curated "target" list
- Run a one-time profanity/inappropriate content filter against a blocklist
- Store as a sorted array for binary search (~50KB)

**Why NOT a full dictionary:**
- EOWL's 128K words include obscure terms no child would know (qi, xu, aa)
- Large dictionaries contain potentially inappropriate words requiring extensive filtering
- A word game for kids should validate against words kids actually know, not the full English lexicon
- Smaller list = smaller bundle = faster lookups

### Data Format

```json
{
  "words": [
    { "word": "cat", "level": 1, "category": "animals" },
    { "word": "sun", "level": 1, "category": "nature" },
    { "word": "bridge", "level": 7, "category": "structures" }
  ]
}
```

For the validation dictionary, a simple sorted string array suffices:
```json
["able", "ace", "act", "add", "age", ...]
```

---

## Animation & Gamification Research

### Animation Libraries for React Native (Expo)

| Library | Purpose | Size Impact | Performance | Recommendation |
|---------|---------|-------------|-------------|---------------|
| `react-native-reanimated` v3+ | Core animations (letter tiles, transitions) | ~1.5MB native | UI-thread, 60fps | MUST HAVE |
| `react-native-gesture-handler` | Drag-drop letter tiles | ~0.5MB native | Native gesture processing | MUST HAVE |
| `lottie-react-native` | Reward animations, celebrations | ~0.8MB native + JSON assets | GPU-accelerated | RECOMMENDED |
| `react-native-reanimated-dnd` | Drag-and-drop grid for letter tiles | ~50KB JS | Built on Reanimated | EVALUATE |
| `expo-haptics` | Tactile feedback | Already included | Native | ALREADY INCLUDED |
| `expo-av` | Sound effects | Already included | Native | ALREADY INCLUDED |
| `expo-linear-gradient` | Background gradients, visual flair | Already included | Native | ALREADY INCLUDED |

### Animation Patterns for Kids 5-10

**Letter tile interactions:**
- Reanimated `withSpring()` for bouncy tile selection (spring damping ~0.6 for playful feel)
- Gesture Handler `Pan` gesture for drag-and-drop letters into answer slots
- `withTiming()` + `Easing.bounce` for tiles snapping into position
- Scale animations on tap (1.0 -> 1.2 -> 1.0) for tactile selection feedback

**Reward/celebration animations:**
- Lottie: Star bursts, confetti, character dances (20-50KB per animation JSON)
- Reanimated: Scaling badges, sliding score counters, pulsing level-up indicators
- Combine Lottie (complex visual effects) with Reanimated (interactive motion)

### Sound Effects Integration

Using `expo-av` (already in package.json):
- Pre-load sound files at app launch for zero-latency playback
- Recommended sounds: tile tap, correct answer chime, wrong answer buzz, timer tick, level complete fanfare, star earned
- Use short MP3/OGG files (< 100KB each, typically 10-30KB for UI sounds)
- Total sound budget: ~200-500KB for a full set

### Haptic Feedback

Using `expo-haptics` (already in package.json):
- `Haptics.impactAsync(ImpactFeedbackStyle.Light)` -- tile tap
- `Haptics.notificationAsync(NotificationFeedbackType.Success)` -- correct answer
- `Haptics.notificationAsync(NotificationFeedbackType.Error)` -- wrong answer
- Note: Haptics only work on physical devices, not emulators

### Reward Systems -- Research-Backed for Ages 5-10

Based on educational gamification research (PMC, SAGE journals, Smart Learning Environments):

**What works for this age group:**
1. **Visual rewards over abstract points.** Stickers, badges, and character unlocks are more motivating than numerical scores for ages 5-10. (Smart Learning Environments, 2019)
2. **Immediate feedback.** Dopamine-triggered learning works best when reward is instant -- show celebration animation within 200ms of correct answer.
3. **Progress visualization.** Stars filling up, progress bars, level maps that show advancement. Children ages 9-10 respond strongly to "graphical presentation" of progress. (Engaging Children with Educational Content, 2019)
4. **Difficulty-matched challenges.** Levels of difficulty with clear feedback from current level. Too easy = boredom, too hard = frustration. The 10-level system is well-suited.
5. **Early reward placement.** Non-monetary incentives (badges, stars) should come early and frequently. First correct answer should trigger a celebration. (Designing Gamified Rewards, 2021)
6. **Avoid punitive mechanics.** No "lives lost" or harsh failure states. Wrong answers should encourage retry, not punish.

**Recommended reward structure:**
- **Per-puzzle:** 1-3 stars based on speed/completeness (like Angry Birds model)
- **Per-level:** Unlock new visual theme or character accessory
- **Streaks:** "X correct in a row" with escalating celebration animations
- **Collection:** Sticker/badge collection screen (kids love collecting)
- **NO:** Leaderboards (inappropriate for ages 5-7), no social comparison, no in-app purchases

---

## Risk Assessment

### React Native (Expo) Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|------------|
| EAS Build service outage | Medium | Low | Local builds possible with `eas build --local` (requires Android SDK as backup) |
| EAS free tier limits (30 builds/month) | Low | Low | More than sufficient; $19/month if exceeded |
| Expo SDK upgrade breaks dependencies | Medium | Medium | Pin versions, test upgrades in branch before merging |
| React Native New Architecture issues | Low | Low | SDK 54 has 83% adoption; well-tested path |
| APK size (~30-35MB) | Low | N/A | Acceptable for modern devices; AAB reduces Play Store download |
| Animation performance on low-end devices | Low | Low | Reanimated runs on UI thread; Hermes V1 reduces JS overhead |

### Flutter Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|------------|
| Dart learning curve | Medium | High | Team unfamiliarity = slower velocity |
| Abandoning existing Expo scaffold | High | N/A | Wasted setup work; restart from zero |
| Google's framework commitment | Low | Low | Flutter has strong momentum, but Google has killed projects before |

### Kotlin/Compose Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|------------|
| Android SDK setup complexity | High | High | No Homebrew, no Java -- substantial setup |
| Android-only lock-in | Medium | N/A | No future iOS path without rewrite |
| Steeper learning curve | Medium | High | Kotlin + Compose + Android lifecycle |

### PWA/TWA Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|------------|
| Poor native feel | High | High | Fundamental limitation of browser-based rendering |
| Offline reliability | High | Medium | Service worker eviction by OS |
| Play Store rejection | Medium | Medium | Google has tightened TWA quality requirements |

### Capacitor Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|------------|
| WebView performance limitations | Medium | Medium | Animations in WebView are inherently slower |
| Android SDK still required | High | High | Same setup burden as native |
| Smaller ecosystem for game-like interactions | Medium | High | Fewer game-oriented libraries than RN or Flutter |

### Cross-Cutting Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|------------|
| Word list contains inappropriate content | High | Medium | Manual curation + automated profanity filter |
| COPPA/children's privacy compliance | High | Medium | No data collection, no network calls, no analytics in v1 |
| Play Store kids app policy | Medium | Medium | Must comply with Families Policy; no ads, limited data collection |

---

## Recommendation

### Clear Recommendation: React Native with Expo (Option 1)

**React Native (Expo)** is the clear winner for this specific project, and it is not close. This is not a default-to-popular recommendation -- it is driven by the specific constraints and requirements:

#### Why Expo Wins

1. **Already scaffolded.** The project exists with Expo SDK 54, React 19.1, and key dependencies (`expo-haptics`, `expo-av`, `expo-linear-gradient`) already installed. Starting over with Flutter or Kotlin wastes 1-3 days of setup.

2. **Zero Android SDK needed.** EAS Build produces APKs in the cloud. No Java, no Android SDK, no Homebrew required on the development machine. This is the ONLY option (besides PWA) that works with the current machine setup without installing heavy native tooling.

3. **Fastest path to APK.** After writing code, `eas build -p android --profile preview` produces an APK in ~10-15 minutes (cloud). No other framework matches this simplicity without local SDK.

4. **Animation capabilities are sufficient.** This is a word game, not a physics-based action game. Reanimated + Gesture Handler + Lottie provide more than enough for bouncy letter tiles, drag-and-drop, celebration animations, and smooth transitions at 60fps.

5. **Offline-first is trivial.** Bundle a JSON word list as an asset. No network needed. `expo-sqlite` available if structured queries are ever needed.

6. **Development velocity.** Expo Go enables instant preview on a physical Android device without any build step. Hot reload. JavaScript/React is the most accessible language/framework combination.

7. **Play Store path.** EAS Build produces signed AABs. EAS Submit automates Play Store upload. Expo's managed workflow handles signing keys.

8. **Future-proof.** If the app succeeds, adding iOS support is near-zero effort. Web version possible too.

#### Why Not Flutter (the closest competitor)

Flutter would be a strong choice for a greenfield project where animation quality is paramount (e.g., a physics game or highly visual storybook app). However:
- Requires installing Dart, Flutter SDK, Java, Android SDK -- significant setup overhead
- Abandons the existing Expo scaffold
- Dart learning curve adds friction
- The superior animation engine is overkill for a word-matching game
- Cloud builds (Codemagic) work but are not as seamlessly integrated as EAS

### Top 3 Options Ranked

| Rank | Framework | Score | Rationale |
|------|-----------|-------|-----------|
| **1** | **React Native (Expo)** | **9/10** | Best fit given constraints: existing scaffold, no local SDK needed, fastest dev cycle, cloud APK builds, sufficient animation/game capabilities |
| **2** | **Flutter** | **7/10** | Superior animation engine, good ecosystem, but requires full toolchain setup and Dart learning; would be #1 for a greenfield high-animation project |
| **3** | **Kotlin + Jetpack Compose** | **5/10** | Best native performance and smallest APK, but requires heavy local setup, Android-only, and slowest development start |

---

## Assumptions & Questions

### Assumptions Made

1. **Single developer or small team** with JavaScript/React familiarity (based on Expo being already scaffolded).
2. **Android-first** but iOS expansion is a possibility if the app succeeds.
3. **No backend/server** required -- fully offline, no user accounts, no cloud sync.
4. **Target devices** are mid-range Android phones (2020+), not ultra-low-end.
5. **30-35MB APK size** is acceptable for the target audience (parents downloading for kids).
6. **No monetization in v1** -- no ads, no in-app purchases (simplifies COPPA compliance).
7. **English only** for the initial release.

### Questions for the Coordinator / Architecture Agent

1. **Word pair generation algorithm:** Should word pairs be pre-computed and stored, or generated dynamically at runtime? Pre-computed is simpler and guarantees quality; dynamic allows infinite variety but needs validation logic.

2. **Difficulty progression model:** Linear (level 1 = easiest, level 10 = hardest) or adaptive (adjusts based on child's performance)? Adaptive is better UX but more complex to implement.

3. **Timer behavior:** Is the timer punitive (game over when expired) or motivational (bonus stars for speed)? Research suggests motivational-only for ages 5-7, with optional punitive for ages 8-10.

4. **Sound/music:** Background music in addition to sound effects? Background music adds ambiance but increases bundle size (~500KB-2MB for a looping track).

5. **Accessibility:** Any specific accessibility requirements (colorblind modes, screen reader support, larger text options)? Expo/RN has good accessibility API support.

6. **Target Android API level:** Minimum Android version? Expo SDK 54 supports Android 6.0+ (API 23+), covering 95%+ of active devices.

7. **Word list validation workflow:** Who curates/validates the word list? Is there a process for adding words or should it ship with a fixed list for v1?

---

## Key Technical Dependencies (for Expo path)

These packages should be added to the existing scaffold:

| Package | Purpose | Size Impact |
|---------|---------|-------------|
| `react-native-reanimated` | Core animations, spring physics | ~1.5MB native |
| `react-native-gesture-handler` | Drag-and-drop letter tiles | ~0.5MB native |
| `lottie-react-native` | Celebration/reward animations | ~0.8MB native |
| `expo-font` | Kid-friendly custom fonts | Minimal |
| `@react-native-async-storage/async-storage` | Save progress/settings | ~0.2MB native |
| `eas-cli` (dev dependency) | Build APKs via cloud | Dev tool only |

Total estimated additional native size: ~3MB on top of base Expo (~25MB) = **~28-30MB APK**.

---

## Sources

- [Expo EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Build APKs for Android - Expo](https://docs.expo.dev/build-reference/apk/)
- [Expo Pricing / Free Tier](https://expo.dev/pricing)
- [Flutter vs React Native 2026 - TechAhead](https://www.techaheadcorp.com/blog/flutter-vs-react-native-in-2026-the-ultimate-showdown-for-app-development-dominance/)
- [Flutter vs React Native 2026 - Pagepro](https://pagepro.co/blog/react-native-vs-flutter-which-is-better-for-cross-platform-app/)
- [React Native 0.82 New Architecture](https://reactnative.dev/blog/2025/10/08/react-native-0.82)
- [React Native 2026 New Architecture Guide](https://www.pkgpulse.com/blog/react-native-new-architecture-fabric-turbomodules-expo-2026)
- [Expo SDK 55 + Hermes V1](https://www.callstack.com/newsletters/react-native-evals-expo-sdk-55-and-webassembly-in-hermes)
- [React Native Reanimated DnD](https://github.com/entropyconquers/react-native-reanimated-dnd)
- [Lottie for React Native](https://github.com/lottie-react-native/lottie-react-native)
- [9 React Native Animation Libraries Tested](https://www.f22labs.com/blogs/9-best-react-native-animation-libraries/)
- [Expo SQLite Documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Expo SQLite Offline-First Guide](https://medium.com/@aargon007/expo-sqlite-a-complete-guide-for-offline-first-react-native-apps-984fd50e3adb)
- [Wordnik Open Word List](https://github.com/wordnik/wordlist)
- [English Open Word List (EOWL)](https://diginoodles.com/projects/eowl)
- [TWL06 Scrabble Dictionary](https://github.com/fogleman/TWL06)
- [Stanford Wordbank - Children's Vocabulary](https://wordbank.stanford.edu/)
- [Grade-Level Vocabulary Lists - Flocabulary](https://www.flocabulary.com/wordlists/)
- [Grade-Level Vocabulary - GreatSchools](https://www.greatschools.org/gk/articles/vocabulary-words-for-1st-through-12th-graders/)
- [Gamification and Children's Learning - Smart Learning Environments](https://slejournal.springeropen.com/articles/10.1186/s40561-019-0085-2)
- [Points-Based Rewards and Children - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6566098/)
- [Gamification Reward Placement Research](https://www.sciencedirect.com/science/article/pii/S1071581921000793)
- [Gamification Education Ideas](https://pce.sandiego.edu/gamification-in-education/)
- [Understanding Expo App Size](https://docs.expo.dev/distribution/app-size/)
- [Codemagic Flutter CI/CD](https://docs.codemagic.io/yaml-quick-start/building-a-flutter-app/)
- [Capacitor Build Discussion - Ionic Forum](https://forum.ionicframework.com/t/how-to-build-an-android-apk-file-without-using-android-studio-in-a-capacitor-project/177814)
- [PWA to Play Store via TWA - MobileLoud](https://www.mobiloud.com/blog/publishing-pwa-app-store)
- [Jetpack Compose Animations 2025](https://medium.com/@androidlab/jetpack-compose-animations-motion-level-up-your-android-ux-in-2025-19a7eab97602)
- [Jetpack Compose 2026 Features](https://medium.com/@androidlab/the-future-of-jetpack-compose-features-coming-in-2026-cacc535234a2)
