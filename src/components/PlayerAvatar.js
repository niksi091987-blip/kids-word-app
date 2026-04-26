/**
 * PlayerAvatar.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable avatar display that reads the configured character/color/accessory/name
 * directly from UserContext. Drop it anywhere — it always reflects the kid's
 * current avatar without any props.
 *
 * Variants (via the `variant` prop):
 *   'hud'    — compact horizontal pill for the GameScreen header bar
 *   'card'   — medium floating card for HomeScreen hero area
 *   'result' — large celebrating version for ResultScreen
 *
 * All three share the same data source; only size + layout differ.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withRepeat, withSequence,
  withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import { useUser } from '../context/UserContext';
import { getCharacter, getAccessory } from '../constants/avatarData';

// ── HUD variant ── horizontal pill next to home button ───────────────────────
// Fits in a 42px-tall header row: [circle + accessory badge] [name]
function HudAvatar({ char, acc, color, name }) {
  const sc     = useSharedValue(0);
  const wobble = useSharedValue(0);

  useEffect(() => {
    // Pop in on mount
    sc.value = withSpring(1, { damping: 7, stiffness: 120 });
    // Subtle idle wobble so kids notice it's tappable
    wobble.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(4,  { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0,  { duration: 500 }),
        withTiming(0,  { duration: 1200 }),   // pause before next wiggle
      ), -1, false,
    );
  }, []);

  const pillAnim   = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
  const wobbleAnim = useAnimatedStyle(() => ({ transform: [{ rotate: `${wobble.value}deg` }] }));

  return (
    <Animated.View style={[hud.pill, { borderColor: color, shadowColor: color }, pillAnim]}>
      {/* Circle with character */}
      <Animated.View style={wobbleAnim}>
        <View style={[hud.circle, { backgroundColor: color }]}>
          <Text style={hud.charEmoji}>{char.emoji}</Text>
          {/* Accessory as a tiny badge on top-right of circle */}
          {acc.id !== 'none' && (
            <View style={hud.accBadge}>
              <Text style={hud.accEmoji}>{acc.emoji}</Text>
            </View>
          )}
        </View>
      </Animated.View>
      {/* Name */}
      <Text style={hud.name} numberOfLines={1}>{name}</Text>
    </Animated.View>
  );
}

// ── Card variant ── medium card used in HomeScreen hero ───────────────────────
function CardAvatar({ char, acc, color, name }) {
  const bobY    = useSharedValue(0);
  const sc      = useSharedValue(0);
  const glowOp  = useSharedValue(0.5);
  const accBob  = useSharedValue(0);
  const sparkOp = useSharedValue(0);

  useEffect(() => {
    sc.value = withDelay(100, withSpring(1, { damping: 7, stiffness: 90 }));

    bobY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 950, easing: Easing.inOut(Easing.ease) }),
        withTiming(0,   { duration: 950, easing: Easing.inOut(Easing.ease) }),
      ), -1, true,
    );

    accBob.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(0,  { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      ), -1, true,
    );

    glowOp.value = withRepeat(
      withSequence(
        withTiming(1,   { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ), -1, false,
    );

    // Sparkle every 3 seconds
    const sparkLoop = () => {
      sparkOp.value = withSequence(
        withTiming(1, { duration: 150 }),
        withDelay(500, withTiming(0, { duration: 300 })),
      );
    };
    const id = setInterval(sparkLoop, 3000);
    return () => clearInterval(id);
  }, []);

  const containerAnim = useAnimatedStyle(() => ({
    transform: [{ scale: sc.value }, { translateY: bobY.value }],
  }));
  const accAnim  = useAnimatedStyle(() => ({ transform: [{ translateY: accBob.value }] }));
  const glowAnim = useAnimatedStyle(() => ({ opacity: glowOp.value }));
  const sparkAnim = useAnimatedStyle(() => ({ opacity: sparkOp.value }));

  return (
    <View style={card.outer}>
      {/* Sparkles */}
      <Animated.Text style={[card.sparkL, sparkAnim]}>✨</Animated.Text>
      <Animated.Text style={[card.sparkR, sparkAnim]}>⭐</Animated.Text>

      <Animated.View style={[card.container, containerAnim]}>
        {/* Accessory */}
        {acc.id !== 'none' && (
          <Animated.Text style={[card.accessory, accAnim]}>{acc.emoji}</Animated.Text>
        )}

        {/* Glow ring */}
        <Animated.View style={[
          card.glowRing,
          { borderColor: color, shadowColor: color },
          glowAnim,
        ]} />

        {/* Circle */}
        <View style={[card.circle, { backgroundColor: color, shadowColor: color }]}>
          <View style={[card.innerRing, { borderColor: 'rgba(255,255,255,0.45)' }]} />
          <Text style={card.emoji}>{char.emoji}</Text>
        </View>
      </Animated.View>

      {/* Name tag */}
      <View style={card.nameTag}>
        <Text style={card.nameText} numberOfLines={1}>{name}</Text>
      </View>
    </View>
  );
}

