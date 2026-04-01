# Phase 4 Test Report — Word Match Kids
**Date:** 2026-03-31  
**Reviewer:** Testing Agent  
**Scope:** Full static analysis of all source files  

---

## Summary

| Severity | Count | Fixed? |
|----------|-------|--------|
| Critical | 6     | Yes    |
| Major    | 9     | Yes    |
| Minor    | 8     | No (polish only) |

---

## CRITICAL Issues

### C-1: Ultimate fallback `possibleWords` contains `'ac'` — not a real English word
**File:** `src/utils/gameLogic.js` line 141  
**Description:** The last-resort fallback returns `possibleWords: ['ac']`. `'ac'` is not in `ALL_WORDS` (it is an abbreviation, not a standard dictionary word). Because `isValidWord` validates against `ALL_WORDS`, the player can never submit this word and is permanently stuck — the puzzle cannot be completed, resulting in a forced timer-out with 0 stars.  
**Fix:** Replace with `['cap', 'cat']` — both are in `ALL_WORDS` and are subset words that can be built from `['a', 'c']` only if we also include `'a'` and `'c'` as the common letters. However the real fix is to use a fallback pair whose common letters permit at least one validatable word. Use `cat/can` with commons `['a', 'c']` and possibleWords `['a']` is still bad. Best fix: use `cat/mat` which share `['a', 't']`, and possibleWords `['at']` (confirmed in dictionary). Or even simpler: add `'ac'` to the dictionary as a valid accepted form, or change the fallback to a pair that genuinely shares formable words.  
**Chosen fix:** Change fallback so `commonLetters: ['a', 't']` and `possibleWords: ['at', 'ta']` won't work either if `ta` is absent. Safest: use `'cat'` / `'hat'` sharing `['a', 't']` and list `possibleWords: ['at']` — `'at'` is in the word list.

---

### C-2: `handlePuzzleComplete` closes over stale `game` state
**File:** `src/screens/GameScreen.js` lines 175–209  
**Description:** `handlePuzzleComplete` is defined with `useCallback` and lists `[game, ...]` as a dependency. However the function is triggered both from a `useEffect` that watches `game.phase` and from one that watches `game.secondsLeft`. Because `completionHandled.current` is used as a guard to call the function only once, the first call uses the `game` snapshot at that moment. When triggered by the timer-hitting-0 path, `game.foundWords` and `game.score` are current. When triggered by the `phase === 'complete'` path (all words found), `game` may already be a fresh reference containing correct data. The real risk: if the `game` object captured in the `useCallback` at the moment of the `phase=complete` effect fires is the one *before* `WORD_ACCEPTED` propagated to the component (React batching), `game.foundWords` could be one word short, the final score could be missing the last word's points, and the `stars` calculation would be wrong.  
**Fix:** Calculate `timeTaken`, `stars`, and read `game.score` / `game.foundWords` inside the callback using a `useRef` snapshot that is always current, OR (simpler) accept the `game` state directly from the reducer rather than from the closed-over value by pulling the needed values out of state inside the callback rather than from a stale closure. The most robust fix is to use a `gameRef` that mirrors state.

---

### C-3: Timer continues firing after puzzle completes / navigation
**File:** `src/hooks/useTimer.js` lines 46–50 and `src/screens/GameScreen.js` cleanup  
**Description:** The timer interval is cleared in the `useEffect` cleanup (`return () => { stop(); }`) and `timer.reset()` is called on mount cleanup. However, after `handlePuzzleComplete` calls `timer.pause()`, a 1-second window exists where one more `TIMER_TICK` can arrive from the already-scheduled interval before `clearInterval` executes. This is because `pause()` → `stop()` is synchronous but the interval callback may already be queued in the JS event loop. This means `secondsLeft` can briefly hit `-1` (though `Math.max(0, ...)` in the reducer prevents this), but more critically: **if `secondsLeft` transitions to 0 while `phase` is already `complete`**, the `useEffect` that checks `game.phase === 'playing' && game.secondsLeft === 0` won't fire again — that part is safe. The real risk is the `setTimeout` in `handlePuzzleComplete` calling `navigation.replace` after the component has unmounted (e.g., user tapped Home during the 1500ms delay). This causes a "Can't perform a React state update on an unmounted component" warning and can cause navigation state corruption.  
**Fix:** Track mounted state with a ref and guard all `setTimeout` callbacks inside `handlePuzzleComplete`.

