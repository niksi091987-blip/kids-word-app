import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, withDelay,
  withSequence, withRepeat, Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useProgress } from '../context/ProgressContext';
import { useSpeech } from '../hooks/useSpeech';
import { TOTAL_LEVELS } from '../constants/config';
import { getWordEmoji } from '../data/wordEmojis';
import LexieBadge from '../components/LexieBadge';
import PlayerAvatar from '../components/PlayerAvatar';

const { width: SW } = Dimensions.get('window');
const BG = ['#1565C0', '#1E88E5', '#42A5F5', '#7EC8F0'];

// ── Star rating messages ──────────────────────────────────────────
const MESSAGES = {
  3: ['🔥 INCREDIBLE!', '⚡ LEGENDARY!', '🌟 PERFECT!', '🏆 FLAWLESS!'],
  2: ['🎉 AWESOME!', '💪 GREAT JOB!', '⭐ WELL DONE!', '🎊 NICE WORK!'],
  1: ['🙌 NICE TRY!', '✨ KEEP GOING!', '🌈 GOOD EFFORT!', '💫 YOU GOT IT!'],
  0: ['🤗 TRY AGAIN!', '💪 YOU CAN DO IT!'],
};

// ── Level accent colors (same palette as LevelSelectScreen) ───────
const LEVEL_BG = [
  '#E85D04','#F77F00','#2D9CDB','#27AE60','#8B5CF6',
  '#E91E8C','#0077B6','#D62828','#6D4C41','#455A64',
];
const LEVEL_DK = [
  '#A83C00','#B85C00','#1A6FA1','#1A7A42','#5B28B0',
  '#A0105E','#005080','#9C1A1A','#4A3028','#2D3C45',
];