// ── Result variant ── large celebrating avatar for ResultScreen ────────────────
function ResultAvatar({ char, acc, color, name, stars = 0 }) {
  const sc       = useSharedValue(0);
  const bounceY  = useSharedValue(0);
  const accBob   = useSharedValue(0);
  const starSc   = useSharedValue(0);

  useEffect(() => {
    // Pop in
    sc.value = withDelay(200, withSequence(
      withSpring(1.2, { damping: 4, stiffness: 200 }),
      withSpring(1,   { damping: 8 }),
    ));

    // Celebrate bounce
    bounceY.value = withDelay(500, withRepeat(
      withSequence(
        withTiming(-14, { duration: 380, easing: Easing.out(Easing.quad) }),
        withTiming(0,   { duration: 320, easing: Easing.in(Easing.quad) }),
        withTiming(0,   { duration: 400 }),  // pause
      ), -1, false,
    ));

    accBob.value = withDelay(600, withRepeat(
      withSequence(
        withTiming(-8, { duration: 420, easing: Easing.inOut(Easing.ease) }),
        withTiming(0,  { duration: 420, easing: Easing.inOut(Easing.ease) }),
      ), -1, true,
    ));

    // Stars pop in
    starSc.value = withDelay(800, withSpring(1, { damping: 6 }));
  }, []);

  const circleAnim = useAnimatedStyle(() => ({
    transform: [{ scale: sc.value }, { translateY: bounceY.value }],
  }));
  const accAnim  = useAnimatedStyle(() => ({ transform: [{ translateY: accBob.value }] }));
  const starAnim = useAnimatedStyle(() => ({ transform: [{ scale: starSc.value }] }));

  return (
    <View style={res.outer}>
      {/* Accessory */}
      {acc.id !== 'none' && (
        <Animated.Text style={[res.accessory, accAnim]}>{acc.emoji}</Animated.Text>
      )}

      {/* Circle */}
      <Animated.View style={circleAnim}>
        <View style={[res.circle, { backgroundColor: color, shadowColor: color }]}>
          <View style={[res.innerRing, { borderColor: 'rgba(255,255,255,0.4)' }]} />
          <Text style={res.emoji}>{char.emoji}</Text>
        </View>
      </Animated.View>

      {/* Name */}
      <View style={res.nameTag}>
        <Text style={res.nameText} numberOfLines={1}>{name}</Text>
      </View>

      {/* Stars earned */}
      {stars > 0 && (
        <Animated.View style={[res.starsRow, starAnim]}>
          {Array.from({ length: 3 }, (_, i) => (
            <Text key={i} style={[res.star, i < stars ? res.starFilled : res.starEmpty]}>
              {i < stars ? '⭐' : '☆'}
            </Text>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
/**
 * @param {'hud'|'card'|'result'} variant
 * @param {number} [stars]  — for 'result' variant only
 */
export default function PlayerAvatar({ variant = 'card', stars }) {
  const { state: user } = useUser();

  const char  = getCharacter(user.avatar?.character || 'owl');
  const acc   = getAccessory(user.avatar?.accessory || 'none');
  const color = user.avatar?.color || '#FF9A3C';
  const name  = (user.name && user.name !== 'Friend')
    ? user.name
    : char.name;   // fall back to character's default name

  if (variant === 'hud')    return <HudAvatar    char={char} acc={acc} color={color} name={name} />;
  if (variant === 'result') return <ResultAvatar char={char} acc={acc} color={color} name={name} stars={stars} />;
  return                           <CardAvatar   char={char} acc={acc} color={color} name={name} />;
}

// ── Styles — HUD ──────────────────────────────────────────────────────────────
const hud = StyleSheet.create({
  // Horizontal pill: [circle][name] — max height 42px so it fits a header row
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 22,
    borderWidth: 2,
    paddingRight: 10,
    paddingLeft: 3,
    paddingVertical: 3,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
    minWidth: 70,
    maxWidth: 120,
  },
  circle: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)',
  },
  charEmoji: { fontSize: 18 },
  accBadge: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 8, padding: 1,
  },
  accEmoji: { fontSize: 11 },
  name: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11, color: '#1565C0',
    flexShrink: 1,
    letterSpacing: 0.2,
  },
});

// ── Styles — Card ─────────────────────────────────────────────────────────────
const card = StyleSheet.create({
  outer: { alignItems: 'center', marginBottom: 6 },
  container: { alignItems: 'center' },

  sparkL: { position: 'absolute', left: -20, top: 10, fontSize: 20 },
  sparkR: { position: 'absolute', right: -20, top: 20, fontSize: 16 },

  accessory: { fontSize: 34, marginBottom: 2, zIndex: 2 },

  glowRing: {
    position: 'absolute',
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 20, elevation: 0,
    top: 24,   // offset to align with circle
  },

  circle: {
    width: 108, height: 108, borderRadius: 54,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.9)',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 14, elevation: 12,
  },
  innerRing: {
    position: 'absolute', width: 94, height: 94, borderRadius: 47, borderWidth: 2,
  },
  emoji: { fontSize: 54 },

  nameTag: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
    minWidth: 100, alignItems: 'center',
  },
  nameText: {
    fontFamily: 'Nunito_800ExtraBold', fontSize: 17, color: '#1565C0',
  },
});

// ── Styles — Result ───────────────────────────────────────────────────────────
const res = StyleSheet.create({
  outer: { alignItems: 'center' },
  accessory: { fontSize: 40, marginBottom: 2 },
  circle: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.95)',
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 16,
  },
  innerRing: {
    position: 'absolute', width: 104, height: 104, borderRadius: 52, borderWidth: 2,
  },
  emoji:  { fontSize: 60 },
  nameTag: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, paddingHorizontal: 22, paddingVertical: 7,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
  },
  nameText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 18, color: '#fff' },
  starsRow: { flexDirection: 'row', marginTop: 10, gap: 4 },
  star:     { fontSize: 28 },
  starFilled: {},
  starEmpty:  { opacity: 0.35 },
});