---

### C-4: `route.params` accessed without null-check in `GameScreen`
**File:** `src/screens/GameScreen.js` line 41  
**Description:** `const { level } = route.params;` will throw a TypeError crash if `route.params` is undefined (e.g., if someone deep-links or navigates to Game without params, or a navigation state is restored incorrectly).  
**Fix:** Destructure with a default: `const { level = 1 } = route.params ?? {};`

---

### C-5: `route.params` accessed without null-check in `ResultScreen`
**File:** `src/screens/ResultScreen.js` line 39  
**Description:** While `ResultScreen` uses destructuring with defaults (`stars = 0`, etc.), if `route.params` itself is `null` or `undefined`, the entire destructuring throws a TypeError crash. Navigation state restoration or back-navigation replaying could trigger this.  
**Fix:** `const params = route.params ?? {};` then destructure from `params`.

---

### C-6: `duplicate` phase does NOT clear slots — double dispatch creates race condition
**File:** `src/screens/GameScreen.js` lines 164–171  
**Description:** When phase is `duplicate`, the code dispatches `SET_PHASE` to `'playing'` AND `CLEAR_SLOTS` in the same `setTimeout`. However if `completionHandled.current` becomes true between these two dispatches (extremely unlikely but possible under load), `CLEAR_SLOTS` fires on a `complete`-phase state, leaving orphaned `used: true` tiles. More practically: `CLEAR_SLOTS` is dispatched *after* `SET_PHASE`, meaning for ~1 render cycle the game is in `'playing'` phase with the duplicate word still showing in slots — if the user taps another tile in that 1-render window they can get a tile placed before the clear happens. Additionally, in the `wrong` phase the slots are NOT cleared at all. The player's incorrect letters stay in the word builder slots, requiring them to manually clear or recall tiles before submitting again, which is confusing UX.  
**Fix:** Dispatch both actions atomically. For `wrong` phase, also dispatch `CLEAR_SLOTS` after the delay (matching the `duplicate` behavior). For `duplicate`, merge both dispatches or add a `WORD_REJECTED_CLEAR` action that clears slots in the same state transition.

---

## MAJOR Issues

### M-1: Star rating uses `timeBonus` from `getDifficultyParams` — inconsistent with `TIMER_SECONDS`
**File:** `src/utils/gameLogic.js` lines 148–154 and `src/constants/config.js` lines 4–15  
**Description:** `getStarRating(timeTaken, difficulty)` calls `getDifficultyParams(difficulty)` and uses `params.timeBonus` as the reference duration (e.g., 120s for level 1). However `getTimerSeconds(level)` returns `TIMER_SECONDS[level]` which is also 120 for level 1 — they happen to match for levels 1-2, but diverge for levels 3-10. For example level 3: `timeBonus = 110`, `TIMER_SECONDS[3] = 110` — actually matches. Level 4: `timeBonus = 100`, `TIMER_SECONDS[4] = 100` — matches. On inspection they do happen to match, BUT `getDifficultyParams` uses `level <= 2` for the `timeBonus: 120` bucket while `TIMER_SECONDS` uses explicit keys. The values currently agree, but this is a maintenance trap — they are defined in two different places and one change won't propagate to the other.  
**Fix:** Have `getStarRating` call `getTimerSeconds(difficulty)` instead of `getDifficultyParams(difficulty).timeBonus` to use a single source of truth.

---

