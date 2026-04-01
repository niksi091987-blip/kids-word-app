// Color palette — Word Match Kids
// Game Console Dark Theme — neon colors, glowing effects, arcade aesthetic

export const COLORS = {
  // ── Dark Game Console Backgrounds ─────────────────────────────────
  bgDeep: '#0D0B1E',           // Very dark purple (deepest bg)
  bgDark: '#1A1035',           // Dark purple (main screen bg)
  bgMid: '#251848',            // Medium dark purple (card bg)
  bgLight: '#2E1F5E',          // Lighter purple (elevated cards)
  bgCard: '#1E1640',           // Solid dark card

  // ── Neon Accent Colors ─────────────────────────────────────────────
  neonBlue: '#00D4FF',         // Electric blue (primary action)
  neonPink: '#FF006E',         // Hot pink (secondary, errors)
  neonGreen: '#39FF14',        // Lime green (success, correct)
  neonYellow: '#FFD700',       // Golden yellow (stars, score, hints)
  neonPurple: '#BF5AF2',       // Bright purple (accents)
  neonOrange: '#FF6B00',       // Neon orange (warnings, timer)
  neonCyan: '#00FFDD',         // Cyan (highlights)

  // ── Glow Effects (semi-transparent for shadows/halos) ───────────────
  glowBlue: 'rgba(0, 212, 255, 0.4)',
  glowPink: 'rgba(255, 0, 110, 0.4)',
  glowGreen: 'rgba(57, 255, 20, 0.4)',
  glowYellow: 'rgba(255, 215, 0, 0.4)',
  glowPurple: 'rgba(191, 90, 242, 0.4)',
  glowOrange: 'rgba(255, 107, 0, 0.4)',
  glowCyan: 'rgba(0, 255, 221, 0.4)',

  // ── Surfaces & UI Panels ───────────────────────────────────────────
  surface: 'rgba(255,255,255,0.07)',       // Glass dark card
  surfaceMid: 'rgba(255,255,255,0.12)',    // Slightly brighter glass
  surfaceLight: 'rgba(255,255,255,0.18)',  // Bright glass card
  surfaceSolid: '#1E1640',                 // Solid dark card

  border: 'rgba(255,255,255,0.20)',
  borderBright: 'rgba(255,255,255,0.40)',

  // ── Text ───────────────────────────────────────────────────────────
  textPrimary: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.60)',
  textDim: 'rgba(255,255,255,0.35)',
  textLight: '#FFFFFF',

  // ── Status ─────────────────────────────────────────────────────────
  success: '#39FF14',
  error: '#FF006E',
  warning: '#FFD700',

  // ── Legacy aliases (backward compat) ───────────────────────────────
  primary: '#00D4FF',
  primaryDark: '#0099BB',
  secondary: '#FFD700',
  accent: '#FF006E',
  background: '#1A1035',
  textSecondary: 'rgba(255,255,255,0.60)',
  overlay: 'rgba(0,0,0,0.6)',
  shadow: '#000000',
  tileUsed: '#2A1F55',

  // ── Letter Tile Colors (6 rotating neons) ─────────────────────────
  tileColors: ['#FF006E', '#00D4FF', '#39FF14', '#FFD700', '#BF5AF2', '#FF6B00'],
  tileColorsBg: [
    'rgba(255,0,110,0.25)',
    'rgba(0,212,255,0.25)',
    'rgba(57,255,20,0.25)',
    'rgba(255,215,0,0.25)',
    'rgba(191,90,242,0.25)',
    'rgba(255,107,0,0.25)',
  ],

  // ── Timer ──────────────────────────────────────────────────────────
  timerSafe: '#00FFDD',
  timerMid: '#FFD700',
  timerWarning: '#FF6B00',
  timerDanger: '#FF006E',

  // ── Level Colors ───────────────────────────────────────────────────
  levelEasy: '#39FF14',
  levelMedEasy: '#00FFDD',
  levelMedium: '#00D4FF',
  levelMedHard: '#BF5AF2',
  levelHard: '#FF006E',
};

// Get consistent neon color for a letter
export function getLetterColor(letter) {
  const idx = letter.toLowerCase().charCodeAt(0) % COLORS.tileColors.length;
  return COLORS.tileColors[idx];
}

export function getLetterColorBg(letter) {
  const idx = letter.toLowerCase().charCodeAt(0) % COLORS.tileColorsBg.length;
  return COLORS.tileColorsBg[idx];
}

export function getLevelColor(level) {
  if (level <= 2) return COLORS.levelEasy;
  if (level <= 4) return COLORS.levelMedEasy;
  if (level <= 6) return COLORS.levelMedium;
  if (level <= 8) return COLORS.levelMedHard;
  return COLORS.levelHard;
}

export function getLevelGlow(level) {
  if (level <= 2) return COLORS.glowGreen;
  if (level <= 4) return COLORS.glowCyan;
  if (level <= 6) return COLORS.glowBlue;
  if (level <= 8) return COLORS.glowPurple;
  return COLORS.glowPink;
}
