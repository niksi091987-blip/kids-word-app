import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withRepeat, withSequence,
  withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useProgress } from '../context/ProgressContext';
import { TOTAL_LEVELS } from '../constants/config';
import LexieBadge from '../components/LexieBadge';

const { width: SW } = Dimensions.get('window');

// 3-column grid — tile ~82px, same proportions as LexieBadge large tile
const TILE = 82;
const OFF  = Math.round(TILE * 0.09);   // shadow offset = 7px
const R    = Math.round(TILE * 0.24);   // border radius = 20px

// ── Color palette (same as HomeScreen) ───────────────────────────
const LEVEL_BG = [
  '#E85D04','#F77F00','#2D9CDB','#27AE60','#8B5CF6',
  '#E91E8C','#0077B6','#D62828','#6D4C41','#455A64',
];
const LEVEL_DK = [
  '#A83C00','#B85C00','#1A6FA1','#1A7A42','#5B28B0',
  '#A0105E','#005080','#9C1A1A','#4A3028','#2D3C45',
];

const LEVEL_NAMES = [
  'Tiny Tiles','Word Wiz','Letter Fun','Smart Speller','Word Builder',
  'Brain Blast','Letter Master','Word Champ','Super Speller','LEGEND!',
];

// ── Twinkling stars ───────────────────────────────────────────────
const STARS = Array.from({ length: 22 }, (_, i) => ({
  x: (i * 137.5) % 100, y: (i * 61.8) % 75,
  size: 2 + (i % 3) * 1.5, delay: (i * 320) % 2800, dur: 1200 + (i % 5) * 400,
}));
function Twinkle({ x, y, size, delay, dur }) {
  const op = useSharedValue(0.1);
  useEffect(() => {
    op.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.85, { duration: dur, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.1,  { duration: dur, easing: Easing.inOut(Easing.ease) }),
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

// ── Cloud ─────────────────────────────────────────────────────────
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

// ── Level tile — same visual language as W/L in LexieBadge ───────
function LevelCard({ level, levelData, isCurrent, onPress, animDelay }) {
  const isUnlocked = levelData?.unlocked;
  const stars      = levelData?.bestStars || 0;

  const bg   = isUnlocked ? LEVEL_BG[level - 1] : '#90A4AE';
  const dark = isUnlocked ? LEVEL_DK[level - 1] : '#607D8B';

  const sc  = useSharedValue(0);
  const rot = useSharedValue(-18);
  const wob = useSharedValue(0);

  useEffect(() => {
    sc.value  = withDelay(animDelay, withSpring(1, { damping: 6, stiffness: 100 }));
    rot.value = withDelay(animDelay, withSpring(0, { damping: 7 }));
    if (isUnlocked) {
      wob.value = withDelay(animDelay + 1200 + level * 180, withRepeat(
        withSequence(
          withTiming(-6, { duration: 320, easing: Easing.inOut(Easing.ease) }),
          withTiming( 6, { duration: 320, easing: Easing.inOut(Easing.ease) }),
          withTiming( 0, { duration: 160 }),
          withTiming( 0, { duration: 1200 }),
        ), -1, false,
      ));
    }
  }, []);

  const tileAnim = useAnimatedStyle(() => ({
    transform: [{ scale: sc.value }, { rotate: `${rot.value + wob.value}deg` }],
  }));

  function handlePress() {
    if (!isUnlocked) {
      sc.value = withSequence(
        withSpring(0.88, { damping: 4 }),
        withSpring(1,    { damping: 5 }),
      );
      return;
    }
    onPress(level);
  }

  return (
    <Pressable onPress={handlePress} style={styles.cardWrap}>
      <Animated.View style={[{ alignItems:'center' }, tileAnim]}>

        {/* Tile wrapper — sized to include shadow offset */}
        <View style={{ width: TILE + OFF, height: TILE + OFF }}>
          {/* Shadow block */}
          <View style={{
            position:'absolute', top:OFF, left:OFF,
            width:TILE, height:TILE, borderRadius:R,
            backgroundColor:dark,
          }} />
          {/* Main face — sits above shadow at 0,0 */}
          <View style={{
            position:'absolute', top:0, left:0,
            width:TILE, height:TILE, borderRadius:R,
            borderWidth:3, borderColor:'rgba(0,0,0,0.18)',
            backgroundColor:bg,
            alignItems:'center', justifyContent:'center',
            overflow:'hidden',
          }}>
            {/* Level number or lock */}
            {isUnlocked
              ? <Text style={{
                  fontFamily:'Nunito_800ExtraBold',
                  fontSize: level >= 10 ? Math.round(TILE*0.33) : Math.round(TILE*0.42),
                  color:'#fff',
                  textShadowColor:'rgba(0,0,0,0.40)',
                  textShadowOffset:{width:1,height:2},
                  textShadowRadius:3,
                  marginBottom: Math.round(TILE*0.10),
                }}>{level}</Text>
              : <Text style={{ fontSize:Math.round(TILE*0.30), marginBottom:Math.round(TILE*0.10) }}>🔒</Text>
            }

            {/* Stars — bottom strip, gold with shadow so always visible */}
            <View style={{ position:'absolute', bottom:Math.round(TILE*0.10), flexDirection:'row', gap:2 }}>
              {[0,1,2].map(i => (
                <Text key={i} style={{
                  fontSize: Math.round(TILE*0.17),
                  color: i < stars ? '#FFD700' : 'rgba(255,255,255,0.22)',
                  textShadowColor: i < stars ? 'rgba(0,0,0,0.50)' : 'transparent',
                  textShadowOffset: { width:0, height:1 },
                  textShadowRadius: 2,
                }}>★</Text>
              ))}
            </View>
          </View>

          {/* ▶ PLAY badge — top-right corner */}
          {isCurrent && isUnlocked && (
            <View style={{
              position:'absolute', top:-6, right:-6,
              backgroundColor:'#F97316', borderRadius:10,
              paddingHorizontal:5, paddingVertical:2,
              borderWidth:2, borderColor:'#fff',
              zIndex:10,
            }}>
              <Text style={{ fontFamily:'Nunito_800ExtraBold', fontSize:8, color:'#fff' }}>▶ PLAY</Text>
            </View>
          )}
        </View>

        {/* Name tag */}
        <View style={{
          marginTop:6,
          backgroundColor: isUnlocked ? bg : '#90A4AE',
          borderRadius:12, paddingHorizontal:10, paddingVertical:4,
          width: TILE + OFF + 16,
          alignItems:'center',
        }}>
          <Text style={{
            fontFamily:'Nunito_700Bold', fontSize:12,
            color:'#fff', letterSpacing:0.2,
          }} numberOfLines={1}>
            {LEVEL_NAMES[level - 1]}
          </Text>
        </View>

      </Animated.View>
    </Pressable>
  );
}

// ── Screen ────────────────────────────────────────────────────────
export default function LevelSelectScreen({ navigation }) {
  const { state: progress } = useProgress();
  const completedCount = Object.values(progress.levels).filter(l => l.bestStars > 0).length;
  const totalStars     = Object.values(progress.levels).reduce((sum, l) => sum + (l.bestStars || 0), 0);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#1565C0','#1E88E5','#42A5F5','#7EC8F0']} style={StyleSheet.absoluteFill} />
      {STARS.map((st, i) => <Twinkle key={i} {...st} />)}
      <Cloud top={40}  startX={SW * 0.5}  speed={22000} scale={1.0} />
      <Cloud top={110} startX={-150}      speed={30000} scale={0.65} />
      <Cloud top={200} startX={SW * 0.25} speed={38000} scale={0.50} />
      <Cloud top={320} startX={-80}       speed={26000} scale={0.80} />

      <SafeAreaView style={styles.safe}>
        <LexieBadge style={{ marginTop: 4, marginBottom: 6 }} />

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#1565C0" />
          </Pressable>
          <Text style={styles.headerTitle}>SELECT LEVEL</Text>
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>{completedCount}/{TOTAL_LEVELS} <Text style={{color:'#F59E0B'}}>★</Text></Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {Array.from({ length: TOTAL_LEVELS }, (_, i) => {
              const level     = i + 1;
              const levelData = progress.levels[level];
              const isCurrent = level === progress.currentLevel && levelData?.unlocked;
              return (
                <LevelCard
                  key={level}
                  level={level}
                  levelData={levelData}
                  isCurrent={isCurrent}
                  onPress={(lvl) => navigation.navigate('Game', { level: lvl })}
                  animDelay={i * 60}
                />
              );
            })}
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}><Text style={{color:'#F59E0B'}}>★ </Text>{totalStars} / {TOTAL_LEVELS * 3} STARS COLLECTED</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex:1 },
  safe: { flex:1 },

  header: {
    flexDirection:'row', alignItems:'center',
    paddingHorizontal:16, paddingVertical:10,
    borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.30)',
  },
  backBtn: {
    width:38, height:38, borderRadius:12,
    alignItems:'center', justifyContent:'center',
    backgroundColor:'rgba(255,255,255,0.92)',
    shadowColor:'#0D47A1', shadowOffset:{width:0,height:2}, shadowOpacity:0.15, shadowRadius:4, elevation:3,
  },
  headerTitle: {
    flex:1, textAlign:'center',
    fontFamily:'Nunito_800ExtraBold', fontSize:20,
    color:'#fff', letterSpacing:2,
    textShadowColor:'rgba(0,0,0,0.15)', textShadowOffset:{width:0,height:1}, textShadowRadius:3,
  },
  completedBadge: {
    backgroundColor:'rgba(255,255,255,0.92)', borderRadius:12,
    paddingHorizontal:10, paddingVertical:5,
  },
  completedText: { fontFamily:'Nunito_700Bold', fontSize:13, color:'#1565C0' },

  scroll: { paddingHorizontal:14, paddingTop:20, paddingBottom:36 },
  grid:   { flexDirection:'row', flexWrap:'wrap', gap:12, justifyContent:'center' },

  cardWrap: { alignItems:'center' },

  summaryCard: {
    marginTop:24, backgroundColor:'rgba(255,255,255,0.93)',
    borderRadius:18, paddingVertical:14, alignItems:'center',
    shadowColor:'#0D47A1', shadowOffset:{width:0,height:3}, shadowOpacity:0.15, shadowRadius:8, elevation:5,
  },
  summaryText: { fontFamily:'Nunito_800ExtraBold', fontSize:14, color:'#1565C0', letterSpacing:1.5 },
});