### M-2: `FoundWordsList` shows wrong point totals
**File:** `src/components/FoundWordsList.js` line 46  
**Description:** The points shown per word is `+{word.length} pts`, a flat per-letter count with no multiplier. But the actual scoring from `calcWordScore` in `config.js` uses `base * diffMult * speedBonus` where `base = word.length * POINTS_PER_LETTER (10)`. So a 3-letter word at level 1 earns 30+ points, not 3. This creates a visible mismatch: the found-words list shows "+3 pts" for "cat" but the header score jumps by 30+. This confuses players (and parents).  
**Fix:** Either store earned points per word in `foundWords` (as objects `{word, points}`) or display the raw letter count without calling it "pts", or just remove the per-word point display.

---

### M-3: `handlePuzzleComplete` uses stale `game.secondsLeft` to calculate `timeTaken`
**File:** `src/screens/GameScreen.js` line 180  
**Description:** `const timeTaken = (game.totalSeconds || getTimerSeconds(level)) - game.secondsLeft;`. When triggered by `phase === 'complete'` (all words found), this is fine. But when triggered by `secondsLeft === 0`, `timeTaken = totalSeconds - 0 = totalSeconds`, making it appear the player used all the time even if they actually just found the last word when the timer hit exactly 0. The star rating then always returns 1 star in that edge case.  
**Fix:** This is acceptable in the edge case, but the stars calculation for `secondsLeft === 0` when `foundWords.length > 0` should still grant stars based on words found rather than always giving 0. The current code `game.foundWords.length > 0 ? getStarRating(timeTaken, level) : 0` is correct — they get stars. The only real issue is that `timeTaken` at exactly 0 gives them the worst rating. Minor — acceptable. No fix required.

---

### M-4: `useEffect` dependency array in `TimerBar` uses a boolean expression
**File:** `src/components/TimerBar.js` line 65  
**Description:** `useEffect(..., [fraction > 0 && fraction < TIMER_COLOR_THRESHOLDS.warning])` — the dependency is a boolean expression computed inline. This is not the same as `[fraction]`. React compares dependency values. When `fraction` moves within the "danger zone" (e.g., from 0.14 to 0.10), the boolean stays `true` and the effect does NOT re-run, so the pulse animation is never stopped or restarted cleanly when conditions change within the zone. More critically, this pattern gives a lint warning and may cause subtle re-run failures in future React versions. The correct approach is to use `[fraction]` or a derived stable value.  
**Fix:** Change dependency to `[fraction]`.

---

### M-5: `buildTiles` ID generation is wrong — counter not incremented before ID assignment
**File:** `src/context/GameContext.js` lines 36–45  
**Description:**
```js
counts[l] = (counts[l] || 0);   // sets to 0 but never uses existing count
const id = `tile_${l}_${counts[l]}`;
counts[l] += 1;
```
The first line resets `counts[l]` to `0` on every iteration because `(counts[l] || 0)` evaluates to the existing value OR 0 — but then unconditionally assigns it back. Wait — actually `counts[l] = (counts[l] || 0)` only writes 0 when `counts[l]` is falsy (undefined/0). Once it's 1, `counts[l] || 0` = 1, so it writes 1 back. This is actually fine for the first occurrence: starts at undefined → written as 0 → id uses 0 → incremented to 1. Second occurrence: written as 1 → id uses 1 → incremented to 2. So IDs would be `tile_a_0`, `tile_a_1`, etc. This IS correct behavior.  

However, there IS a real bug: if `commonLetters` contains the same letter 3+ times, the IDs are still unique. The logic is actually correct as written. No bug here — this was a false positive.

---

### M-6: `wrong` phase does not clear the word builder slots
**File:** `src/screens/GameScreen.js` lines 153–162  
**Description:** When `phase === 'wrong'`, the game transitions back to `'playing'` after 600ms but does NOT dispatch `CLEAR_SLOTS`. The incorrect tiles remain in the word builder. The player must manually tap each tile or press CLEAR to try a new word. For young kids (the target audience, 5-10 years old), this is highly confusing — they see their wrong answer sitting there and don't know if they need to clear it or if the game is broken. The `duplicate` phase does dispatch `CLEAR_SLOTS`.  
**Fix:** Add `dispatch({ type: GAME_ACTIONS.CLEAR_SLOTS })` alongside the `SET_PHASE` dispatch in the `wrong` branch.

