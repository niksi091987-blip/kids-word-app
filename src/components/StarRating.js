import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { SPACE } from '../constants/dimensions';

const STAR_ICON_LARGE = 48;
const STAR_ICON_SMALL = 24;

function AnimatedStar({ index, earned, animate, size }) {
  const scale = useSharedValue(animate ? 0 : 1);
  const rotation = useSharedValue(0);
  const iconSize = size === 'large' ? STAR_ICON_LARGE : STAR_ICON_SMALL;

  useEffect(() => {
    if (animate && earned) {
      scale.value = withDelay(
        index * 300,
        withSpring(1, { damping: 4, stiffness: 150 }),
      );
      rotation.value = withDelay(
        index * 300,
        withSpring(0, { damping: 6, stiffness: 100 }),
      );
    } else if (animate && !earned) {
      scale.value = withDelay(index * 300, withTiming(1, { duration: 200 }));
    }
  }, [animate, earned]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.star, animStyle]}>
      <Ionicons
        name={earned ? 'star' : 'star-outline'}
        size={iconSize}
        color={earned ? COLORS.secondary : COLORS.border}
      />
    </Animated.View>
  );
}

/**
 * StarRating — displays 1-3 stars with optional pop-in animation.
 *
 * Props:
 *   stars    0 | 1 | 2 | 3
 *   animate  bool   — play fill-in animation (for ResultScreen)
 *   size     'small' | 'large'
 */
export default function StarRating({ stars = 0, animate = false, size = 'large' }) {
  return (
    <View style={styles.container}>
      {[0, 1, 2].map((i) => (
        <AnimatedStar
          key={i}
          index={i}
          earned={i < stars}
          animate={animate}
          size={size}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.sm,
  },
  star: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
