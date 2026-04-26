// Game configuration — all tuning knobs in one place

// Seconds allotted per difficulty level (word-building phase only)
export const TIMER_SECONDS = {
  1: 150,
  2: 150,
  3: 140,
  4: 130,
  5: 120,
  6: 110,
  7: 100,
  8: 90,
  9: 80,
  10: 75,
};

export function getTimerSeconds(level) {
  return TIMER_SECONDS[level] || 90;
}

// Star rating thresholds (fraction of allotted time)
export const STAR_THRESHOLDS = {
  THREE_STARS: 0.30,
  TWO_STARS: 0.70,
};

// Scoring
export const POINTS_PER_LETTER = 10;
export const SPELL_SCORE_FIRST_TRY = 75;
export const SPELL_SCORE_WITH_HINT = 40;
export const WORD_SCORE_PER_LETTER = 10;

export function calcWordScore(word, difficulty, secondsLeft) {
  const base = word.length * POINTS_PER_LETTER;
  const diffMult = Math.ceil(difficulty / 2);
  const speedBonus = secondsLeft > 60 ? 2 : secondsLeft > 30 ? 1.5 : 1;
  return Math.round(base * diffMult * speedBonus);
}

// Animation durations (ms)
export const ANIM = {
  wordSlideIn: 400,
  wordSlideDelay: 200,
  letterRevealSweep: 200,
  letterFlyStagger: 80,
  tileHop: 300,
  shakeTotal: 400,
  successFlash: 600,
  starPopIn: 300,
  starDelay: 300,
  celebrationDuration: 2000,
  transitionToResult: 1500,
  timerTick: 1000,
};

// Timer color thresholds (fraction of total time remaining)
export const TIMER_COLOR_THRESHOLDS = {
  safe: 0.75,
  mid: 0.40,
  warning: 0.15,
};

// Streak milestones
export const STREAK_MILESTONES = {
  HOT: 3,
  WIZARD: 5,
};

// Min letters for word submit
export const MIN_SUBMIT_LETTERS = 2;

// Total levels
export const TOTAL_LEVELS = 10;

// Guest play limit — levels beyond this require a Google account
export const GUEST_LEVEL_LIMIT = 5;

// AsyncStorage keys
export const STORAGE_KEY = '@word_match_kids_progress_v1'; // legacy (kept for migration)
export const PROGRESS_KEY_GUEST  = 'wm_progress_guest';
export const PROGRESS_KEY_GOOGLE = 'wm_progress_google_';