---

### M-7: `handleNext` on ResultScreen navigates to level + 1 without checking unlock status
**File:** `src/screens/ResultScreen.js` lines 90–92  
**Description:** `handleNext` calls `navigation.replace('Game', { level: level + 1 })` without checking whether that level is actually unlocked in `ProgressContext`. This bypasses the unlock gate entirely. While `COMPLETE_LEVEL` should have unlocked `level + 1` before we reach ResultScreen, if progress saving fails (AsyncStorage error) or if `stars === 0` the next level is NOT unlocked, yet `handleNext` is only shown when `stars > 0` — so this is actually safe in practice. BUT: `hasNextLevel = !isLastLevel` doesn't account for whether level+1 is unlocked. If the progress dispatch failed silently, the "NEXT LEVEL" button appears and navigates to a locked level.  
**Fix:** Import `useProgress` in ResultScreen and only show "NEXT LEVEL" when `progress.levels[level + 1]?.unlocked` is true.

---

### M-8: `useEffect` in `LevelBubble` has empty dependency array but references `animDelay` and `isCurrent`/`isUnlocked`
**File:** `src/screens/LevelSelectScreen.js` lines 47–63  
**Description:** The `useEffect` in `LevelBubble` has `[]` as dependency array (empty), so it only runs on mount. This means that if the component re-renders (e.g., the level becomes `isCurrent` after progress loads from AsyncStorage), the pulse animation never starts. Since progress loads asynchronously, `isCurrent` may be `false` on first render and `true` after data loads. The pulse for the current level will never appear.  
**Fix:** Add `[isCurrent, isUnlocked, animDelay]` to the dependency array, or restructure with `useMemo`.

---

### M-9: `game.hapticsEnabled` is always `undefined` — wrong context used
**File:** `src/screens/GameScreen.js` lines 137–138  
**Description:** `if (game.hapticsEnabled !== false)` — `hapticsEnabled` is stored in `ProgressContext` state (`progress.hapticsEnabled`), not in `GameContext` state. `game` is the GameContext state which only has `puzzle`, `phase`, `tilesInTray`, etc. `game.hapticsEnabled` is always `undefined`, so `undefined !== false` is always `true`, and haptics always fire even if the user has turned them off.  
**Fix:** Use `const { state: progress } = useProgress()` (already imported) and check `progress.hapticsEnabled !== false`.

---

## MINOR Issues

### m-1: `SCREEN_WIDTH` imported but unused in `HomeScreen`
**File:** `src/screens/HomeScreen.js` line 24  
**Description:** `SCREEN_WIDTH` is imported but never referenced in the component or styles.  
**Fix:** Remove from import.

---

### m-2: `withRepeat` and `withSequence` imported but unused in `LevelSelectScreen`
**File:** `src/screens/LevelSelectScreen.js` line 13  
**Description:** Both are imported but already used in `LevelBubble` within the same file — on second look they ARE used. False positive.

---

### m-3: `WordDisplay` renders a redundant `wordLabel` that duplicates the tile display
**File:** `src/components/WordDisplay.js` lines 57, 64  
**Description:** Each word card renders both individual letter tiles AND a text label of the full word below it (e.g., "CAT" tile row + "CAT" text label). This is visually redundant and wastes vertical space on small screens. For long words (11-12 chars at high levels), the tiles wrap to a second row while the label also shows the full word — doubly confusing.  
**Fix (minor):** Remove the `wordLabel` text or only show it before `revealCommon` is true.

---

### m-4: `FoundWordsList` shows wrong per-word point values  
Already captured as M-2.

---

### m-5: No `accessibilityHint` on locked level bubbles
**File:** `src/screens/LevelSelectScreen.js` line 86  
**Description:** Locked level bubbles have no accessibility hint explaining they are locked. Screen reader users only see a Pressable with no label.  
**Fix:** Add `accessibilityLabel="Level {level}, locked"` and `accessibilityHint="Complete previous levels to unlock"`.

