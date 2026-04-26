import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withRepeat, withSequence,
  withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProgress, PROGRESS_ACTIONS } from '../context/ProgressContext';
import { useUser } from '../context/UserContext';
import { getLevelColor } from '../constants/colors';
import { TOTAL_LEVELS, GUEST_LEVEL_LIMIT, DIFFICULTY_KEY } from '../constants/config';
import LexieBadge from '../components/LexieBadge';
import GuestGateModal from '../components/GuestGateModal';
import PlayerAvatar from '../components/PlayerAvatar';

const { width: SW } = Dimensions.get('window');

// ══════════════════════════════════════════════════════════════════
//  BACKGROUND ELEMENTS — match intro screen aesthetic
// ══════════════════════════════════════════════════════════════════

const STARS = Array.from({ length: 22 }, (_, i) => ({
  x: (i * 137.5) % 100,
  y: (i * 61.8)  % 75,
  size: 2 + (i % 3) * 1.5,
  delay: (i * 320) % 2800,
  dur: 1200 + (i % 5) * 400,
}));

function Twinkle({ x, y, size, delay, dur }) {
  const op = useSharedValue(0.1);
  useEffect(() => {
    op.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.85, { duration: dur,  easing: Easing.inOut(Easing.ease) }),
        withTiming(0.1,  { duration: dur,  easing: Easing.inOut(Easing.ease) }),
      ), -1, false,
    ));
  }, []);
  const anim = useAnimatedStyle(() => ({ opacity: op.value }));
  return (
    <Animated.View style={[{
      position:'absolute', left:`${x}%`, top:`${y}%`,
      width:size, height:size, borderRadius:size/2,
      backgroundColor:'rgba(255,255,255,0.95)',
    }, anim]} />
  );
}

function Cloud({ top, startX, speed, scale = 1 }) {
  const x = useSharedValue(startX);
  useEffect(() => {
    x.value = withRepeat(
      withSequence(
        withTiming(SW + 200, { duration: speed, easing: Easing.linear }),
        withTiming(-200, { duration: 0 }),
      ), -1, false,
    );
  }, []);
  const s = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const w = 120 * scale, h = 44 * scale;
  return (
    <Animated.View style={[{ position:'absolute', top }, s]}>
      <View style={{ width:w, height:h, backgroundColor:'rgba(255,255,255,0.75)', borderRadius:h/2 }} />
      <View style={{ position:'absolute', left:w*0.06, top:-h*0.45, width:h*1.1, height:h*1.1, backgroundColor:'rgba(255,255,255,0.75)', borderRadius:999 }} />
      <View style={{ position:'absolute', left:w*0.35, top:-h*0.75, width:h*1.5, height:h*1.5, backgroundColor:'rgba(255,255,255,0.75)', borderRadius:999 }} />
      <View style={{ position:'absolute', left:w*0.65, top:-h*0.45, width:h*1.1, height:h*1.1, backgroundColor:'rgba(255,255,255,0.75)', borderRadius:999 }} />
    </Animated.View>
  );
}

// ══════════════════════════════════════════════════════════════════
//  LEXIE OWL — simple bouncing hero (no speech bubble)
// ══════════════════════════════════════════════════════════════════

