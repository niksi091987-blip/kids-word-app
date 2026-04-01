# Phase 2: Experience Design — Word Match Kids

**Prepared by:** Experience Designer Agent
**Date:** 2026-03-31
**Project:** Word Match Kids — Android educational word game for ages 5-10
**Based on:** Phase 1 competitor analysis, market research, R&D research, and existing codebase review

---

## Design Philosophy

This document makes concrete decisions. Every choice is grounded in one question: **does this serve a 6-year-old trying to play a word game alone on their parent's phone?**

Three governing principles:

1. **Delight over instruction.** Kids learn by doing. Show, don't tell. Every mechanic should be discoverable through play, not a tutorial wall.
2. **Confidence over competition.** No lives. No shame states. Wrong answers bounce back — they never sting. Every session ends with something to celebrate.
3. **30-second legibility.** Any screen should be fully understood by a child who has never seen it before within 30 seconds, using pictures and large text.

---

## 1. Screen Flow & Navigation

### Full Screen Map

```
App Launch
    │
    ▼
[Splash Screen]  ─────────────────────────────────────────────────────┐
    │ (auto-advance, 1.5s)                                             │
    ▼                                                                  │
[Home Screen] ◄──────────────────────────────────────────────────────┤
    │                           ▲                                      │
    ├──── TAP "PLAY" ──────────►│                                      │
    │                     [back/home button]                           │
    ▼                           │                                      │
[Level Select Screen]           │                                      │
    │                           │                                      │
    ├──── TAP level bubble ──────┘           ┌─── time's up ──────────┤
    │                                        │                         │
    ▼                                        │                         │
[Game Screen] ──────────────────────────────┘                         │
    │                                                                  │
    ├──── all words found / time's up ────►[Results Screen]           │
    │                                           │                      │
    │                                           ├──► "NEXT" ──────────►│ (next level → Level Select or Game)
    │                                           ├──► "RETRY" ─────────►│ (same puzzle)
    │                                           └──► "HOME" ──────────►│
    │
    ├──── "?" button (any game screen) ────►[Tutorial Overlay]
    │                                           │
    │                                           └──► dismiss ──────────┘
    │
    └──── gear icon (Home) ─────────────────►[Settings Screen]
                                                    │
                                                    └──► back ─────────┘
```

### Transitions Between Screens

| From | To | Transition | Duration |
|------|----|-----------|---------|
| Splash | Home | Fade in | 400ms |
| Home | Level Select | Slide up from bottom | 350ms |
| Level Select | Game | Zoom in (scale 0.8 → 1.0 from tapped bubble) | 400ms |
| Game | Results | Burst/explode out (confetti spreads from center) | 600ms |
| Results | Game (retry) | Wipe left | 300ms |
| Results | Level Select | Slide down (reverse of entry) | 350ms |
| Any | Settings | Slide in from right | 300ms |
| Any | Tutorial Overlay | Fade in over current screen | 250ms |

All transitions use `react-native-reanimated` shared element transitions where possible. Navigation managed with React Navigation (stack navigator, no tab bar — this is a game, not a productivity app).

---

## 2. Game Screen UX Design

### Game Screen Layout (Portrait, 390×844 logical pixels as baseline)

```
┌─────────────────────────────────────────┐
│  [←]                    [?]     [⚙]    │  ← 56px header bar
├─────────────────────────────────────────┤
│                                         │
│         ┌──────────┐  ┌──────────┐     │
│         │  CASTLE  │  │  CATTLE  │     │  ← Word display zone (~160px tall total)
│         │ c-a-s-t-l│  │c-a-t-t-l│     │    Letters shown individually in tiles
│         │          │  │         │     │
│         └──────────┘  └──────────┘     │
│                                         │
│         ╔══════════════════════╗        │
│         ║  SHARED LETTERS:    ║        │  ← Common letters reveal zone (~80px)
│         ║   [C] [A] [T] [L]   ║        │
│         ╚══════════════════════╝        │
│                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  ← Timer bar (full width, 12px tall)
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  _ _ _ _                        │   │  ← Answer compose zone (~80px)
│  │  [C] [A] [T] [L]               │   │    (tap to fill in sequence)
│  └─────────────────────────────────┘   │
│                                         │
│  ╔═══════════════════════════════════╗ │
│  ║  Words Found:                     ║ │  ← Found words list (scrollable, ~200px)
│  ║  ✓ CAT    ✓ LAT                  ║ │
│  ║  ✓ ACT                           ║ │
│  ╚═══════════════════════════════════╝ │
│                                         │
│        [  CHECK WORD  ]                 │  ← 64px tall CTA button
└─────────────────────────────────────────┘
```

### Step-by-Step Game Flow

#### Step 1: Puzzle Arrival (0–800ms after screen loads)

The two source words arrive with staggered animation:
- Word 1 slides in from the left (translateX: -200 → 0, with `withSpring` damping 0.7)
- Word 2 slides in from the right (200ms delay, same spring)
- Each letter within the words is an individual tile, but initially rendered as a flat label (no interaction)

The words are displayed in ALL CAPS using rounded-corner letter tiles, 48×48px each, spaced 4px apart, on a cream/white card background with a soft drop shadow.

The "SHARED LETTERS" zone is empty at arrival — just its bordered container visible as a placeholder.

#### Step 2: Common Letters Reveal (800ms – 2000ms, auto-plays)

This is the game's signature wow moment. It plays automatically:

