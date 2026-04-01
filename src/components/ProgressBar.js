import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../constants/colors';
import { LAYOUT, SPACE, FONT_SIZE } from '../constants/dimensions';

/**
 * ProgressBar — generic fill progress bar.
 *
 * Props:
 *   progress   number   0.0 – 1.0
 *   color      string   fill color (default primary)
 *   label      string   optional label
 *   height     number   bar height
 */
export default function ProgressBar({
  progress = 0,
  color = COLORS.primary,
  label,
  height = 8,
}) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.max(0, Math.min(1, progress)), { duration: 500 });
  }, [progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
    backgroundColor: color,
  }));

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.track, { height }]}>
        <Animated.View style={[styles.fill, { height, borderRadius: height / 2 }, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACE.xs,
  },
  label: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  track: {
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
