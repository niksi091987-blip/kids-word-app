import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  cancelAnimation,
} from 'react-native-reanimated';

// ── HintBuddy — animated cartoon owl helper ───────────────────────────────────
// Shows a bouncing mini-owl with a speech bubble.
// First appearance: bubble says "Need help? Tap me!"
// On press: wiggles excitedly and calls onPress.

export default function HintBuddy({ onPress, disabled }) {
  const [showBubble, setShowBubble] = useState(true);
  const hideTimer = useRef(null);

  const bounce = useSharedValue(0);
  const scale  = useSharedValue(1);
  const tilt   = useSharedValue(0);
  const eyeScale = useSharedValue(1);

  // Gentle idle bounce
  useEffect(() => {
    bounce.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 650 }),
        withTiming(0,  { duration: 650 }),
      ),
      -1,
      false,
    );

    // Auto-hide speech bubble after 3 s
    hideTimer.current = setTimeout(() => setShowBubble(false), 3000);
    return () => clearTimeout(hideTimer.current);
  }, []);

  function handlePress() {
    if (disabled) return;

    // Show bubble briefly again with encouraging text
    setShowBubble(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowBubble(false), 2200);

    // Wiggle + bounce animation
    cancelAnimation(tilt);
    tilt.value = withSequence(
      withTiming(-16, { duration: 70 }),
      withTiming(16,  { duration: 70 }),
      withTiming(-10, { duration: 70 }),
      withTiming(10,  { duration: 70 }),
      withTiming(0,   { duration: 70 }),
    );
    scale.value = withSequence(
      withSpring(1.4, { damping: 3, stiffness: 400 }),
      withSpring(1.0, { damping: 8, stiffness: 200 }),
    );
    eyeScale.value = withSequence(
      withTiming(1.6, { duration: 100 }),
      withTiming(1.0, { duration: 200 }),
    );

    onPress?.();
  }

  const bodyAnim = useAnimatedStyle(() => ({
    transform: [
      { translateY: bounce.value },
      { scale: scale.value },
      { rotate: `${tilt.value}deg` },
    ],
  }));

  const eyeAnim = useAnimatedStyle(() => ({
    transform: [{ scale: eyeScale.value }],
  }));

  return (
    <Pressable onPress={handlePress} disabled={disabled} style={styles.wrapper}>
      {/* Speech bubble */}
      {showBubble && (
        <View style={styles.bubble} pointerEvents="none">
          <Text style={styles.bubbleText}>
            {disabled ? 'Hmm...' : "Need help?\nTap me! 👋"}
          </Text>
          <View style={styles.bubbleTail} />
        </View>
      )}

      {/* Owl body */}
      <Animated.View style={[styles.body, bodyAnim, disabled && styles.bodyDisabled]}>
        {/* Ears */}
        <View style={styles.ears}>
          <View style={styles.ear} />
          <View style={styles.ear} />
        </View>

        {/* Eyes */}
        <Animated.View style={[styles.eyeRow, eyeAnim]}>
          <View style={styles.eyeOuter}>
            <View style={styles.eyeInner} />
          </View>
          <View style={styles.eyeOuter}>
            <View style={styles.eyeInner} />
          </View>
        </Animated.View>

        {/* Beak */}
        <View style={styles.beak} />

        {/* Wings */}
        <View style={styles.wings}>
          <View style={styles.wing} />
          <View style={styles.wing} />
        </View>
      </Animated.View>

      <Text style={[styles.label, disabled && { color: '#94A3B8' }]}>HINT</Text>
    </Pressable>
  );
}

const BODY_W = 48;
const BODY_H = 54;

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: BODY_W + 12,
    minHeight: BODY_H + 28,
  },

  // ── Speech bubble ───────────────────────────────────────────────────────────
  bubble: {
    position: 'absolute',
    bottom: BODY_H + 24,
    backgroundColor: '#FFFBEB',
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 110,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  bubbleText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 15,
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#F59E0B',
  },

  // ── Owl body ────────────────────────────────────────────────────────────────
  body: {
    width: BODY_W,
    height: BODY_H,
    backgroundColor: '#92400E',
    borderRadius: BODY_W / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FDE68A',
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
    top: -4,
    flexDirection: 'row',
    gap: 14,
  },
  ear: {
    width: 8,
    height: 12,
    backgroundColor: '#78350F',
    borderRadius: 4,
  },

  // Eyes
  eyeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  eyeOuter: {
    width: 14,
    height: 14,
    backgroundColor: '#FEF3C7',
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeInner: {
    width: 6,
    height: 6,
    backgroundColor: '#1E1B4B',
    borderRadius: 3,
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
    marginTop: 3,
  },

  // Wing nubs
  wings: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 4,
  },
  wing: {
    width: 10,
    height: 12,
    backgroundColor: '#78350F',
    borderRadius: 5,
  },

  // Label
  label: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    color: '#92400E',
    letterSpacing: 1,
    marginTop: 4,
  },
});
