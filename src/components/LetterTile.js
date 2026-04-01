import React, { useEffect } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  interpolateColor,
} from 'react-native-reanimated';
import { COLORS } from '../constants/colors';
import { LAYOUT, TILE, FONT_SIZE } from '../constants/dimensions';

/**
 * LetterTile — the core interactive tile component.
 *
 * Props:
 *   id         string   unique tile ID
 *   letter     string   single character (will be uppercased for display)
 *   state      'idle' | 'placed' | 'used' | 'highlighted' | 'correct' | 'wrong'
 *   size       'large' | 'medium' | 'small' | 'word'
 *   onPress    fn       called when tile is tapped
 *   disabled   bool     disables interaction
 */
export default function LetterTile({
  id,
  letter,
  state: tileState = 'idle',
  size = 'large',
  onPress,
  disabled = false,
}) {
  const scale = useSharedValue(1);
  const bgProgress = useSharedValue(0); // 0 = idle, 1 = active/placed

  // Respond to tileState changes
  useEffect(() => {
    switch (tileState) {
      case 'placed':
        bgProgress.value = withTiming(1, { duration: 150 });
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
        break;
      case 'used':
        bgProgress.value = withTiming(0, { duration: 200 });
        break;
      case 'highlighted':
        bgProgress.value = withTiming(0.5, { duration: 200 });
        scale.value = withRepeat(
          withSequence(
            withTiming(1.08, { duration: 400 }),
            withTiming(1.0, { duration: 400 }),
          ),
          -1,
          false,
        );
        break;
      case 'correct':
        bgProgress.value = withSequence(
          withTiming(2, { duration: 150 }),
          withTiming(0, { duration: 400 }),
        );
        scale.value = withSpring(1, { damping: 8, stiffness: 200 });
        break;
      default:
        bgProgress.value = withTiming(0, { duration: 150 });
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
        break;
    }
  }, [tileState]);

  const tileSize = size === 'large' ? TILE.large
    : size === 'medium' ? TILE.medium
    : size === 'small' ? TILE.small
    : TILE.wordDisplay;

  const fontSize = size === 'large' ? FONT_SIZE.tile
    : size === 'medium' ? FONT_SIZE.xl
    : size === 'small' ? FONT_SIZE.lg
    : FONT_SIZE.md;

  const animatedStyle = useAnimatedStyle(() => {
    const bg = interpolateColor(
      bgProgress.value,
      [0, 0.5, 1, 2],
      [COLORS.tileDefault, COLORS.tileMatched, COLORS.tileActive, COLORS.success],
    );
    return {
      transform: [{ scale: scale.value }],
      backgroundColor: tileState === 'used' ? COLORS.tileUsed : bg,
      opacity: tileState === 'used' ? 0.5 : 1,
    };
  });

  function handlePress() {
    if (disabled || tileState === 'used') return;
    // Bounce animation
    scale.value = withSequence(
      withSpring(1.2, { damping: 8, stiffness: 300 }),
      withSpring(1.0, { damping: 12, stiffness: 200 }),
    );
    onPress && onPress(id);
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || tileState === 'used'}
      style={[styles.pressable, { width: tileSize, height: tileSize }]}
      accessibilityRole="button"
      accessibilityLabel={`Letter ${letter.toUpperCase()}`}
    >
      <Animated.View style={[styles.tile, { width: tileSize, height: tileSize }, animatedStyle]}>
        <Text style={[styles.letter, { fontSize }]}>
          {letter.toUpperCase()}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: {
    borderRadius: LAYOUT.tileRadius,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  letter: {
    fontFamily: 'Nunito_800ExtraBold',
    color: COLORS.textPrimary,
    includeFontPadding: false,
    textAlign: 'center',
  },
});