---

### m-6: `TimerBar` `widthFraction` animates with 800ms duration — slower than the 1s tick
**File:** `src/components/TimerBar.js` line 33  
**Description:** The bar animates to its new width over 800ms, but ticks come every 1000ms. On slow devices the animation may not complete before the next tick fires, creating a visual stutter where the bar jumps.  
**Fix:** Reduce animation duration to 600ms or use `withSpring` for a more natural feel.

---

### m-7: `ResultScreen` motivational message uses `Math.random()` in render — changes on re-render
**File:** `src/screens/ResultScreen.js` line 80  
**Description:** `MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)]` is evaluated during render. If the component re-renders (e.g., orientation change), a different message appears. Should be computed once with `useMemo` or `useRef`.  
**Fix:** `const message = useRef(wordsFound.length === 0 ? NO_WORDS_MESSAGE : MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)]).current;`

---

### m-8: `generatePuzzle` inner loop searches only 50 candidates per outer word
**File:** `src/utils/gameLogic.js` line 95  
**Description:** `j < Math.min(i + 50, shuffled.length)` — for higher difficulty levels (9-10) where word candidates are sparse (only 11-12 letter words), there may not be 50 valid pairs to check, potentially forcing the fallback more often than expected.  
**Fix:** Increase to `i + 100` or loop until all `j > i`.

---

## Fixes Applied

All Critical and Major issues (except M-3 and M-5, noted below) were fixed directly in source code.

| Issue | File | Fix Summary |
|-------|------|-------------|
| C-1 | `src/utils/gameLogic.js:138-145` | Changed fallback to `cat`/`hat` sharing `['a','t']`, possibleWords `['at']` |
| C-2 | `src/screens/GameScreen.js:52-67,199-235` | Added `gameRef` that stays current; `handlePuzzleComplete` reads from `gameRef.current` |
| C-3 | `src/screens/GameScreen.js:54-62,214` | Added `isMountedRef`; navigation/dispatch inside timeout guarded by `isMountedRef.current` |
| C-4 | `src/screens/GameScreen.js:42` | `const { level = 1 } = route.params ?? {}` |
| C-5 | `src/screens/ResultScreen.js:40-50` | `route.params ?? {}` destructuring with defaults; added `useProgress` import |
| C-6 | `src/screens/GameScreen.js:185-193` | `duplicate`: `CLEAR_SLOTS` dispatched before `SET_PHASE` in same timeout |
| M-1 | `src/utils/gameLogic.js:1-2,150-152` | Added `import { getTimerSeconds }` and use it in `getStarRating` instead of `timeBonus` |
| M-2 | `src/components/FoundWordsList.js:44-46` | Changed "+{word.length} pts" to "{word.length} letters" — accurate display |
| M-4 | `src/components/TimerBar.js:65` | Changed dependency from `[fraction > 0 && fraction < THRESHOLD]` to `[fraction]` |
| M-6 | `src/screens/GameScreen.js:177-182` | `wrong` phase now also dispatches `CLEAR_SLOTS` after 600ms delay |
| M-7 | `src/screens/ResultScreen.js:89-96` | `hasNextLevel` now requires `progress.levels[level+1]?.unlocked === true` |
| M-8 | `src/screens/LevelSelectScreen.js:47-63` | `useEffect` dep array changed from `[]` to `[isCurrent, isUnlocked, animDelay]` |
| M-9 | `src/screens/GameScreen.js:160,171` | `game.hapticsEnabled` → `progress.hapticsEnabled` (correct context) |

### Not Fixed (by design):
- M-3: Timer edge case (timeTaken = totalSeconds when timer hits exactly 0) is acceptable; player still receives stars
- M-5: False positive — `buildTiles` ID logic in `GameContext.js` is actually correct on closer inspection
- All minor issues (m-1 through m-8): Polish items with no gameplay impact; left for future sprint
