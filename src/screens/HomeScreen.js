import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withRepeat, withSequence,
  withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import { useProgress, PROGRESS_ACTIONS } from '../context/ProgressContext';
import { getLevelColor } from '../constants/colors';
import { TOTAL_LEVELS } from '../constants/config';

const { width: SW } = Dimensions.get('window');

const TILE_COLORS = ['#FF6B6B', '#FFD700', '#4ECDC4', '#A855F7', '#FF9500', '#00D4FF'];
const TILE_DARK   = ['#C94B4B', '#C9A800', '#2EA89E', '#7B2FBE', '#C97200', '#009AB8'];

// ══════════════════════════════════════════════════════════════════
//  BACKGROUND — bright daytime sky
// ══════════════════════════════════════════════════════════════════

function Sun() {
  const spin = useSharedValue(0);
  const pulse = useSharedValue(1);
  useEffect(() => {
    spin.value = withRepeat(withTiming(360, { duration: 18000, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1,    { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ), -1, true,
    );
  }, []);
  const rayStyle  = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const coreStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <View style={scene.sunWrap}>
      {/* Rotating rays */}
      <Animated.View style={[scene.rays, rayStyle]}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={[scene.ray, { transform: [{ rotate: `${i * 45}deg` }] }]} />
        ))}
      </Animated.View>
      {/* Sun core */}
      <Animated.View style={[scene.sunCore, coreStyle]} />
    </View>
  );
}

function Cloud({ top, startX, scale = 1, speed = 22000, opacity = 1 }) {
  const x = useSharedValue(startX);
  useEffect(() => {
    x.value = withRepeat(
      withSequence(
        withTiming(SW + 200, { duration: speed, easing: Easing.linear }),
        withTiming(-200,     { duration: 0 }),
      ), -1, false,
    );
  }, []);
  const s = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { scale }] }));
  return (
    <Animated.View style={[scene.cloudWrap, { top, opacity }, s]}>
      <View style={scene.cloudBase} />
      <View style={[scene.cloudPuff, { left: 10, top: -22, width: 50, height: 50 }]} />
      <View style={[scene.cloudPuff, { left: 42, top: -32, width: 62, height: 62 }]} />
      <View style={[scene.cloudPuff, { left: 88, top: -22, width: 50, height: 50 }]} />
    </Animated.View>
  );
}

function Rainbow() {
  const op = useSharedValue(0);
  useEffect(() => { op.value = withDelay(800, withTiming(0.55, { duration: 1200 })); }, []);
  const s = useAnimatedStyle(() => ({ opacity: op.value }));
  const arcs = [
    { color: '#FF0000', size: 210, thick: 12 },
    { color: '#FF7700', size: 190, thick: 12 },
    { color: '#FFD700', size: 170, thick: 12 },
    { color: '#00CC44', size: 150, thick: 12 },
    { color: '#1E90FF', size: 130, thick: 12 },
    { color: '#8B00FF', size: 110, thick: 12 },
  ];
  return (
    <Animated.View style={[scene.rainbowWrap, s]} pointerEvents="none">
      {arcs.map((a, i) => (
        <View key={i} style={{
          position: 'absolute',
          width: a.size, height: a.size / 2,
          borderTopLeftRadius: a.size / 2,
          borderTopRightRadius: a.size / 2,
          borderWidth: a.thick,
          borderColor: a.color,
          borderBottomWidth: 0,
          bottom: 0,
        }} />
      ))}
    </Animated.View>
  );
}

function Hills() {
  return (
    <View style={scene.hillsWrap} pointerEvents="none">
      <View style={[scene.hill, { left: -30,  width: 260, height: 130, backgroundColor: '#2ECC71' }]} />
      <View style={[scene.hill, { left: 150,  width: 220, height: 110, backgroundColor: '#27AE60' }]} />
      <View style={[scene.hill, { right: -30, width: 240, height: 120, backgroundColor: '#2ECC71' }]} />
      <View style={scene.ground} />
      {/* Flowers */}
      <Text style={[scene.flower, { bottom: 22, left: 40  }]}>🌸</Text>
      <Text style={[scene.flower, { bottom: 22, left: 120 }]}>🌼</Text>
      <Text style={[scene.flower, { bottom: 22, right: 40 }]}>🌺</Text>
      <Text style={[scene.flower, { bottom: 22, right: 110}]}>🌻</Text>
      <Text style={[scene.flower, { bottom: 22, left: 190 }]}>🌷</Text>
      {/* Trees */}
      <Text style={[scene.tree, { bottom: 36, left: 18  }]}>🌳</Text>
      <Text style={[scene.tree, { bottom: 36, right: 18 }]}>🌲</Text>
    </View>
  );
}

function SceneBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Bright sky gradient */}
      <LinearGradient
        colors={['#56CCF2', '#2F80ED', '#6DD5FA', '#FFFDE7']}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* Sun top-left */}
      <Sun />
      {/* Rainbow */}
      <Rainbow />
      {/* Drifting clouds */}
      <Cloud top={55}  startX={-100}      scale={1.0} speed={24000} opacity={0.95} />
      <Cloud top={110} startX={SW * 0.5}  scale={0.7} speed={32000} opacity={0.80} />
      <Cloud top={30}  startX={SW * 0.25} scale={0.55} speed={40000} opacity={0.65} />
      {/* Hills & ground */}
      <Hills />
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════
//  MASCOT — Lexie the Owl with animated game tutorial bubble
// ══════════════════════════════════════════════════════════════════

const STEPS = [
  { icon: '✏️', text: 'SPELL the word shown!' },
  { icon: '🔍', text: 'FIND matching letters!' },
  { icon: '🏗️', text: 'BUILD new words!' },
];

function SpeechBubble({ step, bubbleOp }) {
  const s = useAnimatedStyle(() => ({ opacity: bubbleOp.value }));
  return (
    <Animated.View style={[mascot.bubble, s]}>
      <Text style={mascot.bubbleHi}>Hi! I'm Lexie! 👋</Text>
      <View style={mascot.divider} />
      {STEPS.map((st, i) => (
        <View key={i} style={[mascot.step, step === i && mascot.stepActive]}>
          <Text style={mascot.stepIcon}>{st.icon}</Text>
          <Text style={[mascot.stepText, step === i && mascot.stepTextActive]}>{st.text}</Text>
        </View>
      ))}
      {/* tail */}
      <View style={mascot.tail} />
    </Animated.View>
  );
}

