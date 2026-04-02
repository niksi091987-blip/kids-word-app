import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { TIMER_COLOR_THRESHOLDS } from '../constants/config';

const SCREEN_W = Dimensions.get('window').width;
const BAR_HEIGHT = 22;
const TRACK_WIDTH = SCREEN_W - 100; // room for clock + counter

export default function TimerBar({ totalSeconds, secondsLeft }) {
  const fraction = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;

  const widthAnim   = useSharedValue(1);
  const colorProg   = useSharedValue(0);
  const pulseScale  = useSharedValue(1);
  const shimmerX    = useSharedValue(-TRACK_WIDTH);
  const clockSpin   = useSharedValue(0);
  const glowOpacity = useSharedValue(0.4);

  // Update bar width + color on every tick
  useEffect(() => {
    widthAnim.value = withTiming(fraction, {
      duration: 900,
      easing: Easing.out(Easing.quad),
    });

    let cp = 0;
    if (fraction >= TIMER_COLOR_THRESHOLDS.safe) cp = 0;
    else if (fraction >= TIMER_COLOR_THRESHOLDS.mid) cp = 0.33;
    else if (fraction >= TIMER_COLOR_THRESHOLDS.warning) cp = 0.66;
    else cp = 1;
    colorProg.value = withTiming(cp, { duration: 600 });
  }, [secondsLeft]);

  // Shimmer moves left→right continuously
  useEffect(() => {
    shimmerX.value = withRepeat(
      withSequence(
        withTiming(-TRACK_WIDTH, { duration: 0 }),
        withTiming(TRACK_WIDTH, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(TRACK_WIDTH, { duration: 600 }), // pause before reset
      ),
      -1,
    );
  }, []);

  // Clock spins faster as time runs out
  useEffect(() => {
    const speed = fraction < TIMER_COLOR_THRESHOLDS.warning ? 600
      : fraction < TIMER_COLOR_THRESHOLDS.mid ? 1200 : 2400;
    clockSpin.value = withRepeat(
      withTiming(360, { duration: speed, easing: Easing.linear }),
      -1,
    );
  }, [Math.floor(fraction * 4)]); // re-trigger at quarter marks

  // Pulse bar + glow in warning zone
  useEffect(() => {
    if (fraction < TIMER_COLOR_THRESHOLDS.warning && fraction > 0) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 220 }),
          withTiming(1.0,  { duration: 220 }),
        ),
        -1,
        true,
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.9, { duration: 300 }),
          withTiming(0.3, { duration: 300 }),
        ),
        -1,
        true,
      );
    } else {
      pulseScale.value = withSpring(1);
      glowOpacity.value = withTiming(0.4, { duration: 400 });
    }
  }, [fraction < TIMER_COLOR_THRESHOLDS.warning]);

  const barStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      colorProg.value,
      [0, 0.33, 0.66, 1],
      ['#39FF14', '#FFD700', '#FF8C00', '#FF2222'],
    );
    return {
      width: `${widthAnim.value * 100}%`,
      backgroundColor: color,
      transform: [{ scaleY: pulseScale.value }],
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: glowOpacity.value,
      shadowRadius: 10,
    };
  });

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  const clockStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${clockSpin.value}deg` }],
  }));

  // Format mm:ss
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeStr = mins > 0
    ? `${mins}:${String(secs).padStart(2, '0')}`
    : `${secs}s`;

  // Counter turns red in warning zone
  const counterColor = fraction < TIMER_COLOR_THRESHOLDS.warning
    ? '#DC2626'
    : fraction < TIMER_COLOR_THRESHOLDS.mid
      ? '#D97706'
      : '#1565C0';

  return (
    <View style={styles.row}>
      {/* Spinning clock */}
      <Animated.Text style={[styles.clockEmoji, clockStyle]}>⏱️</Animated.Text>

      {/* Track */}
      <View style={styles.track}>
        {/* Filled bar with glow */}
        <Animated.View style={[styles.bar, barStyle]}>
          {/* Shimmer overlay */}
          <Animated.View style={[styles.shimmer, shimmerStyle]} />
        </Animated.View>

        {/* Tick marks at 25% 50% 75% */}
        {[0.25, 0.5, 0.75].map(pos => (
          <View
            key={pos}
            style={[styles.tick, { left: `${pos * 100}%` }]}
          />
        ))}
      </View>

      {/* Numeric counter */}
      <Text style={[styles.counter, { color: counterColor }]}>{timeStr}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  clockEmoji: {
    fontSize: 22,
  },
  track: {
    flex: 1,
    height: BAR_HEIGHT,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: BAR_HEIGHT / 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  bar: {
    height: '100%',
    borderRadius: BAR_HEIGHT / 2,
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255,255,255,0.30)',
    borderRadius: 30,
    transform: [{ skewX: '-20deg' }],
  },
  tick: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  counter: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 15,
    minWidth: 36,
    textAlign: 'right',
  },
});