1. A soft "shimmer" animation sweeps across Word 1 tiles from left to right (200ms total sweep).
2. Simultaneously, a matching shimmer sweeps Word 2.
3. Matching letters in both words illuminate in the accent color (Sunshine Yellow). Non-matching letters dim to 40% opacity.
4. After the shimmer completes (200ms pause), the common letters physically "fly" down into the SHARED LETTERS zone. Each letter tile animates via `withSpring`:
   - Scale: 0.5 → 1.0
   - Y position: from source word tile position → shared zone position
   - Staggered: 80ms between each letter
5. A gentle chime plays as each letter lands. `expo-haptics` fires a light impact as each lands.
6. The shared letters tiles settle with a small bounce (spring overshoot ~1.1 scale, then settle to 1.0).

The common letters in the shared zone appear in **shuffled order** (not alphabetical) to encourage creative thinking rather than spelling the "obvious" word.

**Edge case:** If only 2 common letters, the reveal plays the same way but with smaller tiles that expand to fill the zone comfortably.

#### Step 3: Compose Mode (2000ms – timer end)

The timer bar begins counting down the instant the last common letter lands.

**How the player interacts:**

The player **taps letter tiles** in the shared zone to build a word. This is a deliberate design decision over drag-and-drop: tapping is faster, works with one finger, is unambiguous on small tiles, and requires less fine motor skill for young children. Drag-and-drop is reserved for ages 8+ if we add an advanced mode.

Interaction mechanics:
- Tapping a letter in the shared zone moves it (with a hop animation — scale 1.0 → 1.3 → 1.0, translateY 0 → -12 → 0 destination) into the **next empty slot** in the compose zone above.
- The letter tile disappears from the shared zone (its slot becomes an empty ghost tile outline).
- Tapping a letter already in the compose zone removes it back to the shared zone (reverse animation).
- The compose zone shows blank underline slots equal to the longest possible answer length (max 6 slots). Unused slots are just subtle dashes.
- A "CLEAR" ghost button appears in the compose zone once ≥1 letter has been placed. Tapping it returns all placed letters to the shared zone with a cascade animation.

**Haptic/visual feedback on tap:**
- Light haptic impact on each tap.
- Letter tile springs up slightly (scale to 1.2 then back) on selection.
- A soft "click" sound plays (short, 10–15ms WAV, not piercing).

#### Step 4: Submit / Validate

The "CHECK WORD" button activates (full opacity, interactive) as soon as at least 2 letters are placed. It remains inactive (50% opacity) below 2 letters.

**Correct word:**
1. "CHECK WORD" button pulses (scale 1.0 → 1.05 → 1.0).
2. Letter tiles in the compose zone fly up, then arc down into the "Words Found" list as a new entry — sliding in from the right.
3. A bright success chime plays (ascending 3-note tone, 200ms total).
4. `expo-haptics` fires `NotificationFeedbackType.Success`.
5. A small burst of colored dots (4–6 dots, ~40px travel radius) explodes from the word's landing position in the found list.
6. The compose zone resets. Common letter tiles bounce back to their positions in the shared zone.
7. If this is the player's 3rd, 5th, or all-words-found moment, a streak banner slides down from the top: "3 in a row!" with a flame icon.

