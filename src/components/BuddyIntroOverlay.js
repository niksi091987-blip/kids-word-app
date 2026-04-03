import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';

// ── BuddyIntroOverlay ─────────────────────────────────────────────────────────
// Full-screen overlay that pops up when a new puzzle loads.
// Lifecycle:
//   show=true  → backdrop fades in + card springs up from center
//                → onReady() fires (parent speaks the intro text)
//   show=false → card springs down + backdrop fades out
//                → onDismissed() fires (parent starts word pronunciation)

export default function BuddyIntroOverlay({ show, onReady, onDismissed }) {
  const prevShow = useRef(false);

  const backdrop   = useSharedValue(0);
  const cardScale  = useSharedValue(0);
  const cardY      = useSharedValue(60);
  const owlBounce  = useSharedValue(0);
  const owlRotate  = useSharedValue(0);
  const starSpin   = useSharedValue(0);

  useEffect(() => {
    if (show && !prevShow.current) {
      // ── Entrance ────────────────────────────────────────────────
      backdrop.value  = withTiming(1, { duration: 320 });
      cardY.value     = withSpring(0, { damping: 14, stiffness: 180 });
      cardScale.value = withSequence(
        withSpring(1.08, { damping: 8, stiffness: 220 }),
        withSpring(1.0,  { damping: 14, stiffness: 260 }, (finished) => {
          if (finished) runOnJS(onReady)();
        }),
      );

      // Owl idle bounce while overlay is showing
      owlBounce.value = withRepeat(
        withSequence(
          withTiming(-9, { duration: 550 }),
          withTiming(0,  { duration: 550 }),
        ),
        -1,
        false,
      );

      // Owl gentle sway
      owlRotate.value = withRepeat(
        withSequence(
          withTiming(-6, { duration: 700 }),
          withTiming(6,  { duration: 700 }),
        ),
        -1,
        true,
      );

      // Stars rotate
      starSpin.value = withRepeat(
        withTiming(360, { duration: 4000 }),
        -1,
        false,
      );

    } else if (!show && prevShow.current) {
      // ── Exit ────────────────────────────────────────────────────
      cancelAnimation(owlBounce);
      cancelAnimation(owlRotate);
      cancelAnimation(starSpin);

      cardScale.value = withTiming(0.6, { duration: 280 });
      cardY.value     = withTiming(80,  { duration: 280 });
      backdrop.value  = withTiming(0, { duration: 320 }, (finished) => {
        if (finished) runOnJS(onDismissed)();
      });
    }
    prevShow.current = show;
  }, [show]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: cardScale.value },
      { translateY: cardY.value },
    ],
  }));

  const owlStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: owlBounce.value },
      { rotate: `${owlRotate.value}deg` },
    ],
  }));

  const starStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starSpin.value}deg` }],
  }));

  // Don't block touches when invisible
  const pointerEvents = show ? 'auto' : 'none';

  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, styles.backdrop, backdropStyle]}
      pointerEvents={pointerEvents}
    >
      <Animated.View style={[styles.card, cardStyle]}>

        {/* Spinning star ring */}
        <Animated.View style={[styles.starRing, starStyle]}>
          {['⭐', '✨', '🌟', '💫', '⭐', '✨'].map((s, i) => (
            <Text key={i} style={[styles.starItem, {
              transform: [{ rotate: `${i * 60}deg` }, { translateY: -66 }],
            }]}>{s}</Text>
          ))}
        </Animated.View>

        {/* Owl */}
        <Animated.View style={[styles.owlWrap, owlStyle]}>
          {/* Body */}
          <View style={styles.owlBody}>
            {/* Ear tufts */}
            <View style={styles.owlEars}>
              <View style={styles.owlEar} />
              <View style={styles.owlEar} />
            </View>
            {/* Eyes */}
            <View style={styles.owlEyeRow}>
              <View style={styles.owlEye}><View style={styles.owlPupil} /></View>
              <View style={styles.owlEye}><View style={styles.owlPupil} /></View>
            </View>
            {/* Beak */}
            <View style={styles.owlBeak} />
            {/* Wings */}
            <View style={styles.owlWings}>
              <View style={styles.owlWing} />
              <View style={styles.owlWing} />
            </View>
            {/* Feet */}
            <View style={styles.owlFeet}>
              <View style={styles.owlFoot} />
              <View style={styles.owlFoot} />
            </View>
          </View>
        </Animated.View>

        {/* Text */}
        <Text style={styles.title}>Hi! I am your{'\n'}helper buddy! 👋</Text>
        <Text style={styles.subtitle}>
          Tap me anytime{'\n'}you need a hint!
        </Text>

        {/* Bottom decoration */}
        <View style={styles.dotRow}>
          {[0, 1, 2, 3, 4].map(i => (
            <View key={i} style={[styles.dot, { opacity: 0.3 + i * 0.14 }]} />
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const OWL_W = 88;
const OWL_H = 100;

const styles = StyleSheet.create({
  backdrop: {
    zIndex: 999,
    backgroundColor: 'rgba(10, 20, 60, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    width: 290,
    backgroundColor: '#FFFBEB',
    borderRadius: 32,
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderWidth: 3,
    borderColor: '#F59E0B',
    shadowColor: '#92400E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
    overflow: 'visible',
  },

  // ── Spinning stars ─────────────────────────────────────────────────────────
  starRing: {
    position: 'absolute',
    top: 30,
    width: 1,
    height: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starItem: {
    position: 'absolute',
    fontSize: 16,
  },

  // ── Owl ────────────────────────────────────────────────────────────────────
  owlWrap: {
    marginBottom: 16,
    marginTop: 8,
  },
  owlBody: {
    width: OWL_W,
    height: OWL_H,
    backgroundColor: '#92400E',
    borderRadius: OWL_W / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FDE68A',
    shadowColor: '#78350F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
    overflow: 'visible',
  },

  owlEars: {
    position: 'absolute',
    top: -10,
    flexDirection: 'row',
    gap: 26,
  },
  owlEar: {
    width: 14,
    height: 20,
    backgroundColor: '#78350F',
    borderRadius: 7,
  },

  owlEyeRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 14,
  },
  owlEye: {
    width: 24,
    height: 24,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
  },
  owlPupil: {
    width: 10,
    height: 10,
    backgroundColor: '#1E1B4B',
    borderRadius: 5,
  },

  owlBeak: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FCD34D',
    marginTop: 6,
  },

  owlWings: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 8,
  },
  owlWing: {
    width: 18,
    height: 22,
    backgroundColor: '#78350F',
    borderRadius: 9,
  },

  owlFeet: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 6,
  },
  owlFoot: {
    width: 12,
    height: 8,
    backgroundColor: '#FCD34D',
    borderRadius: 4,
  },

  // ── Text ────────────────────────────────────────────────────────────────────
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: '#B45309',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },

  // ── Dots ────────────────────────────────────────────────────────────────────
  dotRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
});
