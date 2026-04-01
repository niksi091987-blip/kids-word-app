import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export { SCREEN_WIDTH, SCREEN_HEIGHT };

// Spacing — base unit 8dp
export const SPACE = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Touch targets
export const TOUCH = {
  letterTile: 60,
  primaryButton: 64,
  navIcon: 48,
  levelBubble: 76,
  secondary: 48,
};

// Letter tile visual sizes
export const TILE = {
  large: 56,
  medium: 48,
  small: 40,
  wordDisplay: 36,
};

// Layout
export const LAYOUT = {
  screenPaddingH: 20,
  screenPaddingTop: 12,
  headerHeight: 56,
  timerBarHeight: 12,
  cardRadius: 20,
  tileRadius: 12,
  buttonRadius: 32,
  levelBubbleRadius: 50,
  tagRadius: 8,
};

// Font sizes
export const FONT_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  hero: 40,
  tile: 22,
};

// Neon glow shadow helper
export function neonShadow(color, intensity = 1) {
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8 * intensity,
    shadowRadius: 12 * intensity,
    elevation: Math.round(12 * intensity),
  };
}

// Neon border helper
export function neonBorder(color, width = 2) {
  return {
    borderWidth: width,
    borderColor: color,
  };
}
