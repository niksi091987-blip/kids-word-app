import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withRepeat, withSequence, withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { useProgress } from '../context/ProgressContext';
import { STICKERS } from '../data/stickerData';

const BG = ['#1565C0', '#1E88E5', '#42A5F5', '#7EC8F0'];
const { width: SW } = Dimensions.get('window');
const CELL_SIZE = (SW - 64) / 3;

const STAR_DATA = Array.from({ length: 18 }, (_, i) => ({
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

// ── Sticker cell ───────────────────────────────────────────────────────────────
function StickerCell({ sticker, unlocked, index }) {
  const sc     = useSharedValue(0);
  const bounce = useSharedValue(0);
  const shine  = useSharedValue(0);

  useEffect(() => {
    sc.value = withDelay(index * 70, withSpring(1, { damping: 7, stiffness: 120 }));
    if (unlocked) {
      bounce.value = withDelay(index * 70 + 500, withRepeat(
        withSequence(
          withTiming(-7, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(0,  { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ), -1, true,
      ));
      shine.value = withDelay(index * 70 + 300, withRepeat(
        withSequence(withTiming(1, { duration: 900 }), withTiming(0.2, { duration: 900 })),
        -1, true,
      ));
    }
  }, []);

  const scAnim     = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
  const bounceAnim = useAnimatedStyle(() => ({ transform: [{ translateY: bounce.value }] }));
  const shineAnim  = useAnimatedStyle(() => ({ opacity: shine.value }));

  if (unlocked) {
    return (
      <Animated.View style={scAnim}>
        <Animated.View style={bounceAnim}>
          <LinearGradient colors={sticker.bg} style={[s.cell, { width: CELL_SIZE, height: CELL_SIZE + 16 }]}>
            <Animated.Text style={[s.cellSpark, shineAnim]}>✨</Animated.Text>
            <Text style={s.cellEmoji}>{sticker.emoji}</Text>
            <Text style={s.cellName} numberOfLines={1}>{sticker.name}</Text>
            <View style={s.cellLvlTag}>
              <Text style={s.cellLvlTxt}>LVL {sticker.level}</Text>
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={scAnim}>
      <View style={[s.cell, s.cellLocked, { width: CELL_SIZE, height: CELL_SIZE + 16 }]}>
        <Text style={s.lockEmoji}>🔒</Text>
        <Text style={s.cellNameLocked}>???</Text>
        <View style={s.cellLvlTag}>
          <Text style={[s.cellLvlTxt, { color: '#94A3B8' }]}>LVL {sticker.level}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function StickerBookScreen({ navigation }) {
  const { state: progress } = useProgress();
  const unlocked = new Set(progress.unlockedStickers || []);
  const count = unlocked.size;

  const titleSc = useSharedValue(0);
  useEffect(() => {
    titleSc.value = withSpring(1, { damping: 8, stiffness: 100 });
  }, []);
  const titleAnim = useAnimatedStyle(() => ({ transform: [{ scale: titleSc.value }] }));

  return (
    <View style={s.root}>
      <LinearGradient colors={BG} style={StyleSheet.absoluteFill} />
      {STAR_DATA.map((st, i) => <Twinkle key={i} {...st} />)}

      <SafeAreaView style={s.safe}>

        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={10}>
            <Ionicons name="arrow-back" size={22} color="#1565C0" />
          </Pressable>
          <Animated.View style={[s.titleWrap, titleAnim]}>
            <Text style={s.title}>My Sticker Book</Text>
            <Text style={s.subtitle}>
              {count === 0
                ? 'Get 3 stars to unlock stickers!'
                : `${count} / ${STICKERS.length} collected ⭐`}
            </Text>
          </Animated.View>
        </View>

        {/* Progress bar */}
        <View style={s.barTrack}>
          <View style={[s.barFill, { width: `${(count / STICKERS.length) * 100}%` }]} />
        </View>

        {/* Grid */}
        <ScrollView
          contentContainerStyle={s.grid}
          showsVerticalScrollIndicator={false}
        >
          {STICKERS.map((sticker, i) => (
            <StickerCell
              key={sticker.level}
              sticker={sticker}
              unlocked={unlocked.has(sticker.level)}
              index={i}
            />
          ))}
        </ScrollView>

        {/* Bottom hint */}
        <View style={s.hintRow}>
          <Text style={s.hintText}>
            🏆 Earn 3 stars on each level to unlock all stickers!
          </Text>
        </View>

      </SafeAreaView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0D47A1', shadowOffset: { width:0, height:2 }, shadowOpacity:0.15, shadowRadius:4, elevation:3,
  },
  titleWrap: { flex: 1 },
  title: {
    fontFamily: 'Nunito_800ExtraBold', fontSize: 22, color: '#fff',
    textShadowColor:'rgba(0,0,0,0.25)', textShadowOffset:{width:0,height:1}, textShadowRadius:4,
  },
  subtitle: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: 'rgba(255,255,255,0.80)', marginTop: 1 },

  barTrack: {
    marginHorizontal: 16, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: 16, overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4, backgroundColor: '#FFD700' },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, gap: 12,
    justifyContent: 'flex-start',
    paddingBottom: 16,
  },

  cell: {
    borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 10, paddingHorizontal: 6,
    shadowColor: '#000', shadowOffset: { width:0, height:4 }, shadowOpacity:0.25, shadowRadius:8, elevation:6,
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.40)',
    overflow: 'visible',
  },
  cellLocked: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.20)',
    shadowOpacity: 0.10,
  },
  cellSpark: { position:'absolute', top:-8, right:-4, fontSize:14 },
  cellEmoji: { fontSize: 36 },
  cellName: {
    fontFamily: 'Nunito_800ExtraBold', fontSize: 10, color: '#fff', letterSpacing: 0.3,
    textShadowColor:'rgba(0,0,0,0.3)', textShadowOffset:{width:0,height:1}, textShadowRadius:2,
  },
  cellNameLocked: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: 'rgba(255,255,255,0.40)' },
  lockEmoji: { fontSize: 28, opacity: 0.5 },
  cellLvlTag: {
    backgroundColor: 'rgba(0,0,0,0.20)', borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  cellLvlTxt: { fontFamily: 'Nunito_700Bold', fontSize: 10, color: 'rgba(255,255,255,0.85)' },

  hintRow: {
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.20)',
    marginHorizontal: 16, borderRadius: 16, marginBottom: 12,
  },
  hintText: {
    fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center',
  },
});
