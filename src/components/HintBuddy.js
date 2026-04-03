import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';

// ── HintBuddy ─────────────────────────────────────────────────────────────────
// Animated mini-owl that lives next to the HINT action.
// • Bounces gently when idle
// • Periodically waves a wing to attract attention
// • Speech bubble fades in on load, fades out after 3 s
// • On press: wiggles excitedly, bubble re-appears briefly

export default function HintBuddy({ onPress, disabled }) {
  const hideTimer = useRef(null);

  // Shared values
  const bounce      = useSharedValue(0);   // body float
  const scale       = useSharedValue(1);   // press pop
  const tilt        = useSharedValue(0);   // wiggle on press
  const waveAngle   = useSharedValue(0);   // right-wing wave
  const eyePop      = useSharedValue(1);   // eye scale on press
  const bubbleOpacity = useSharedValue(0); // speech-bubble fade

  // ── Idle animations ─────────────────────────────────────────────────────────
  useEffect(() => {
    // Gentle float
    bounce.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 700 }),
        withTiming(0,  { duration: 700 }),
      ),
      -1,
      false,
    );

    // Periodic wing-wave: wave twice, then pause ~4 s, repeat
    waveAngle.value = withRepeat(
      withSequence(
        withDelay(2500, withTiming(-22, { duration: 160 })),
        withTiming(0,   { duration: 160 }),
        withTiming(-22, { duration: 160 }),
        withTiming(0,   { duration: 160 }),
        withTiming(0,   { duration: 3500 }), // pause
      ),
      -1,
      false,
    );

    // Fade bubble in on mount, then fade out after 3.2 s
    bubbleOpacity.value = withTiming(1, { duration: 350 });
    hideTimer.current = setTimeout(() => {
      bubbleOpacity.value = withTiming(0, { duration: 500 });
    }, 3200);

    return () => clearTimeout(hideTimer.current);
  }, []);

  // ── Press handler ────────────────────────────────────────────────────────────
  function handlePress() {
    if (disabled) return;

    // Wiggle + pop
    cancelAnimation(tilt);
    tilt.value = withSequence(
      withTiming(-15, { duration: 65 }),
      withTiming(15,  { duration: 65 }),
      withTiming(-10, { duration: 65 }),
      withTiming(10,  { duration: 65 }),
      withTiming(0,   { duration: 65 }),
    );
    scale.value = withSequence(
      withSpring(1.4, { damping: 3, stiffness: 400 }),
      withSpring(1.0, { damping: 8, stiffness: 200 }),
    );
    eyePop.value = withSequence(
      withTiming(1.7, { duration: 90 }),
      withTiming(1.0, { duration: 220 }),
    );

    // Re-show bubble briefly
    clearTimeout(hideTimer.current);
    bubbleOpacity.value = withTiming(1, { duration: 200 });
    hideTimer.current = setTimeout(() => {
      bubbleOpacity.value = withTiming(0, { duration: 500 });
    }, 2500);

    onPress?.();
  }

  // ── Animated styles ──────────────────────────────────────────────────────────
  const bodyAnim = useAnimatedStyle(() => ({
    transform: [
      { translateY: bounce.value },
      { scale: scale.value },
      { rotate: `${tilt.value}deg` },
    ],
  }));

  const rightWingAnim = useAnimatedStyle(() => ({
    transform: [{ rotate: `${waveAngle.value}deg` }],
  }));

  const eyeAnim = useAnimatedStyle(() => ({
    transform: [{ scale: eyePop.value }],
  }));

  const bubbleAnim = useAnimatedStyle(() => ({
    opacity: bubbleOpacity.value,
    transform: [{ scale: 0.9 + bubbleOpacity.value * 0.1 }],
  }));

  return (
    <Pressable onPress={handlePress} disabled={disabled} style={styles.wrapper}>

      {/* Speech bubble */}
      <Animated.View style={[styles.bubble, bubbleAnim]} pointerEvents="none">
        <Text style={styles.bubbleText}>
          {disabled ? 'Hmm...' : 'Need help?\nTap me! 👋'}
        </Text>
        <View style={styles.bubbleTail} />
      </Animated.View>

      {/* Owl body */}
      <Animated.View style={[styles.body, bodyAnim, disabled && styles.bodyDisabled]}>

        {/* Ear tufts */}
        <View style={styles.ears}>
          <View style={styles.ear} />
          <View style={styles.ear} />
        </View>

        {/* Eyes */}
        <Animated.View style={[styles.eyeRow, eyeAnim]}>
          <View style={styles.eyeOuter}><View style={styles.eyeInner} /></View>
          <View style={styles.eyeOuter}><View style={styles.eyeInner} /></View>
        </Animated.View>

        {/* Beak */}
        <View style={styles.beak} />

        {/* Wings — right wing waves */}
        <View style={styles.wings}>
          <View style={[styles.wing, styles.wingLeft]} />
          <Animated.View style={[styles.wing, styles.wingRight, rightWingAnim]} />
        </View>
      </Animated.View>

      <Text style={[styles.label, disabled && { color: '#9CA3AF' }]}>HINT</Text>
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const W = 50;   // body width
const H = 58;   // body height

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: W + 14,
    minHeight: H + 30,
  },

  // Speech bubble
  bubble: {
    position: 'absolute',
    bottom: H + 26,
    backgroundColor: '#FFFBEB',
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    width: 114,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 5,
  },
  bubbleText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 16,
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -9,
    left: '50%',
    marginLeft: -7,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#F59E0B',
  },

  // Body
  body: {
    width: W,
    height: H,
    backgroundColor: '#92400E',
    borderRadius: W / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FDE68A',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.42,
    shadowRadius: 6,
    elevation: 7,
    overflow: 'visible',
  },
  bodyDisabled: {
    backgroundColor: '#D1D5DB',
    borderColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },

  // Ear tufts
  ears: {
    position: 'absolute',
    top: -6,
    flexDirection: 'row',
    gap: 16,
  },
  ear: {
    width: 9,
    height: 13,
    backgroundColor: '#78350F',
    borderRadius: 5,
  },

  // Eyes
  eyeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  eyeOuter: {
    width: 15,
    height: 15,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeInner: {
    width: 7,
    height: 7,
    backgroundColor: '#1E1B4B',
    borderRadius: 4,
  },

  // Beak
  beak: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FCD34D',
    marginTop: 4,
  },

  // Wings
  wings: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 6,
  },
  wing: {
    width: 11,
    height: 13,
    backgroundColor: '#78350F',
    borderRadius: 6,
  },
  wingLeft: {},
  wingRight: {},

  // Label
  label: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    color: '#92400E',
    letterSpacing: 1.2,
    marginTop: 4,
  },
});