// ── Twinkling stars ───────────────────────────────────────────────
const STARS = Array.from({ length: 20 }, (_, i) => ({
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
      position: 'absolute', left: `${x}%`, top: `${y}%`,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: 'rgba(255,255,255,0.95)',
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
    <Animated.View style={[{ position: 'absolute', top }, s]}>
      <View style={{ width: w, height: h, backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: h / 2 }} />
      <View style={{ position: 'absolute', left: w * 0.06, top: -h * 0.45, width: h * 1.1, height: h * 1.1, backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 999 }} />
      <View style={{ position: 'absolute', left: w * 0.35, top: -h * 0.75, width: h * 1.5, height: h * 1.5, backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 999 }} />
      <View style={{ position: 'absolute', left: w * 0.65, top: -h * 0.45, width: h * 1.1, height: h * 1.1, backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 999 }} />
    </Animated.View>
  );
}

// ── Animated star ─────────────────────────────────────────────────
function StarBadge({ filled, delay }) {
  const sc = useSharedValue(0);
  useEffect(() => {
    if (filled) {
      sc.value = withDelay(delay, withSpring(1.2, { damping: 5, stiffness: 200 }, () => {
        sc.value = withSpring(1);
      }));
    } else {
      sc.value = withDelay(delay, withTiming(1, { duration: 200 }));
    }
  }, []);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
  return (
    <Animated.Text style={[styles.star, { opacity: filled ? 1 : 0.22 }, anim]}>⭐</Animated.Text>
  );
}

// ── Action button ─────────────────────────────────────────────────
function ActionBtn({ label, color, dark, onPress, large, icon }) {
  const sc = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { sc.value = withSpring(0.94, { damping: 8 }); }}
      onPressOut={() => { sc.value = withSpring(1, { damping: 6 }); }}
      style={{ flex: large ? undefined : 1 }}
    >
      <Animated.View style={[
        styles.actionBtn,
        large && styles.actionBtnLarge,
        {
          backgroundColor: color,
          borderBottomColor: dark,
          shadowColor: dark,
        },
        anim,
      ]}>
        {icon && <Ionicons name={icon} size={large ? 20 : 16} color="#fff" style={{ marginRight: 6 }} />}
        <Text style={[styles.actionBtnText, { fontSize: large ? 17 : 14 }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

// ── Screen ────────────────────────────────────────────────────────
export default function ResultScreen({ route, navigation }) {
  const {
    level = 1,
    stars = 0,
    score = 0,
    wordsFound = [],
    timeTaken = 0,
    possibleWords = [],
    puzzle = null,
    timerRanOut = false,
    allFound = false,
  } = route.params ?? {};

  const { state: progress } = useProgress();
  const { speakWord } = useSpeech();

  // Card entrance
  const cardY   = useSharedValue(40);
  const cardOp  = useSharedValue(0);
  const scoreY  = useSharedValue(20);
  const scoreOp = useSharedValue(0);
  const btnsOp  = useSharedValue(0);

  useEffect(() => {
    cardY.value  = withSpring(0, { damping: 12, stiffness: 100 });
    cardOp.value = withTiming(1, { duration: 350 });
    scoreY.value  = withDelay(250, withSpring(0, { damping: 10 }));
    scoreOp.value = withDelay(250, withTiming(1, { duration: 300 }));
    btnsOp.value  = withDelay(stars > 0 ? 1600 : 900, withTiming(1, { duration: 400 }));
  }, []);

  const cardStyle  = useAnimatedStyle(() => ({ opacity: cardOp.value, transform: [{ translateY: cardY.value }] }));
  const scoreStyle = useAnimatedStyle(() => ({ opacity: scoreOp.value, transform: [{ translateY: scoreY.value }] }));
  const btnsStyle  = useAnimatedStyle(() => ({ opacity: btnsOp.value }));

  const messageList = MESSAGES[stars] || MESSAGES[0];
  const message = useRef(messageList[Math.floor(Math.random() * messageList.length)]).current;

  const lvlIdx    = Math.min(level - 1, LEVEL_BG.length - 1);
  const accentBg  = LEVEL_BG[lvlIdx];
  const accentDk  = LEVEL_DK[lvlIdx];
  const isLastLevel  = level >= TOTAL_LEVELS;
  const nextUnlocked = !isLastLevel && progress.levels[level + 1]?.unlocked === true;
  const allFoundLocal = wordsFound.length >= possibleWords.length && possibleWords.length > 0;
  const isAllFound = allFound || allFoundLocal;

  // Speak result message on mount
  useEffect(() => {
    if (timerRanOut) {
      speakWord("Time's up! Wow, look how many words you found. That was really good!");
    } else if (isAllFound) {
      speakWord("Whoo hoo! You found every single word! That is absolutely amazing!");
    }
  }, []);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={BG} style={StyleSheet.absoluteFill} />
      {STARS.map((st, i) => <Twinkle key={i} {...st} />)}
      <Cloud top={30}  startX={SW * 0.4}  speed={24000} scale={1.0} />
      <Cloud top={100} startX={-120}      speed={32000} scale={0.6} />
      <Cloud top={220} startX={SW * 0.2}  speed={40000} scale={0.5} />

      <SafeAreaView style={styles.safe}>
        <LexieBadge style={{ marginTop: 4, marginBottom: 8 }} />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Player avatar celebrating ── */}
          <PlayerAvatar variant="result" stars={stars} />

          {/* ── Result card ── */}
          <Animated.View style={[styles.card, cardStyle]}>

            {/* Level badge */}
            <View style={[styles.levelBadge, {
              backgroundColor: timerRanOut ? '#EF4444' : isAllFound ? '#27AE60' : accentBg,
              borderBottomColor: timerRanOut ? '#B91C1C' : isAllFound ? '#1A7A42' : accentDk,
            }]}>
              <Text style={styles.levelBadgeText}>
                {timerRanOut ? '⏰ TIME\'S UP!' : isAllFound ? '🌟 ALL WORDS FOUND!' : `LEVEL ${level} COMPLETE!`}
              </Text>
            </View>

            {/* Stars */}
            <View style={styles.starsRow}>
              <StarBadge filled={stars >= 1} delay={500} />
              <StarBadge filled={stars >= 2} delay={800} />
              <StarBadge filled={stars >= 3} delay={1100} />
            </View>

            {/* Message */}
            <Text style={[styles.message, { color: accentBg }]}>{message}</Text>

            {/* Score box — label beside value */}
            <Animated.View style={[styles.scoreBox, scoreStyle]}>
              <Text style={styles.scoreLabel}>SCORE</Text>
              <Text style={[styles.scoreValue, { color: accentBg }]}>⭐ {score}</Text>
            </Animated.View>

            {/* Stats row */}
            <View style={[styles.statsRow, { backgroundColor: '#7C3AED', borderColor: '#5B21B6' }]}>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{wordsFound.length}</Text>
                <Text style={styles.statLabel}>Words Found</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{formatTime(Math.round(timeTaken))}</Text>
                <Text style={styles.statLabel}>Time</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{possibleWords.length}</Text>
                <Text style={styles.statLabel}>Possible</Text>
              </View>
            </View>

            {/* All words */}
            {possibleWords.length > 0 && (
              <View style={styles.wordsSection}>
                <View style={styles.wordsSectionHeader}>
                  <Text style={styles.sectionTitle}>ALL WORDS IN THIS PUZZLE</Text>
                  <View style={[styles.countPill, { backgroundColor: isAllFound ? '#27AE60' : accentBg }]}>
                    <Text style={styles.countPillText}>{wordsFound.length}/{possibleWords.length}</Text>
                  </View>
                </View>
                <View style={styles.chips}>
                  {possibleWords.map((word, i) => {
                    const found = wordsFound.map(f => f.toLowerCase()).includes(word.toLowerCase());
                    return found ? (
                      <View key={i} style={styles.chipFound}>
                        <Text style={styles.chipFoundText}>{getWordEmoji(word)} {word.toUpperCase()} ✓</Text>
                      </View>
                    ) : (
                      <View key={i} style={styles.chipMissed}>
                        <Text style={styles.chipMissedText}>{word.toUpperCase()}</Text>
                      </View>
                    );
                  })}
                </View>
                {isAllFound && (
                  <Text style={styles.allFoundBanner}>🎉 You found every word!</Text>
                )}
              </View>
            )}
          </Animated.View>

          {/* ── Action buttons ── */}
          <Animated.View style={[styles.buttons, btnsStyle]}>
            {nextUnlocked && stars > 0 && (
              <ActionBtn
                label="▶  NEXT LEVEL"
                color="#27AE60" dark="#1A7A42"
                large
                onPress={() => navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'Game', params: { level: level + 1, skipIntro: true } }] })}
              />
            )}
            <ActionBtn
              label="↺  PLAY AGAIN"
              color="#F97316" dark="#A83C00"
              large={!(nextUnlocked && stars > 0)}
              onPress={() => navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'Game', params: { level, puzzle, skipIntro: true } }] })}
            />
            <View style={styles.btnRow}>
              <ActionBtn
                label="☰  LEVELS"
                color="#8B5CF6" dark="#5B28B0"
                onPress={() => navigation.navigate('LevelSelect')}
              />
              <ActionBtn
                label="🏠  HOME"
                color="#2D9CDB" dark="#1A6FA1"
                onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
              />
            </View>
          </Animated.View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 16,
  },

  // ── Card ──
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 28,
    padding: 20,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#0D47A1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.20,
    shadowRadius: 16,
    elevation: 10,
  },

  // ── Level badge ──
  levelBadge: {
    borderRadius: 20,
    borderBottomWidth: 4,
    paddingHorizontal: 22,
    paddingVertical: 8,
    alignItems: 'center',
  },
  levelBadgeText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // ── Stars ──
  starsRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  star: { fontSize: 44 },

  // ── Message ──
  message: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 28,
    textAlign: 'center',
  },

  // ── Score box ──
  scoreBox: {
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '90%',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  scoreLabel: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    color: '#92400E',
    letterSpacing: 3,
  },
  scoreValue: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 48,
  },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statNum: { fontFamily: 'Nunito_800ExtraBold', fontSize: 26, color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.20)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  statLabel: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.30)' },

  // ── Words section ──
  wordsSection: { width: '100%', gap: 10 },
  wordsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: '#64748B',
    letterSpacing: 2,
  },
  countPill: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countPillText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: '#FFFFFF',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chipFound: {
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderColor: '#27AE60',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  chipFoundText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: '#166534',
  },
  chipMissed: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipMissedText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: '#94A3B8',
  },
  allFoundBanner: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    color: '#166534',
    textAlign: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },

  // ── Buttons ──
  buttons: { width: '100%', gap: 10 },
  btnRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flexDirection: 'row',
    borderRadius: 18,
    borderBottomWidth: 4,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.30,
    shadowRadius: 6,
    elevation: 6,
  },
  actionBtnLarge: { paddingVertical: 18 },
  actionBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