**Wrong word (not a valid English word):**
1. The compose zone tiles shake left-right (a quick jiggle: translateX -8, +8, -6, +6, -4, +4, 0 — total 400ms).
2. The tiles briefly turn red-orange, then fade back to normal.
3. A short "boing" sound plays (low frequency, brief).
4. `expo-haptics` fires `NotificationFeedbackType.Error`.
5. Letters remain in the compose zone so the player can adjust (don't auto-clear on wrong — this is important for young kids who need to understand what went wrong).
6. No score penalty. No life loss. The error feedback is purely informational.

**Word already found:**
1. The found word in the list briefly pulses/glows yellow.
2. A friendly "already got that one!" audio cue (a light boing, different pitch from wrong answer).
3. Compose zone clears automatically (this one is intentionally auto-cleared — the word is done, move on).

#### Step 5: Timer Visualization

The timer is a full-width gradient bar at the bottom edge of the word display area. It fills from left to right and depletes over time.

- **75–100% time remaining:** Blue → Teal gradient (calm)
- **40–75% remaining:** Teal → Yellow (mild urgency)
- **15–40% remaining:** Yellow → Orange (escalating)
- **0–15% remaining:** Orange → Red + bar pulses (scale breathe 1.0 → 1.05 → 1.0 every 500ms)

Time per level (from `gameLogic.js`):
- Levels 1–2: 120 seconds
- Levels 3–4: 100 seconds
- Levels 5–6: 90 seconds
- Levels 7–8: 75 seconds
- Levels 9–10: 60 seconds

A small digital countdown number is hidden by default for younger children (levels 1–4), visible for older/harder levels (5–10). The color and shrink of the bar is the primary communication.

At the 10-second mark, a soft ticking sound begins (one tick per second, like a gentle wood block). This is not stressful — it's a signal to hurry, like a game show countdown. It stops immediately if the player submits a word.

#### Step 6: "Found All Words" End State

When the player finds all possible words from the common letters:
1. Timer stops immediately.
2. A large Lottie confetti burst animation plays full-screen (2 seconds, JSON animation ~40KB).
3. A fanfare sound plays.
4. The game freezes momentarily in celebration before transitioning (1.5s delay).
5. Transitions to Results Screen via confetti-burst transition.

#### Step 7: "Time's Up" End State

When the timer reaches zero:
1. The timer bar flash-pulses red 3 times.
2. The "CHECK WORD" button grays out and becomes non-interactive.
3. A gentle "dun dun" sound plays (not punitive — it sounds like a cartoon slide whistle, not a game-show loss buzzer).
4. Any partially-composed word in the compose zone is canceled.
5. The letter tiles in the shared zone do a sad droop animation (they lean slightly downward, scale to 0.95).
6. After 1 second, any words the player did NOT find are briefly revealed in the found-words list in a muted/gray style (so they can learn), then the screen transitions to Results.
7. **Importantly:** if the player found at least one word, this is treated as a partial success, not a failure. The Results screen emphasizes what they found, not what they missed.

---

## 3. Visual Design System

### Art Direction

**Style:** Playful flat illustration with depth cues — not full 3D, not completely flat. Think: clean vector shapes with subtle drop shadows, a slight texture on background panels, and one or two illustrated character details (a mascot peeking from a corner). Inspired by Duolingo's visual warmth and Endless Alphabet's bold color use, but cleaner and less cluttered.

**Not:** Photorealistic, busy patterns, dark backgrounds, thin lines, serif fonts, or anything that requires precise color perception.

### Color Palette

All colors meet WCAG AA contrast requirements for text on their respective backgrounds. Protanopia and deuteranopia safe — no meaning is conveyed by red/green alone.

| Role | Name | Hex | Usage |
|------|------|-----|-------|
| **Primary** | Sky Blue | `#4A90D9` | Buttons, active states, key UI elements |
| **Primary Dark** | Deep Blue | `#2C6FAC` | Button pressed states, headers |
| **Secondary** | Sunshine Yellow | `#FFD740` | Highlights, matched letters, correct answer glow |
| **Accent** | Coral | `#FF6B6B` | Error states, timer urgency (late stage), energetic accents |
| **Success** | Meadow Green | `#4CAF7D` | Correct word confirmation, star fills |
| **Background** | Soft Sky** | `#E8F4FD` | Main screen backgrounds |
| **Surface** | Cloud White | `#FFFFFF` | Cards, tiles, panels |
| **Surface Alt** | Warm Cream | `#FFF8E7` | Word display cards (warmer feel) |
| **Text Primary** | Midnight | `#1A1A2E` | All body/label text |
| **Text Muted** | Slate | `#6B7A8D` | Secondary labels, hints |
| **Letter Tile BG** | Periwinkle | `#B8C9F0` | Default unselected letter tiles |
| **Letter Tile Active** | Sky Blue | `#4A90D9` | Selected/placed letter tiles |
| **Letter Matched** | Sunshine Yellow | `#FFD740` | Common letter highlight during reveal |
| **Level 1–2** | Meadow Green | `#4CAF7D` | Level bubble backgrounds (easy) |
| **Level 3–4** | Sky Teal | `#26C6DA` | Level bubble backgrounds |
| **Level 5–6** | Sky Blue | `#4A90D9` | Level bubble backgrounds |
| **Level 7–8** | Violet | `#9575CD` | Level bubble backgrounds |
| **Level 9–10** | Coral | `#FF6B6B` | Level bubble backgrounds (hard) |

**Colorblind safety:** The error state uses shape (shake animation) + sound + pattern (diagonal lines on tile) in addition to the Coral color. Success uses shape (bounce animation) + sound + the Meadow Green color. No interaction state is communicated by color alone.

### Typography

**Font family: Nunito** (Google Font, free, bundled with app)

Nunito is rounded, friendly, highly legible at small sizes, and specifically excels for children's reading because its letterforms are clear and unambiguous (the 'a' and 'g' look like their handwritten forms).

| Style | Font | Size | Weight | Usage |
|-------|------|------|--------|-------|
| `headline-xl` | Nunito | 40sp | ExtraBold (800) | Splash title, celebration banners |
| `headline-lg` | Nunito | 32sp | Bold (700) | Screen titles ("LEVEL SELECT") |
| `headline-md` | Nunito | 24sp | Bold (700) | Source words display |
| `headline-sm` | Nunito | 20sp | SemiBold (600) | Section headers ("Words Found") |
| `body-lg` | Nunito | 18sp | SemiBold (600) | Found word entries, button labels |
| `body-md` | Nunito | 16sp | Regular (400) | Settings, tutorial text |
| `body-sm` | Nunito | 14sp | Regular (400) | Secondary labels |
| `letter-tile` | Nunito | 22sp | ExtraBold (800) | Letter tiles (must be bold to pop) |

Minimum font size in the app: **14sp.** No text ever appears smaller.

Line height: 1.4× the font size for all multi-line text.

Letter spacing: +0.5 on headline styles for a fun, airy feel.

### Touch Target Sizes

| Element | Minimum | Recommended | Notes |
|---------|---------|-------------|-------|
| Letter tiles | 56×56dp | 64×64dp | Kids need large targets. The visual tile can be smaller; padding extends the tap area. |
| Primary CTA button | 56dp tall | 64dp tall, full-width | "CHECK WORD", level confirmation |
| Navigation icons (back, help, settings) | 48×48dp | 56×56dp tap area, 28px visual icon |
| Level bubbles | 72×72dp | 80×80dp | Must be tappable with a thumb or small finger |
| "Clear" / secondary actions | 48×48dp | 56dp tall | Smaller than primary CTA but still accessible |
| Results stars | Display only | — | Stars are not interactive |

All interactive elements have a minimum 8dp gap between them to prevent mis-taps.

### Spacing System

Base unit: **8dp.** All spacing is a multiple of 8.

| Token | Value | Usage |
|-------|-------|-------|
| `space-xs` | 4dp | Letter tile gap, tight list item padding |
| `space-sm` | 8dp | Icon-to-label gap, inner tile padding |
| `space-md` | 16dp | Card inner padding, section spacing |
| `space-lg` | 24dp | Between major zones (words → timer → compose) |
| `space-xl` | 32dp | Screen-edge horizontal margins |
| `space-2xl` | 48dp | Major section separation, hero element breathing room |

Screen edge padding (safe area): 24dp horizontal, 16dp below status bar.

### Icon Style

Icons use the `@expo/vector-icons` Ionicons set (already a dependency). This set is rounded, friendly, and recognizable. Additional custom icons (stars, trophy) are SVG-based inline illustrations, not icon fonts. Size: 24dp for navigation icons, 32dp for contextual icons (timer symbol, star).

### Corner Radius System

| Element | Radius |
|---------|--------|
| Letter tiles | 12dp (very rounded — friendly feel) |
| Buttons (primary) | 32dp (fully pill-shaped) |
| Cards / panels | 20dp |
| Level bubbles | 50% (full circle) |
| Small tags | 8dp |

---

## 4. Reward & Motivation System

### Per-Puzzle Stars (already in gameLogic.js)

Stars are awarded immediately on the Results Screen. `getStarRating()` returns 1, 2, or 3 based on time taken relative to the difficulty target:
- 3 stars: completed in ≤30% of allotted time
- 2 stars: completed in ≤70% of allotted time
- 1 star: any completion (even time's up — if at least 1 word found)

**Star reveal animation on Results Screen:**
Stars appear one at a time, each with a pop-and-spin entrance (scale 0 → 1.3 → 1.0, rotateZ 0 → 20 → 0deg), with a "ting" sound for each star earned. 300ms between each star. Unearned stars are shown as hollow/gray outlines (they don't "pop in" — they just sit there quietly).

**0 words found edge case:** The player sees 1 gray star and a gentle "Nice try — want to play again?" message. Never a "You failed" or "Game Over" phrasing.

### Level Progression Map

The Level Select Screen uses a **path/road metaphor** — a winding trail through illustrated environments (meadow → beach → forest → mountain peak), with circular level bubbles placed along the path. Each bubble shows the level number and the player's best star count.

- Completed levels: bubble is fully colored (environment color), shows best star count.
- Current level: bubble is larger (80dp vs 72dp), gently pulses (scale 1.0 → 1.05 → 1.0 every 2 seconds), labeled "PLAY!"
- Locked levels: bubble is grayscale with a padlock icon. No tap response (with a small "locked" shake if tapped).

Unlock mechanic: Each level unlocks the next upon completion with at least 1 word found (i.e., any star rating unlocks progression). Levels 1–2 are always unlocked at first launch.

The path itself is a thick, slightly squiggly rope/road with small illustrated details scattered along it (flowers, a small bird, a cloud). These are static SVG decorations — no animation — to keep performance clean.

### Streaks

**In-game streaks:** Finding 3 consecutive valid words without a wrong attempt triggers a "Hot Streak!" banner (Lottie flame animation, 1.5 seconds, then banner slides away). Finding 5 consecutive triggers a "Word Wizard!" banner. Streaks reset on wrong attempts or time's up.

**Cross-session streaks:** A daily streak counter (stored in AsyncStorage). The Home Screen shows "Day 3 in a row!" with a flame icon if the player has played on consecutive calendar days. This is shown briefly — it's encouraging, not pressuring.

### Badge Collection

A small badge tray lives in the bottom-right of the Home Screen (a trophy icon that bounces when new badges are earned). Badges are simple SVG medal/sticker designs.

| Badge | Trigger | Design |
|-------|---------|--------|
| First Word | Find your first valid word ever | Yellow star on blue |
| Speed Runner | Earn 3 stars on any puzzle | Lightning bolt |
| Word Wizard | Find all possible words in a puzzle | Sparkle wand |
| Level 5 Explorer | Complete level 5 | Compass rose |
| Level 10 Champion | Complete level 10 | Gold crown |
| Hot Streak | 5 correct in a row | Flame |
| Daily Player | 3-day login streak | Calendar with smile |
| Full Set | 3 stars on all 10 levels | Trophy cup |

Badges are stored locally in AsyncStorage. No server, no accounts.

**Badge reveal:** When a new badge is earned, it slides up from the bottom of the screen like a toast notification, showing the badge artwork and name ("You earned: Word Wizard!") for 3 seconds before sliding back down.

### What Keeps a 6-Year-Old Coming Back

Based on educational gamification research, the specific mechanics that drive return:

1. **The incomplete level map.** Open the app, see the winding path with locked levels ahead. Locked levels are visible but grayed — this creates the "just one more" pull. A 6-year-old who can see Level 7 waiting wants to get there.
2. **Immediate first-session success.** Level 1 is designed so that every child finds at least 2–3 words. The first play session MUST end with a celebration, not frustration. Early wins build identity: "I'm good at this game."
3. **The common-letter reveal animation.** This 2-second animation is intrinsically satisfying and slightly surprising every time. Kids love seeing the letters "fly." It's novel enough to replay for its own sake.
4. **Badge collection.** Kids aged 5–8 are in a developmental stage where collecting and accumulating is deeply satisfying. A visible badge tray with empty slots creates a completion drive.
5. **Parental attention hook.** The game produces "look what I spelled!" moments. Kids who get parental attention from the game associate the game with positive social connection.

---

## 5. Accessibility & Kid-Friendly Considerations

### Color-Blind Safe Design

All error/success states use multiple signals simultaneously — never color alone:
- **Correct word:** green color + bouncing animation + ascending chime sound + success haptic
- **Wrong word:** red-orange color + shake animation + low "boing" sound + error haptic
- **Common letters:** yellow highlight + upward animation movement + chime sound
- **Timer urgency:** color shift + bar size change + pulsing animation + ticking sound

The full color palette has been checked against Coblis Color Blindness Simulator for protanopia, deuteranopia, and tritanopia. The Sky Blue / Sunshine Yellow / Meadow Green combination remains distinguishable across all three types.

### Large, Clear Text

- Minimum font size: 14sp (body-sm, used sparingly).
- Letter tiles: 22sp ExtraBold — maximally legible at all sizes.
- Level numbers in bubbles: 24sp Bold.
- No text is presented over a patterned or photographic background. Text always has a solid or near-solid color backing.

### Simple Navigation

The app has no bottom tab bar, no hamburger menus, no nested settings layers. Navigation depth:
- Home → 1 tap to anywhere meaningful (Level Select, Settings)
- Game → back arrow (single tap) to return
- Settings → single scrollable list, no sub-pages
- Tutorial → tap anywhere to advance, X to close

No text-heavy menus. Every navigational element uses an icon + a single short word label (e.g., the back arrow always says "BACK" beneath it).

### Audio Cues

Every visual event has a corresponding audio cue. The sound design mirrors the visual design:
- Tile selection: soft click (short, light)
- Letter lands in compose zone: gentle "plop"
- Correct word: ascending chime (positive, musical)
- Wrong word: "boing" (silly, not harsh — kids find it funny, not punishing)
- Timer running low: soft ticking (wood block)
- Level complete: fanfare (celebratory, 2 seconds)
- Badge earned: sparkle jingle (magical)
- Button press: soft thud

A "Sounds ON/OFF" toggle in Settings controls all audio. It defaults to ON. The visual game is still 100% playable without sound.

### Haptic Feedback

All haptic patterns map to recognizable response types:
- `ImpactFeedbackStyle.Light` — letter tile tap, button tap
- `ImpactFeedbackStyle.Medium` — letter landing in compose zone
- `NotificationFeedbackType.Success` — correct word found
- `NotificationFeedbackType.Error` — wrong word attempt
- `ImpactFeedbackStyle.Heavy` — level complete moment

Haptics default to ON. Toggle in Settings. Haptics are purely reinforcing — removing them does not impair gameplay.

### Parent Controls

Settings screen includes a "Parent Corner" section, unlocked by a simple PIN (4-digit, set at first launch or resettable). Parent Corner contains:
- **Sound toggle** (also in main settings, but here too)
- **Haptics toggle**
- **Reset progress** (nuclear option — clear all saved data)
- **Session time reminder:** optional notification after 15/30/60 minutes of continuous play ("Time to take a break!")
- **What your child has learned:** a simple list of the longest words they've successfully formed across all sessions — a conversation starter for parents ("Ask me what CASTLE and CATTLE have in common!")

The PIN prevents kids from accidentally (or intentionally) wiping progress. The code is simple enough for parents but requires a deliberate action — not exploitable by a 6-year-old through random tapping.

---

## 6. Tutorial / Onboarding

### Design Principle for This Tutorial

A 5-year-old cannot read "Find the common letters between the two words." The tutorial must be almost entirely visual, animated, and interactive. It must never block play for more than 30 seconds. It must feel like playing, not like being taught.

### First Launch Experience (New Player, ~60 seconds total)

**Step 1: Mascot Introduction (5 seconds)**

A small illustrated character — Wobble, a round purple word-blob with googly eyes — bounces up from the bottom of the Home Screen and waves. A speech bubble reads: "Hi! I'm Wobble! Let me show you how to play!" The player taps Wobble or the "Let's Go!" button to continue.

No reading required if the parent reads the speech bubble aloud. Even without reading, tapping Wobble is intuitive.

**Step 2: Interactive Tutorial Puzzle (50 seconds)**

A special tutorial-only puzzle launches immediately — not a real level. The word pair is **CAT** and **CUP**.

The tutorial uses an arrow/hand-cursor overlay system rather than text explanations:

1. **(0–6s)** The two words appear. Wobble appears next to Word 1 (CAT) and a sparkle animation circles the letter **C**. A speech bubble: "These two words both have a C!" The C in both words glows yellow. (If the player taps something, that's fine — nothing breaks.)

2. **(6–10s)** Wobble bounces down to the shared letters zone. The common letters C and A fly down automatically (guided tutorial, no player input needed here). Speech bubble: "Here are the shared letters!"

3. **(10–18s)** Wobble's hand-cursor points at the letter tile **C** in the shared zone. A pulsing highlight appears on it. Speech bubble: "Tap the letters to make a word!" After 3 seconds with no input, the hand cursor taps the C automatically (shows the player what to do), moving it to the compose zone. If the player taps first, they get extra celebration feedback.

4. **(18–26s)** Hand cursor (or player) taps **A**, then **T**. The word CAT appears in the compose zone. Wobble bounces excitedly.

5. **(26–32s)** Hand cursor points to the "CHECK WORD" button. Speech bubble: "Now tap CHECK!" If the player doesn't tap within 3 seconds, the tutorial taps it automatically.

6. **(32–40s)** "CAT" is confirmed correct. Confetti, chime, Wobble does a happy dance. Speech bubble: "You found a word! Great job!"

7. **(40–50s)** Wobble: "There are more words hiding in there! Try to find them!" The tutorial is now unguided — the player sees the remaining letters (C, A) and can try on their own for 10 seconds. Whatever they find (or don't find), the tutorial ends after this free-play period.

8. **(50s)** Wobble: "Ready to play for real? Let's go!" → Level Select Screen.

**The tutorial never fails.** The player cannot make a mistake that breaks the flow. Wrong taps are ignored (not highlighted as wrong during tutorial). If the timer reaches zero, the tutorial auto-advances anyway.

### Returning to the Tutorial

A "?" button on the Game Screen at any time opens a 3-slide overlay tutorial:
- Slide 1: "Find what the two words share" (animated common letter reveal)
- Slide 2: "Tap letters to make new words" (animated compose demo)
- Slide 3: "Hit CHECK to confirm — find as many words as you can!" (animated check demo)

Tapping outside the overlay, or "Got it!", closes it. This is for players who forgot the rules or whose younger sibling grabbed the phone.

### Contextual Hints

During normal gameplay (not tutorial), Wobble sits in the corner of the Game Screen as a small icon. If the player has been inactive for 15+ seconds with no words submitted:
- Wobble peeks larger and wiggles.
- If tapped, Wobble gives a letter hint: one of the common letters glows briefly. This does not count against the star rating but the hint option appears once per puzzle.

For levels 1–3, the hint is offered proactively after 20 seconds. For levels 4+, the player must tap Wobble to request a hint.

---

## 7. Component Inventory

Every component listed below maps directly to a React Native component file to be created in `src/components/`.

### Core Game Components

#### `LetterTile`
**File:** `src/components/LetterTile.js`
**Description:** A single letter displayed in a rounded-rectangle tile. Used in source word display, shared letters zone, and compose zone.
**Props:** `letter` (string), `state` ('default' | 'highlighted' | 'selected' | 'placed' | 'disabled'), `onPress` (func), `size` ('sm' | 'md' | 'lg')
**Behavior:** Animated press feedback (scale spring). Highlighted state applies yellow background. Selected state applies blue background. Placed state applies to tiles sitting in the compose zone. Disabled state is 40% opacity, no onPress.
**Dimensions:** sm=48dp, md=56dp (default), lg=64dp
**Animation:** Scale spring on press (1.0 → 1.2 → 1.0 via `withSpring`), color transition on state change.

#### `WordDisplay`
**File:** `src/components/WordDisplay.js`
**Description:** A card showing one of the two source words as a row of LetterTiles. Appears in the top section of the Game Screen.
**Props:** `word` (string), `commonIndices` (array of indices that are common letters), `revealed` (boolean — whether the common letters are highlighted yet)
**Behavior:** On `revealed=true`, letters at `commonIndices` animate to the highlighted state and then trigger the common letter fly-down animation. The card has a warm cream background with a subtle drop shadow.

#### `SharedLettersZone`
**File:** `src/components/SharedLettersZone.js`
**Description:** The bordered container showing all common letters as interactive LetterTiles. This is the player's "hand" of tiles.
**Props:** `letters` (array of { letter, id, placed: boolean }), `onLetterTap` (func taking letter id)
**Behavior:** Tiles enter via the fly-in animation from the WordDisplay. When placed, the tile in this zone transitions to a ghost (empty outline). Tiles can be returned to this zone from the compose zone. The zone has a light blue-tinted background to distinguish it from word display cards.

#### `ComposeZone`
**File:** `src/components/ComposeZone.js`
**Description:** The answer-building area showing placed letters and empty slot dashes.
**Props:** `placedLetters` (array of { letter, id }), `maxSlots` (number), `onLetterTap` (func to remove a placed letter), `onClear` (func)
**Behavior:** Placed letters hop in via animation. Tapping a placed letter returns it to SharedLettersZone. Shows a "Clear" ghost button when at least one letter is placed. Slot dashes pulse softly when the compose zone is empty to invite interaction.

#### `CheckButton`
**File:** `src/components/CheckButton.js`
**Description:** The full-width "CHECK WORD" primary CTA button.
**Props:** `onPress` (func), `disabled` (boolean)
**Behavior:** Pill-shaped, full-width, 64dp tall. Disabled when fewer than 2 letters placed (50% opacity, not interactive). Presses with a scale spring. Has a subtle gradient background (Sky Blue → Deep Blue).

#### `TimerBar`
**File:** `src/components/TimerBar.js`
**Description:** The full-width progress bar showing time remaining.
**Props:** `totalTime` (seconds), `onTimeUp` (func), `paused` (boolean)
**Behavior:** Depletes from right to left. Color interpolates through Blue → Teal → Yellow → Orange → Red based on remaining percentage. Pulses when below 15%. Ticking sound fires at 10-second mark. Shows a small numeric countdown for levels 5+ only.

#### `FoundWordsList`
**File:** `src/components/FoundWordsList.js`
**Description:** A scrollable list of words the player has found in the current puzzle.
**Props:** `words` (array of strings), `duplicateWord` (string | null — triggers glow if set)
**Behavior:** New words slide in from the right with a dot-burst effect. Duplicate word briefly glows yellow. Empty state shows a dashed outline with "Find a word!" placeholder text. Shows count: "3 / 7 words found" when total is known.

#### `StreakBanner`
**File:** `src/components/StreakBanner.js`
**Description:** A temporary banner that slides down from the top to celebrate in-game streaks.
**Props:** `streakCount` (number), `visible` (boolean)
**Behavior:** Slides in from top (translateY -60 → 0), displays for 2 seconds, slides back up. Shows "3 in a row! 🔥" or "5 in a row! Word Wizard!" text. Invisible (height 0, opacity 0) when not visible.

### Screen-Level Components

#### `StarDisplay`
**File:** `src/components/StarDisplay.js`
**Description:** A row of 3 stars used on the Results Screen and Level Select bubbles.
**Props:** `count` (1 | 2 | 3), `animate` (boolean — whether to play the pop-in entrance)
**Behavior:** Stars pop in sequentially with a spin animation when `animate=true`. Earned stars are gold-filled. Unearned stars are hollow gray outlines. Star size: 40dp on Results Screen, 16dp in Level Select bubbles.

#### `LevelBubble`
**File:** `src/components/LevelBubble.js`
**Description:** A circular button representing a single level on the Level Select path.
**Props:** `level` (number), `status` ('locked' | 'available' | 'current' | 'completed'), `bestStars` (number), `onPress` (func), `color` (hex string — from the level color palette)
**Behavior:** 80dp circle for 'current' status, 72dp for others. 'current' pulses gently. 'locked' shows a padlock icon and shakes on tap. 'completed' shows best star count inside the bubble. 'available' shows just the number.

#### `MascotWobble`
**File:** `src/components/MascotWobble.js`
**Description:** The Wobble mascot illustration, used in tutorial, hints, and corner decoration.
**Props:** `mood` ('idle' | 'happy' | 'excited' | 'peeking'), `size` ('sm' | 'md' | 'lg'), `speechBubble` (string | null), `onPress` (func)
**Behavior:** SVG illustration with Reanimated idle animations (gentle float up/down, 3-second cycle). Mood changes trigger different expressions. Speech bubble appears as a white rounded box above Wobble. Pressing Wobble when `onPress` is set triggers the hint mechanic.

#### `BadgeToast`
**File:** `src/components/BadgeToast.js`
**Description:** A slide-up toast notification for newly earned badges.
**Props:** `badge` ({ name, description, icon }), `visible` (boolean), `onDismiss` (func)
**Behavior:** Slides up from bottom edge with a sparkle sound. Shows badge icon (SVG), name, and brief description. Auto-dismisses after 3 seconds. Can be tapped to dismiss early.

#### `ResultsCard`
**File:** `src/components/ResultsCard.js`
**Description:** The main content card on the Results Screen.
**Props:** `wordsFound` (array), `totalPossibleWords` (array), `stars` (1|2|3), `timeTaken` (seconds), `isTimeUp` (boolean)
**Behavior:** Shows star display (animated), words found count, optional "You also could have found: X, Y, Z" section for missed words (shown only if the player found more than 0 words — never shown if 0 found). Three action buttons: RETRY, NEXT LEVEL, HOME.

### Navigation & Shell Components

#### `GameHeader`
**File:** `src/components/GameHeader.js`
**Description:** The top bar on the Game Screen.
**Props:** `onBack` (func), `onHelp` (func), `level` (number)
**Behavior:** Back arrow (with "BACK" label), level badge ("Level 3"), help button (?). 56dp tall. No pause button — pausing in a timed word game creates an exploit opportunity. The back button returns to Level Select after a confirmation dialog: "Leave this puzzle?" with YES/NO.

#### `HomeScreen` decorations
Animated background elements on the Home Screen: a few slowly drifting cloud shapes (using Reanimated `withRepeat`), Wobble sitting on a letterblock, the game logo. These are pure visual polish and are paused when the app goes to the background.

---

## 8. Screen-by-Screen Detailed Specs

### Splash Screen
- Duration: 1.5 seconds (or until fonts/assets load, whichever is longer)
- Content: Game logo ("Word Match Kids") centered, Sunshine Yellow on Sky Blue gradient background
- Logo animation: letters drop in one at a time from above (80ms stagger, each with a bounce)
- Wobble peeks in from the bottom edge at 800ms
- No skip — it's short enough not to need one and the asset preloading happens here

### Home Screen
- Background: Soft Sky with drifting clouds
- Center: Game logo (smaller version, 60% of splash size)
- Center-below: Large "PLAY" button (Sunshine Yellow, pill-shaped, 64dp tall, 240dp wide)
- Bottom-left: Settings gear icon (56×56dp tap area)
- Bottom-right: Trophy icon showing badge count with a small badge count indicator (e.g., "3/8")
- Wobble sits on top of the "PLAY" button, does an idle bounce animation
- Daily streak banner (if applicable): "Day 3 in a row!" with flame, shown as a small tag above the PLAY button

### Level Select Screen
- Header: "Choose a Level" in headline-lg, back arrow
- Full-screen scrollable path illustration
- Path: illustrated environments (meadow at bottom = levels 1–2, beach = 3–4, forest = 5–6, mountains = 7–8, sky/clouds = 9–10)
- Level bubbles placed along the path at logical waypoints
- Current level bubble is 10% larger than others and has a gentle pulse
- Tapping an unlocked bubble shows a small pop-up card: level name, best star count, estimated difficulty description ("3 common letters · 120 seconds"), and a "PLAY!" button
- Tapping a locked bubble shows the bubble shake and Wobble shakes his head

### Settings Screen
- Header: "Settings" + back arrow
- Items (using large toggle switches, 56dp tall rows):
  - Sound Effects: ON/OFF toggle
  - Haptic Feedback: ON/OFF toggle
  - "Parent Corner" — tap to reveal PIN entry
- Parent Corner (PIN-protected):
  - Session reminder: OFF / 15min / 30min / 60min
  - Reset all progress (red, requires confirmation)
  - "Words your child has found" — scrollable list sorted by length
- Footer: Version number, app name

---

## 9. Sound Design Summary

All sounds are short MP3 files bundled in `assets/sounds/`. Pre-loaded at app launch using `expo-av` Audio API.

| File | Duration | Description | Trigger |
|------|---------|-------------|---------|
| `tile_tap.mp3` | 30ms | Soft wooden click | Letter tile tap |
| `tile_place.mp3` | 60ms | Gentle plop | Letter placed in compose zone |
| `correct_word.mp3` | 400ms | Ascending 3-note chime | Correct word validated |
| `wrong_word.mp3` | 300ms | Low cartoon boing | Invalid word attempt |
| `already_found.mp3` | 250ms | Higher-pitch soft boing | Duplicate word attempt |
| `timer_tick.mp3` | 80ms | Wood block tick | Once per second, last 10 seconds |
| `level_complete.mp3` | 2000ms | Fanfare jingle | Level completion |
| `badge_earned.mp3` | 1200ms | Sparkle/magical jingle | Badge toast appears |
| `streak_3.mp3` | 600ms | Mini-fanfare | 3-word streak |
| `button_press.mp3` | 40ms | Soft thud | Navigation button taps |
| `level_unlock.mp3` | 800ms | Rising arpeggio | New level unlocked |

Total audio budget: ~200KB. All files should be mono, 44.1kHz, 128kbps MP3.

---

## 10. Performance & Technical Design Notes

These design decisions directly affect implementation:

1. **No drag-and-drop for letter tiles.** Tap-to-place eliminates the need for `react-native-gesture-handler` pan gestures on letter tiles. This simplifies implementation significantly and is more accessible for young children. Drag-and-drop may be added as a Level 8+ feature in v2.

2. **Lottie animations are JSON, not video.** The confetti burst and star effects should be built as Lottie JSON files (20–50KB each). This avoids the APK size cost of embedded video.

3. **All game state lives in a single context.** A `GameContext` (React Context) holds the current puzzle, timer state, found words, and streak count. No Redux — the app is simple enough that context + useReducer is appropriate.

4. **Timer runs in a JS `setInterval` at 1-second granularity.** The timer bar's visual progress animates smoothly using Reanimated's `withTiming` keyed to the remaining percentage, not the raw tick. This decouples visual smoothness from JS timer accuracy.

5. **Saved data schema (AsyncStorage):**
```json
{
  "levelProgress": {
    "1": { "completed": true, "bestStars": 3 },
    "2": { "completed": true, "bestStars": 2 }
  },
  "badges": ["first_word", "speed_runner"],
  "streakDays": 3,
  "lastPlayedDate": "2026-03-31",
  "wordsEverFound": ["cat", "act", "castle", ...],
  "settings": {
    "soundEnabled": true,
    "hapticsEnabled": true,
    "sessionReminder": 0,
    "parentPin": null
  }
}
```

6. **The common letter reveal animation is the most complex animation sequence.** Implement it as a single orchestrated Reanimated animation worklet that fires once when the Game Screen mounts. It must complete before the timer starts. Sequence timing: WordDisplay shimmer (0–400ms) → letters highlight (400–600ms) → letters fly to SharedLettersZone (600ms–1400ms staggered) → timer starts.

7. **Font loading.** Nunito must be loaded via `expo-font` before the Splash Screen completes. Load during the splash animation — if font loading takes longer than 1.5s, hold the splash screen until fonts are ready.

---

## 11. Open Questions for Tech Architect Agent

These design decisions require technical input and confirmation:

1. **How many distinct puzzles can `generatePuzzle()` produce per level?** The design assumes infinite replayability via dynamic puzzle generation. If the algorithm produces fewer than ~20 unique puzzles per level, we may need a pre-generated puzzle bank to ensure variety.

2. **Does the timer start before or after the common letter reveal animation completes?** This document specifies: timer starts AFTER reveal animation (at ~1.4 seconds). The Tech Architect needs to confirm the animation timing hooks in Reanimated support this cleanly.

3. **Word validation performance.** `isValidWord()` and `canFormWord()` run synchronously. For the "already found" check and "check word" validation, confirm these run fast enough on the UI thread without needing to move to a worker.

4. **AsyncStorage vs expo-sqlite for saved data.** The data schema above is simple enough for AsyncStorage (JSON string). If the "words ever found" array grows very large over time (thousands of entries), consider SQLite. Initial assessment: AsyncStorage is fine for v1.

5. **Minimum Android version for haptics.** `expo-haptics` requires Android 10+ for full haptic pattern support. Some patterns fall back gracefully on older versions. Confirm the minimum API level and whether the graceful fallback is acceptable for the target device range.

---

*End of Phase 2 Experience Design Document.*
*Next phase: Tech Architect Agent — component architecture, navigation setup, state management, and animation implementation plan.*