function LexieOwl() {
  const bodyS  = useSharedValue(0);
  const bounceY = useSharedValue(0);
  const waveR   = useSharedValue(0);

  useEffect(() => {
    bodyS.value  = withDelay(300, withSpring(1, { damping: 6, stiffness: 80 }));
    bounceY.value = withDelay(600, withRepeat(
      withSequence(
        withTiming(-12, { duration: 750, easing: Easing.inOut(Easing.ease) }),
        withTiming(0,   { duration: 750, easing: Easing.inOut(Easing.ease) }),
      ), -1, true,
    ));
    waveR.value = withDelay(800, withRepeat(
      withSequence(
        withTiming(28,  { duration: 340 }),
        withTiming(-10, { duration: 300 }),
        withTiming(0,   { duration: 200 }),
        withTiming(0,   { duration: 1000 }),
      ), -1, false,
    ));
  }, []);

  const bodyAnim = useAnimatedStyle(() => ({
    transform: [{ scale: bodyS.value }, { translateY: bounceY.value }],
  }));
  const waveAnim = useAnimatedStyle(() => ({
    transform: [{ rotate: `${waveR.value}deg` }],
  }));

  return (
    <Animated.View style={[owl.wrap, bodyAnim]}>
      <LinearGradient colors={['#FF9A3C', '#FF6B35']} style={owl.body}>
        <View style={owl.eyes}>
          <View style={owl.eye}><View style={owl.pupil} /><View style={owl.shine} /></View>
          <View style={owl.eye}><View style={owl.pupil} /><View style={owl.shine} /></View>
        </View>
        <View style={owl.beak} />
        <View style={[owl.cheek, { left: 12, bottom: 26 }]} />
        <View style={[owl.cheek, { right: 12, bottom: 26 }]} />
        <View style={owl.belly} />
      </LinearGradient>
      <Text style={owl.hat}>🎓</Text>
      <Animated.Text style={[owl.wave, waveAnim]}>👋</Animated.Text>
      <Text style={[owl.star, { top: -6, right: 4 }]}>⭐</Text>
      <Text style={[owl.star, { top: 14, left: -10 }]}>✨</Text>
    </Animated.View>
  );
}

// Warm, readable palette for light sky-blue background
const HOME_LEVEL_COLORS = [
  '#E85D04', // 1  — deep orange
  '#F77F00', // 2  — amber orange
  '#2D9CDB', // 3  — sky blue
  '#27AE60', // 4  — emerald green
  '#8B5CF6', // 5  — violet
  '#E91E8C', // 6  — pink
  '#0077B6', // 7  — ocean blue
  '#D62828', // 8  — crimson
  '#6D4C41', // 9  — warm brown
  '#455A64', // 10 — slate
];

// ══════════════════════════════════════════════════════════════════
//  LEVEL CELL — animated grid tile
// ══════════════════════════════════════════════════════════════════
function LevelCell({ lvl, lvlData, delay, onPress, guestLocked = false }) {
  const unlocked = lvlData?.unlocked;
  const stars    = lvlData?.bestStars || 0;
  const done     = unlocked && stars > 0;

  // Guest-locked levels get a distinct teal/Google-hinted color
  const color = guestLocked ? '#4285F4' : unlocked ? HOME_LEVEL_COLORS[lvl - 1] : '#94A3B8';
  const tappable = unlocked || guestLocked; // guest-locked levels ARE tappable (to open gate)

  const sc = useSharedValue(0);
  const pressS = useSharedValue(1);
  useEffect(() => {
    sc.value = withDelay(delay, withSpring(1, { damping: 8, stiffness: 140 }));
  }, []);
  const cellAnim  = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
  const pressAnim = useAnimatedStyle(() => ({ transform: [{ scale: pressS.value }] }));

  return (
    <Pressable
      onPress={() => tappable && onPress(lvl)}
      onPressIn={() => { if (tappable) pressS.value = withSpring(0.90); }}
      onPressOut={() => { pressS.value = withSpring(1); }}
    >
      <Animated.View style={cellAnim}>
        <Animated.View style={[pressAnim, {
          width: 58, height: 68, borderRadius: 16, borderWidth: 2.5,
          alignItems: 'center', justifyContent: 'center', gap: 3,
          borderColor: color,
          backgroundColor: done ? color : (unlocked || guestLocked) ? '#fff' : '#F1F5F9',
          shadowColor: tappable ? color : '#000',
          shadowOffset: { width: 0, height: done ? 4 : 2 },
          shadowOpacity: done ? 0.45 : tappable ? 0.20 : 0.10,
          shadowRadius: done ? 8 : 4,
          elevation: done ? 6 : tappable ? 3 : 2,
        }]}>
          {guestLocked
            ? <>
                <Text style={{ fontSize: 16 }}>G</Text>
                <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 11, color: '#4285F4' }}>{lvl}</Text>
              </>
            : unlocked
            ? <>
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 22, color: done ? '#fff' : color, lineHeight: 26 }}>{lvl}</Text>
                <Text style={{ fontSize: 10, color: done ? 'rgba(255,255,255,0.90)' : '#CBD5E1', lineHeight: 12 }}>
                  {'★'.repeat(stars)}{'☆'.repeat(3 - stars)}
                </Text>
              </>
            : <>
                <Text style={{ fontSize: 18, opacity: 0.5 }}>🔒</Text>
                <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 11, color: '#94A3B8' }}>{lvl}</Text>
              </>
          }
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