function Mascot() {
  const [step, setStep] = useState(0);

  const bounceY  = useSharedValue(0);
  const waveR    = useSharedValue(0);
  const bodyS    = useSharedValue(0);
  const bubbleOp = useSharedValue(0);

  useEffect(() => {
    // Entrance
    bodyS.value  = withDelay(200, withSpring(1, { damping: 6, stiffness: 80 }));
    bubbleOp.value = withDelay(700, withTiming(1, { duration: 500 }));

    // Continuous bounce
    bounceY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0,   { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ), -1, true,
    );

    // Wave hand
    waveR.value = withRepeat(
      withSequence(
        withTiming( 25, { duration: 350 }),
        withTiming(-10, { duration: 350 }),
        withTiming(  0, { duration: 200 }),
        withTiming(0,   { duration: 800 }), // pause
      ), -1, false,
    );

    // Cycle through steps
    const iv = setInterval(() => setStep(s => (s + 1) % STEPS.length), 2200);
    return () => clearInterval(iv);
  }, []);

  const charStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bodyS.value }, { translateY: bounceY.value }],
  }));
  const waveStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${waveR.value}deg` }],
  }));

  return (
    <View style={mascot.wrap}>
      <SpeechBubble step={step} bubbleOp={bubbleOp} />
      <Animated.View style={[mascot.charWrap, charStyle]}>
        {/* Body circle */}
        <LinearGradient colors={['#FF9A3C', '#FF6B35']} style={mascot.body}>
          {/* Eyes */}
          <View style={mascot.eyes}>
            <View style={mascot.eye}><View style={mascot.pupil} /></View>
            <View style={mascot.eye}><View style={mascot.pupil} /></View>
          </View>
          {/* Beak */}
          <View style={mascot.beak} />
          {/* Cheeks */}
          <View style={mascot.cheekL} />
          <View style={mascot.cheekR} />
        </LinearGradient>
        {/* Grad cap */}
        <Text style={mascot.hat}>🎓</Text>
        {/* Waving hand */}
        <Animated.Text style={[mascot.wave, waveStyle]}>👋</Animated.Text>
        {/* Stars around */}
        <Text style={[mascot.orb, { top: -8, right: 0  }]}>⭐</Text>
        <Text style={[mascot.orb, { top: 10, left: -14 }]}>✨</Text>
      </Animated.View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════
//  LOGO
// ══════════════════════════════════════════════════════════════════

function CartoonTile({ letter, colorIdx, delay, isMatch, wobble = false }) {
  const tileBg   = TILE_COLORS[colorIdx % TILE_COLORS.length];
  const tileDark = TILE_DARK[colorIdx % TILE_DARK.length];
  const sc  = useSharedValue(0);
  const rot = useSharedValue(-25);
  const wob = useSharedValue(0);

  useEffect(() => {
    sc.value  = withDelay(delay, withSpring(1, { damping: 6, stiffness: 90 }));
    rot.value = withDelay(delay, withSpring(0, { damping: 7 }));
    if (wobble) {
      wob.value = withDelay(delay + 500, withRepeat(
        withSequence(
          withTiming(-8, { duration: 320, easing: Easing.inOut(Easing.ease) }),
          withTiming( 8, { duration: 320, easing: Easing.inOut(Easing.ease) }),
          withTiming( 0, { duration: 160 }),
        ), -1, false,
      ));
    }
  }, []);

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: sc.value }, { rotate: `${rot.value + wob.value}deg` }],
  }));

  return (
    <Animated.View style={anim}>
      <View style={[lg.tileShadow, { backgroundColor: tileDark }]} />
      <View style={[lg.tileFace, { backgroundColor: tileBg }]}>
        <View style={lg.tileShine} />
        <Text style={lg.tileLetter}>{letter}</Text>
        {isMatch && <Text style={lg.sparkle}>✦</Text>}
      </View>
    </Animated.View>
  );
}

function Connector({ delay }) {
  const op = useSharedValue(0);
  const sc = useSharedValue(0);
  useEffect(() => {
    op.value = withDelay(delay, withTiming(1, { duration: 400 }));
    sc.value = withDelay(delay, withSpring(1, { damping: 8 }));
  }, []);
  const s = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ scale: sc.value }] }));
  return (
    <Animated.View style={[lg.connector, s]}>
      <Text style={lg.connectorEmoji}>⚡</Text>
    </Animated.View>
  );
}

function WordMatchLogo() {
  const w1 = [{ l: 'C', ci: 0 }, { l: 'A', ci: 1, match: true }, { l: 'T', ci: 2 }];
  const w2 = [{ l: 'H', ci: 3 }, { l: 'A', ci: 1, match: true }, { l: 'T', ci: 4 }];
  const base = 110;
  return (
    <View style={lg.wrap}>
      <Text style={lg.crown}>👑</Text>
      <View style={lg.row}>
        {w1.map((t, i) => <CartoonTile key={`w1${i}`} letter={t.l} colorIdx={t.ci} delay={base * (i + 1)} isMatch={!!t.match} wobble={!!t.match} />)}
      </View>
      <Connector delay={base * 5} />
      <View style={lg.row}>
        {w2.map((t, i) => <CartoonTile key={`w2${i}`} letter={t.l} colorIdx={t.ci} delay={base * (i + 6)} isMatch={!!t.match} wobble={!!t.match} />)}
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ══════════════════════════════════════════════════════════════════

export default function HomeScreen({ navigation }) {
  const { state: progress, dispatch } = useProgress();

  const logoScale  = useSharedValue(0);
  const titleSlide = useSharedValue(-30);
  const titleOp    = useSharedValue(0);
  const statsSlide = useSharedValue(60);
  const playPulse  = useSharedValue(1);

  useEffect(() => {
    logoScale.value  = withDelay(80,  withSpring(1, { damping: 7, stiffness: 90 }));
    titleSlide.value = withDelay(350, withSpring(0, { damping: 10 }));
    titleOp.value    = withDelay(350, withTiming(1, { duration: 500 }));
    statsSlide.value = withDelay(550, withSpring(0, { damping: 10, stiffness: 80 }));
    playPulse.value  = withDelay(900, withRepeat(
      withSequence(
        withSpring(1.06, { damping: 5, stiffness: 120 }),
        withSpring(1,    { damping: 5 }),
      ), -1, true,
    ));
    const today = new Date().toISOString().split('T')[0];
    dispatch({ type: PROGRESS_ACTIONS.UPDATE_STREAK, payload: { date: today } });
  }, []);

  const logoStyle  = useAnimatedStyle(() => ({ transform: [{ scale: logoScale.value }] }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOp.value, transform: [{ translateY: titleSlide.value }] }));
  const statsStyle = useAnimatedStyle(() => ({ transform: [{ translateY: statsSlide.value }], opacity: Math.max(0, 1 - statsSlide.value / 60) }));
  const playStyle  = useAnimatedStyle(() => ({ transform: [{ scale: playPulse.value }] }));

  const completedLevels = Object.values(progress.levels).filter(l => l.bestStars > 0).length;
  const totalStars      = Object.values(progress.levels).reduce((sum, l) => sum + l.bestStars, 0);

  return (
    <View style={ui.root}>
      <SceneBackground />
      <SafeAreaView style={ui.safe}>
        <ScrollView contentContainerStyle={ui.scroll} showsVerticalScrollIndicator={false}>

          {/* Logo */}
          <Animated.View style={[ui.heroArea, logoStyle]}>
            <WordMatchLogo />
          </Animated.View>

          {/* Title */}
          <Animated.View style={[ui.titleArea, titleStyle]}>
            <Text style={ui.title}>LEXIE'S</Text>
            <View style={ui.kidsBadge}>
              <Text style={ui.kidsText}>WORD LAB</Text>
            </View>
          </Animated.View>

          {/* Mascot with speech bubble */}
          <Mascot />

          {/* Streak */}
          {progress.dailyStreak > 1 && (
            <View style={ui.streakBanner}>
              <Text style={ui.streakText}>🔥 {progress.dailyStreak} DAY STREAK!</Text>
            </View>
          )}

          {/* Stats */}
          <Animated.View style={[ui.statsRow, statsStyle]}>
            {[
              { emoji: '🏆', value: completedLevels,          label: 'LEVELS', border: '#2F80ED', bg: '#EBF4FF' },
              { emoji: '⭐', value: totalStars,               label: 'STARS',  border: '#F59E0B', bg: '#FFFBEB' },
              { emoji: '📝', value: progress.totalWordsFound, label: 'WORDS',  border: '#10B981', bg: '#ECFDF5' },
            ].map(({ emoji, value, label, border, bg }) => (
              <View key={label} style={[ui.statCard, { borderColor: border, backgroundColor: bg }]}>
                <Text style={ui.statEmoji}>{emoji}</Text>
                <Text style={[ui.statNum, { color: border }]}>{value}</Text>
                <Text style={[ui.statLabel, { color: border }]}>{label}</Text>
              </View>
            ))}
          </Animated.View>

          {/* PLAY */}
          <Animated.View style={[ui.playWrapper, playStyle]}>
            <View style={ui.playBtnShadow} />
            <Pressable onPress={() => navigation.navigate('LevelSelect')} style={ui.playBtn}>
              <Text style={ui.playBtnText}>▶  PLAY!</Text>
            </Pressable>
          </Animated.View>

          {/* Progress */}
          <View style={ui.progressCard}>
            <LinearGradient colors={['#2F80ED', '#56CCF2']} style={ui.progressHeader}>
              <Text style={ui.progressTitle}>⭐ YOUR PROGRESS ⭐</Text>
            </LinearGradient>
            <View style={ui.levelDots}>
              {Array.from({ length: TOTAL_LEVELS }, (_, i) => {
                const lvl      = i + 1;
                const lvlData  = progress.levels[lvl];
                const unlocked = lvlData?.unlocked;
                const stars    = lvlData?.bestStars || 0;
                const color    = unlocked ? getLevelColor(lvl) : '#CBD5E0';
                return (
                  <Pressable
                    key={lvl}
                    onPress={() => unlocked && navigation.navigate('Game', { level: lvl })}
                    style={[ui.levelDot, { borderColor: color, backgroundColor: color + '33' }]}
                  >
                    {unlocked
                      ? stars > 0
                        ? <Text style={ui.dotStars}>{'★'.repeat(stars)}</Text>
                        : <Text style={[ui.dotNum, { color }]}>{lvl}</Text>
                      : <Text style={ui.dotLock}>🔒</Text>
                    }
                  </Pressable>
                );
              })}
            </View>
            <Text style={ui.progressSummary}>★ {totalStars} / {TOTAL_LEVELS * 3} STARS</Text>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════
//  STYLES
// ══════════════════════════════════════════════════════════════════

const scene = StyleSheet.create({
  // Sun
  sunWrap: { position: 'absolute', top: 20, left: 20, width: 90, height: 90, alignItems: 'center', justifyContent: 'center' },
  rays:    { position: 'absolute', width: 90, height: 90, alignItems: 'center', justifyContent: 'center' },
  ray:     { position: 'absolute', width: 5, height: 44, borderRadius: 3, backgroundColor: '#FFD600', top: 0 },
  sunCore: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFD600', shadowColor: '#FFD600', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 16, elevation: 12 },

  // Rainbow
  rainbowWrap: { position: 'absolute', bottom: 110, right: -20, width: 220, height: 115, alignItems: 'flex-end', justifyContent: 'flex-end' },

  // Clouds
  cloudWrap: { position: 'absolute' },
  cloudBase: { width: 130, height: 46, backgroundColor: 'white', borderRadius: 23 },
  cloudPuff: { position: 'absolute', backgroundColor: 'white', borderRadius: 999 },

  // Hills
  hillsWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 150 },
  hill:      { position: 'absolute', bottom: 28, borderTopLeftRadius: 999, borderTopRightRadius: 999 },
  ground:    { position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, backgroundColor: '#27AE60' },
  flower:    { position: 'absolute', fontSize: 18 },
  tree:      { position: 'absolute', fontSize: 30 },
});

const mascot = StyleSheet.create({
  wrap:    { width: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 16, paddingHorizontal: 8 },

  // Speech bubble
  bubble:  {
    flex: 1, backgroundColor: 'white', borderRadius: 18,
    borderWidth: 2.5, borderColor: '#2F80ED',
    padding: 12, marginRight: 8, marginBottom: 10,
    shadowColor: '#2F80ED', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 6,
  },
  bubbleHi:  { fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: '#2F80ED', marginBottom: 6 },
  divider:   { height: 1.5, backgroundColor: '#E2E8F0', marginBottom: 6 },
  step:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 3, paddingHorizontal: 6, borderRadius: 8, marginBottom: 2 },
  stepActive:{ backgroundColor: '#EBF4FF' },
  stepIcon:  { fontSize: 16, marginRight: 6 },
  stepText:  { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: '#64748B' },
  stepTextActive: { color: '#2F80ED', fontFamily: 'Nunito_700Bold' },
  tail: {
    position: 'absolute', right: -11, bottom: 18,
    width: 0, height: 0,
    borderTopWidth: 10, borderTopColor: 'transparent',
    borderBottomWidth: 10, borderBottomColor: 'transparent',
    borderLeftWidth: 12, borderLeftColor: '#2F80ED',
  },

  // Character
  charWrap: { alignItems: 'center', width: 90 },
  body:     {
    width: 78, height: 78, borderRadius: 39,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#C05621',
    shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
    overflow: 'hidden',
  },
  eyes:   { flexDirection: 'row', gap: 10, marginBottom: 4 },
  eye:    { width: 20, height: 20, borderRadius: 10, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  pupil:  { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1A1A2E' },
  beak:   { width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#F59E0B' },
  cheekL: { position: 'absolute', bottom: 22, left: 10, width: 14, height: 10, borderRadius: 7, backgroundColor: 'rgba(255,150,80,0.5)' },
  cheekR: { position: 'absolute', bottom: 22, right: 10, width: 14, height: 10, borderRadius: 7, backgroundColor: 'rgba(255,150,80,0.5)' },
  hat:    { position: 'absolute', top: -20, fontSize: 22 },
  wave:   { position: 'absolute', right: -22, top: 20, fontSize: 22, transformOrigin: 'bottom left' },
  orb:    { position: 'absolute', fontSize: 13 },
});

const lg = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6, paddingVertical: 4 },
  row:  { flexDirection: 'row', gap: 10 },
  crown:{ fontSize: 36, marginBottom: 2 },

  tileShadow: { position: 'absolute', width: 58, height: 58, borderRadius: 14, top: 5, left: 4 },
  tileFace:   { width: 58, height: 58, borderRadius: 14, borderWidth: 3.5, borderColor: '#1A0A3A', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tileShine:  { position: 'absolute', top: 5, left: 5, width: 18, height: 10, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 6, transform: [{ rotate: '-20deg' }] },
  tileLetter: { fontFamily: 'Nunito_800ExtraBold', fontSize: 28, color: '#fff', textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 3 },
  sparkle:    { position: 'absolute', top: 2, right: 3, fontSize: 11, color: '#fff' },

  connector:      { paddingHorizontal: 8, paddingVertical: 2 },
  connectorEmoji: { fontSize: 28 },
});

const DOT = 44;

const ui = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 180, alignItems: 'center' },

  heroArea:  { marginBottom: 4, alignItems: 'center' },
  titleArea: { alignItems: 'center', marginBottom: 14 },

  title: {
    fontFamily: 'Nunito_800ExtraBold', fontSize: 34,
    color: '#1A237E', letterSpacing: 4,
    textShadowColor: 'rgba(255,255,255,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  kidsBadge: {
    backgroundColor: '#FF6B35', borderRadius: 20,
    paddingHorizontal: 28, paddingVertical: 4, marginTop: 3,
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 8,
  },
  kidsText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 28, color: '#fff', letterSpacing: 6 },

  streakBanner: {
    backgroundColor: '#FFF7ED', borderWidth: 2.5, borderColor: '#FB923C',
    borderRadius: 24, paddingHorizontal: 20, paddingVertical: 8, marginBottom: 10,
    shadowColor: '#FB923C', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  streakText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: '#EA580C', letterSpacing: 1 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18, marginTop: 4 },
  statCard: {
    alignItems: 'center', borderWidth: 2.5, borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 10, minWidth: 84, gap: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
  },
  statEmoji: { fontSize: 22 },
  statNum:   { fontFamily: 'Nunito_800ExtraBold', fontSize: 22 },
  statLabel: { fontFamily: 'Nunito_700Bold', fontSize: 10, letterSpacing: 1 },

  playWrapper:   { width: '100%', marginBottom: 20 },
  playBtnShadow: { position: 'absolute', bottom: -5, left: 5, right: -5, height: 54, borderRadius: 28, backgroundColor: '#15803D' },
  playBtn: {
    backgroundColor: '#22C55E', borderRadius: 28, paddingVertical: 16,
    alignItems: 'center', borderWidth: 3, borderColor: '#fff',
    shadowColor: '#22C55E', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 14, elevation: 14,
  },
  playBtnText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 26, color: '#fff', letterSpacing: 4, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },

  progressCard: {
    width: '100%', backgroundColor: 'white',
    borderWidth: 2.5, borderColor: '#BFDBFE', borderRadius: 22,
    paddingBottom: 16, alignItems: 'center', gap: 10, overflow: 'hidden',
    shadowColor: '#2F80ED', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 6,
  },
  progressHeader: { width: '100%', paddingVertical: 10, alignItems: 'center' },
  progressTitle:  { fontFamily: 'Nunito_700Bold', fontSize: 12, color: 'white', letterSpacing: 2 },
  levelDots:      { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingHorizontal: 12 },
  levelDot:       { width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  dotNum:         { fontFamily: 'Nunito_800ExtraBold', fontSize: 14 },
  dotStars:       { fontSize: 10, color: '#F59E0B' },
  dotLock:        { fontSize: 16, opacity: 0.4 },
  progressSummary:{ fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#F59E0B' },
});
