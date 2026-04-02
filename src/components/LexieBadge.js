import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withRepeat, withSequence,
  withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

// ── Mini letter tile (same style as HomeScreen logo, smaller) ──────
function MiniTile({ letter, bg, dark, delay, wobbleDelay }) {
  const sc  = useSharedValue(0);
  const rot = useSharedValue(-20);
  const wob = useSharedValue(0);

  useEffect(() => {
    sc.value  = withDelay(delay, withSpring(1, { damping: 6, stiffness: 100 }));
    rot.value = withDelay(delay, withSpring(0, { damping: 7 }));
    wob.value = withDelay(wobbleDelay, withRepeat(
      withSequence(
        withTiming(-7, { duration: 350, easing: Easing.inOut(Easing.ease) }),
        withTiming( 7, { duration: 350, easing: Easing.inOut(Easing.ease) }),
        withTiming( 0, { duration: 180 }),
        withTiming( 0, { duration: 900 }), // pause
      ), -1, false,
    ));
  }, []);

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: sc.value }, { rotate: `${rot.value + wob.value}deg` }],
  }));

  return (
    <Animated.View style={anim}>
      <View style={[st.tileShadow, { backgroundColor: dark }]} />
      <View style={[st.tileFace, { backgroundColor: bg }]}>
        <View style={st.tileShine} />
        <Text style={st.tileLetter}>{letter}</Text>
      </View>
    </Animated.View>
  );
}

// ── Lightning connector ────────────────────────────────────────────
function MiniConnector({ delay }) {
  const op = useSharedValue(0);
  const sc = useSharedValue(0);
  useEffect(() => {
    op.value = withDelay(delay, withTiming(1, { duration: 300 }));
    sc.value = withDelay(delay, withSpring(1, { damping: 8 }));
  }, []);
  const anim = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ scale: sc.value }] }));
  return (
    <Animated.View style={anim}>
      <Text style={st.bolt}>⚡</Text>
    </Animated.View>
  );
}

// ── Main badge ─────────────────────────────────────────────────────
export default function LexieBadge({ style }) {
  const badgeSc = useSharedValue(0);
  const glowOp  = useSharedValue(0.4);

  useEffect(() => {
    badgeSc.value = withSpring(1, { damping: 8, stiffness: 90 });
    glowOp.value  = withRepeat(
      withSequence(
        withTiming(1,   { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ), -1, false,
    );
  }, []);

  const badgeAnim = useAnimatedStyle(() => ({ transform: [{ scale: badgeSc.value }] }));
  const glowAnim  = useAnimatedStyle(() => ({ opacity: glowOp.value }));

  return (
    <Animated.View style={[st.wrap, style, badgeAnim]}>
      {/* Glow border */}
      <Animated.View style={[StyleSheet.absoluteFill, st.glowBorder, glowAnim]} />

      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'rgba(20,10,50,0.55)']}
        style={st.inner}
      >
        {/* W tile */}
        <MiniTile letter="W" bg="#FF6B6B" dark="#C94B4B" delay={80}  wobbleDelay={1200} />
        <MiniConnector delay={220} />
        {/* L tile */}
        <MiniTile letter="L" bg="#FFD700" dark="#C9A800" delay={160} wobbleDelay={1800} />

        {/* Divider */}
        <View style={st.divider} />

        {/* Text */}
        <View style={st.textWrap}>
          <Text style={st.small}>LEXIE'S</Text>
          <Text style={st.big}>WORD LAB</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const TILE = 34;

const st = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    borderRadius: 22,
    overflow: 'visible',
  },
  glowBorder: {
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 0,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.20)',
  },

  // Tile styles (scaled down from HomeScreen CartoonTile)
  tileShadow: {
    position: 'absolute',
    width: TILE, height: TILE,
    borderRadius: 9,
    top: 3, left: 3,
  },
  tileFace: {
    width: TILE, height: TILE,
    borderRadius: 9,
    borderWidth: 2.5,
    borderColor: '#1A0A3A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tileShine: {
    position: 'absolute',
    top: 3, left: 3,
    width: 10, height: 6,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 4,
    transform: [{ rotate: '-20deg' }],
  },
  tileLetter: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  bolt: { fontSize: 13, marginHorizontal: -2 },

  divider: {
    width: 1.5, height: 28,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginHorizontal: 4,
  },

  textWrap: { gap: 0 },
  small: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 9,
    color: 'rgba(255,220,100,0.95)',
    letterSpacing: 2.5,
  },
  big: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 15,
    color: 'white',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});