// ══════════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ══════════════════════════════════════════════════════════════════

export default function HomeScreen({ navigation }) {
  const { state: progress, dispatch } = useProgress();
  const { state: user, logout } = useUser();

  const [gateVisible,  setGateVisible]  = useState(false);
  const [gateLevel,    setGateLevel]    = useState(null);
  const [difficulty,   setDifficulty]   = useState('normal');

  const isGuest = user.type === 'guest';

  useEffect(() => {
    AsyncStorage.getItem(DIFFICULTY_KEY).then(v => { if (v) setDifficulty(v); }).catch(() => {});
  }, []);

  const handleDifficulty = (d) => {
    setDifficulty(d);
    AsyncStorage.setItem(DIFFICULTY_KEY, d).catch(() => {});
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Log out?\nYour progress is saved in the cloud.')) logout();
    } else {
      Alert.alert('Log out?', 'Your progress is saved in the cloud.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log out', style: 'destructive', onPress: () => logout() },
      ]);
    }
  };

  // Navigate to Welcome once logout clears user.type to null
  useEffect(() => {
    if (user.loaded && user.type === null) {
      navigation.replace('Welcome');
    }
  }, [user.loaded, user.type]);

  const heroScale  = useSharedValue(0);
  const statsSlide = useSharedValue(60);
  const playPulse  = useSharedValue(1);

  useEffect(() => {
    heroScale.value  = withDelay(80,  withSpring(1, { damping: 7, stiffness: 90 }));
    statsSlide.value = withDelay(500, withSpring(0, { damping: 10, stiffness: 80 }));
    playPulse.value  = withDelay(900, withRepeat(
      withSequence(
        withSpring(1.06, { damping: 5, stiffness: 120 }),
        withSpring(1,    { damping: 5 }),
      ), -1, true,
    ));
    const today = new Date().toISOString().split('T')[0];
    dispatch({ type: PROGRESS_ACTIONS.UPDATE_STREAK, payload: { date: today } });
  }, []);

  const heroStyle  = useAnimatedStyle(() => ({ transform: [{ scale: heroScale.value }] }));
  const statsStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: statsSlide.value }],
    opacity: Math.max(0, 1 - statsSlide.value / 60),
  }));
  const playStyle  = useAnimatedStyle(() => ({ transform: [{ scale: playPulse.value }] }));

  const completedLevels = Object.values(progress.levels).filter(l => l.bestStars > 0).length;
  const totalStars      = Object.values(progress.levels).reduce((sum, l) => sum + l.bestStars, 0);

  return (
    <View style={ui.root}>
      {/* ── Intro-style background ── */}
      <LinearGradient
        colors={['#1565C0', '#1E88E5', '#42A5F5', '#7EC8F0']}
        style={StyleSheet.absoluteFill}
      />

      {/* Twinkling stars */}
      {STARS.map((st, i) => <Twinkle key={i} {...st} />)}

      {/* Drifting clouds */}
      <Cloud top={35}  startX={SW * 0.5}   speed={22000} scale={1.0} />
      <Cloud top={95}  startX={-150}        speed={30000} scale={0.65} />
      <Cloud top={175} startX={SW * 0.22}   speed={36000} scale={0.50} />
      <Cloud top={270} startX={-80}         speed={25000} scale={0.80} />
      <Cloud top={360} startX={SW * 0.68}   speed={40000} scale={0.45} />

      <SafeAreaView style={ui.safe}>
        <ScrollView contentContainerStyle={ui.scroll} showsVerticalScrollIndicator={false}>

          {/* Hero — badge + tappable player avatar */}
          <Animated.View style={[ui.heroArea, heroStyle]}>
            <LexieBadge large />
            {/* Tap avatar to open avatar configurator */}
            <Pressable onPress={() => navigation.navigate('Avatar')} accessibilityLabel="Change your avatar">
              <PlayerAvatar variant="card" />
            </Pressable>
          </Animated.View>

          {/* Streak */}
          {progress.dailyStreak > 1 && (
            <View style={ui.streakBanner}>
              <Text style={ui.streakText}>🔥 {progress.dailyStreak} DAY STREAK!</Text>
            </View>
          )}

          {/* Stats */}
          <Animated.View style={[ui.statsRow, statsStyle]}>
            {[
              { emoji:'🏆', value:completedLevels,          label:'LEVELS', border:'#1565C0', bg:'rgba(255,255,255,0.93)' },
              { emoji:'⭐', value:totalStars,               label:'STARS',  border:'#D97706', bg:'rgba(255,255,255,0.93)'  },
              { emoji:'📝', value:progress.totalWordsFound, label:'WORDS',  border:'#059669', bg:'rgba(255,255,255,0.93)'  },
            ].map(({ emoji, value, label, border, bg }) => (
              <View key={label} style={[ui.statCard, { borderColor: border, backgroundColor: bg }]}>
                <Text style={ui.statEmoji}>{emoji}</Text>
                <Text style={[ui.statNum, { color: border }]}>{value}</Text>
                <Text style={[ui.statLabel, { color: border }]}>{label}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Sticker book shortcut */}
          <Pressable
            onPress={() => navigation.navigate('StickerBook')}
            style={ui.stickerRow}
          >
            <Text style={ui.stickerRowEmoji}>🎁</Text>
            <Text style={ui.stickerRowText}>My Sticker Book</Text>
            <Text style={ui.stickerRowArrow}>›</Text>
          </Pressable>

          {/* Difficulty selector */}
          <View style={ui.diffRow}>
            {[
              { key: 'easy',   emoji: '🟢', label: 'EASY'   },
              { key: 'normal', emoji: '🟡', label: 'NORMAL' },
              { key: 'hard',   emoji: '🔴', label: 'HARD'   },
            ].map(({ key, emoji, label }) => (
              <Pressable
                key={key}
                onPress={() => handleDifficulty(key)}
                style={[ui.diffBtn, difficulty === key && ui.diffBtnActive]}
              >
                <Text style={ui.diffEmoji}>{emoji}</Text>
                <Text style={[ui.diffLabel, difficulty === key && ui.diffLabelActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          {/* PLAY */}
          <Animated.View style={[ui.playWrapper, playStyle]}>
            <View style={ui.playBtnShadow} />
            <Pressable onPress={() => navigation.navigate('LevelSelect')} style={ui.playBtn}>
              <Text style={ui.playBtnText}>▶  PLAY!</Text>
            </Pressable>
          </Animated.View>

          {/* Progress */}
          <View style={ui.progressCard}>
            {/* Header */}
            <LinearGradient colors={['#1565C0', '#1E88E5']} style={ui.progressHeader}>
              <View style={ui.progressHeaderRow}>
                <Text style={ui.progressTitle}>YOUR PROGRESS</Text>
                <Text style={ui.progressHeaderSub}>{completedLevels}/{TOTAL_LEVELS} levels · {totalStars}⭐</Text>
              </View>
              {/* Bar inside header */}
              <View style={ui.barTrack}>
                <View style={[ui.barFill, { width: `${Math.max(4, (totalStars / (TOTAL_LEVELS * 3)) * 100)}%` }]} />
              </View>
            </LinearGradient>

            {/* Level grid — 5×2 animated */}
            <View style={ui.levelGrid}>
              {Array.from({ length: TOTAL_LEVELS }, (_, i) => {
                const lvl = i + 1;
                const guestLocked = isGuest && lvl > GUEST_LEVEL_LIMIT;
                return (
                  <LevelCell
                    key={i}
                    lvl={lvl}
                    lvlData={progress.levels[lvl]}
                    delay={i * 60}
                    guestLocked={guestLocked}
                    onPress={(l) => {
                      if (isGuest && l > GUEST_LEVEL_LIMIT) {
                        setGateLevel(l);
                        setGateVisible(true);
                      } else {
                        navigation.navigate('Game', { level: l });
                      }
                    }}
                  />
                );
              })}
            </View>

            {/* Guest badge / login prompt */}
            {isGuest ? (
              <Pressable
                onPress={() => navigation.navigate('Login')}
                style={ui.guestBadge}
              >
                <Text style={ui.guestBadgeText}>
                  🔐 Log in to save progress &amp; unlock all levels
                </Text>
              </Pressable>
            ) : (
              <View style={ui.accountRow}>
                <Text style={ui.accountName}>👤 {user.name}</Text>
                <Pressable onPress={handleLogout}>
                  <Text style={ui.logoutText}>Log out</Text>
                </Pressable>
              </View>
            )}
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* Guest gate modal */}
      <GuestGateModal
        visible={gateVisible}
        levels={progress.levels}
        onClose={() => setGateVisible(false)}
        onSignedIn={(action) => {
          setGateVisible(false);
          if (action === 'goToLogin') {
            navigation.navigate('Login');
          } else if (gateLevel) {
            navigation.navigate('Game', { level: gateLevel });
          }
        }}
      />
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════
//  STYLES
// ══════════════════════════════════════════════════════════════════

const owl = StyleSheet.create({
  wrap:   { alignItems:'center', marginTop:22, marginBottom:4 },
  body:   {
    width:100, height:100, borderRadius:50,
    alignItems:'center', justifyContent:'center',
    borderWidth:3, borderColor:'#C05621',
    shadowColor:'#FF6B35', shadowOffset:{width:0,height:6}, shadowOpacity:0.5, shadowRadius:12, elevation:10,
    overflow:'hidden',
  },
  eyes:   { flexDirection:'row', gap:12, marginBottom:5 },
  eye:    { width:24, height:24, borderRadius:12, backgroundColor:'white', alignItems:'center', justifyContent:'center' },
  pupil:  { width:12, height:12, borderRadius:6, backgroundColor:'#1A1A2E' },
  shine:  { position:'absolute', top:2, left:3, width:5, height:5, borderRadius:3, backgroundColor:'rgba(255,255,255,0.9)' },
  beak:   { width:0, height:0, borderLeftWidth:10, borderRightWidth:10, borderTopWidth:14, borderLeftColor:'transparent', borderRightColor:'transparent', borderTopColor:'#F59E0B' },
  cheek:  { position:'absolute', width:18, height:12, borderRadius:9, backgroundColor:'rgba(255,150,80,0.5)' },
  belly:  { position:'absolute', bottom:4, width:56, height:38, backgroundColor:'rgba(255,255,255,0.20)', borderTopLeftRadius:999, borderTopRightRadius:999 },
  hat:    { position:'absolute', top:-22, fontSize:26 },
  wave:   { position:'absolute', right:-26, top:24, fontSize:24 },
  star:   { position:'absolute', fontSize:14 },
});

const ui = StyleSheet.create({
  root:   { flex:1 },
  safe:   { flex:1 },
  scroll: { paddingHorizontal:20, paddingTop:10, paddingBottom:180, alignItems:'center' },

  heroArea: { alignItems:'center', marginBottom:8, width:'100%' },

  streakBanner: {
    backgroundColor:'rgba(255,255,255,0.93)', borderWidth:2, borderColor:'#FB923C',
    borderRadius:24, paddingHorizontal:20, paddingVertical:8, marginBottom:12,
    shadowColor:'#FB923C', shadowOffset:{width:0,height:3}, shadowOpacity:0.4, shadowRadius:8, elevation:5,
  },
  streakText: { fontFamily:'Nunito_800ExtraBold', fontSize:15, color:'#C2410C', letterSpacing:1 },

  statsRow: { flexDirection:'row', gap:10, marginBottom:18, marginTop:4 },
  statCard: {
    alignItems:'center', borderWidth:2, borderRadius:18,
    paddingHorizontal:14, paddingVertical:10, minWidth:84, gap:2,
    shadowColor:'#0D47A1', shadowOffset:{width:0,height:3}, shadowOpacity:0.18, shadowRadius:6, elevation:5,
  },
  statEmoji: { fontSize:22 },
  statNum:   { fontFamily:'Nunito_800ExtraBold', fontSize:22 },
  statLabel: { fontFamily:'Nunito_700Bold', fontSize:10, letterSpacing:1 },

  stickerRow: {
    flexDirection:'row', alignItems:'center', gap:10,
    backgroundColor:'rgba(255,255,255,0.18)', borderRadius:18,
    paddingHorizontal:18, paddingVertical:12, marginBottom:10,
    borderWidth:1.5, borderColor:'rgba(255,255,255,0.35)',
  },
  stickerRowEmoji: { fontSize:22 },
  stickerRowText: {
    flex:1, fontFamily:'Nunito_800ExtraBold', fontSize:15, color:'#fff',
    textShadowColor:'rgba(0,0,0,0.2)', textShadowOffset:{width:0,height:1}, textShadowRadius:2,
  },
  stickerRowArrow: { fontFamily:'Nunito_800ExtraBold', fontSize:20, color:'rgba(255,255,255,0.70)' },

  diffRow: {
    flexDirection:'row', gap:10, marginBottom:14, marginTop:2,
  },
  diffBtn: {
    flex:1, alignItems:'center', paddingVertical:10, borderRadius:18,
    backgroundColor:'rgba(255,255,255,0.70)', borderWidth:2, borderColor:'transparent',
  },
  diffBtnActive: {
    backgroundColor:'rgba(255,255,255,0.97)', borderColor:'#FFD700',
    shadowColor:'#FFD700', shadowOffset:{width:0,height:2}, shadowOpacity:0.5, shadowRadius:6, elevation:5,
  },
  diffEmoji: { fontSize:20 },
  diffLabel: { fontFamily:'Nunito_800ExtraBold', fontSize:11, color:'rgba(255,255,255,0.75)', letterSpacing:1, marginTop:2 },
  diffLabelActive: { color:'#1565C0' },

  playWrapper:   { width:'100%', marginBottom:20 },
  playBtnShadow: { position:'absolute', bottom:-5, left:5, right:-5, height:54, borderRadius:28, backgroundColor:'#C2410C' },
  playBtn: {
    backgroundColor:'#F97316', borderRadius:28, paddingVertical:16,
    alignItems:'center', borderWidth:3, borderColor:'rgba(255,255,255,0.95)',
    shadowColor:'#F97316', shadowOffset:{width:0,height:0}, shadowOpacity:0.8, shadowRadius:18, elevation:14,
  },
  playBtnText: { fontFamily:'Nunito_800ExtraBold', fontSize:26, color:'#fff', letterSpacing:4, textShadowColor:'rgba(0,0,0,0.25)', textShadowOffset:{width:0,height:1}, textShadowRadius:3 },

  progressCard: {
    width:'100%', backgroundColor:'#fff',
    borderRadius:22, overflow:'hidden',
    shadowColor:'#0D47A1', shadowOffset:{width:0,height:4}, shadowOpacity:0.18, shadowRadius:12, elevation:8,
  },
  progressHeader: {
    width:'100%', paddingHorizontal:16, paddingTop:12, paddingBottom:10, gap:8,
  },
  progressHeaderRow: {
    flexDirection:'row', alignItems:'center', justifyContent:'space-between',
  },
  progressTitle:    { fontFamily:'Nunito_800ExtraBold', fontSize:13, color:'#fff', letterSpacing:2 },
  progressHeaderSub:{ fontFamily:'Nunito_700Bold', fontSize:12, color:'rgba(255,255,255,0.80)' },
  barTrack: {
    width:'100%', height:8, borderRadius:4,
    backgroundColor:'rgba(255,255,255,0.25)', overflow:'hidden',
  },
  barFill: {
    height:'100%', borderRadius:4,
    backgroundColor:'#FFD700',
  },

  levelGrid: {
    flexDirection:'row', flexWrap:'wrap',
    justifyContent:'center', gap:10,
    paddingHorizontal:12, paddingBottom:8, paddingTop:8,
  },

  guestBadge: {
    marginHorizontal: 12, marginBottom: 14, marginTop: 4,
    backgroundColor: 'rgba(66,133,244,0.10)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(66,133,244,0.30)',
    paddingHorizontal: 14, paddingVertical: 9,
  },
  guestBadgeText: {
    fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: '#1565C0', textAlign: 'center',
  },
  accountRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 12, marginBottom: 14, marginTop: 4,
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(124,58,237,0.2)',
    paddingHorizontal: 14, paddingVertical: 9,
  },
  accountName: {
    fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: '#5b21b6',
  },
  logoutText: {
    fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: '#ef4444',
  },
});
