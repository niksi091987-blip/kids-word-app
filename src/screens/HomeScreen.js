import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useProgress, PROGRESS_ACTIONS } from '../context/ProgressContext';
import { getLevelColor } from '../constants/colors';
import { TOTAL_LEVELS } from '../constants/config';

const BG = ['#0D0B1E', '#1A1035', '#251848'];

const LEVEL_NAMES = [
  'Tiny Tiles', 'Word Wiz', 'Letter Fun', 'Smart Speller', 'Word Builder',
  'Brain Blast', 'Letter Master', 'Word Champ', 'Super Speller', 'LEGEND!',
];

export default function HomeScreen({ navigation }) {
  const { state: progress, dispatch } = useProgress();

  // Animations
  const logoScale = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const statsSlide = useSharedValue(60);
  const playPulse = useSharedValue(1);
  const bg1Y = useSharedValue(0);
  const bg2Y = useSharedValue(0);
  const bg3Y = useSharedValue(0);
  const controllerBounce = useSharedValue(1);

  useEffect(() => {
    // Entrance animations
    logoScale.value = withDelay(100, withSpring(1, { damping: 8, stiffness: 100 }));
    titleOpacity.value = withDelay(300, withTiming(1, { duration: 600 }));
    statsSlide.value = withDelay(500, withSpring(0, { damping: 10, stiffness: 80 }));

    // Continuous animations
    playPulse.value = withDelay(800, withRepeat(
      withSequence(
        withSpring(1.06, { damping: 6, stiffness: 120 }),
        withSpring(1, { damping: 6 }),
      ), -1, true,
    ));
    controllerBounce.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.96, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      ), -1, true,
    );

    // Floating stars
    bg1Y.value = withRepeat(withSequence(
      withTiming(-14, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
    ), -1, true);
    bg2Y.value = withRepeat(withSequence(
      withTiming(-9, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
    ), -1, true);
    bg3Y.value = withRepeat(withSequence(
      withTiming(-18, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
    ), -1, true);

    // Update daily streak
    const today = new Date().toISOString().split('T')[0];
    dispatch({ type: PROGRESS_ACTIONS.UPDATE_STREAK, payload: { date: today } });
  }, []);

  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: logoScale.value }] }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));
  const statsStyle = useAnimatedStyle(() => ({ transform: [{ translateY: statsSlide.value }], opacity: statsSlide.value === 0 ? 1 : Math.max(0, 1 - statsSlide.value / 60) }));
  const playStyle = useAnimatedStyle(() => ({ transform: [{ scale: playPulse.value }] }));
  const controllerStyle = useAnimatedStyle(() => ({ transform: [{ scale: controllerBounce.value }] }));
  const bg1Style = useAnimatedStyle(() => ({ transform: [{ translateY: bg1Y.value }] }));
  const bg2Style = useAnimatedStyle(() => ({ transform: [{ translateY: bg2Y.value }] }));
  const bg3Style = useAnimatedStyle(() => ({ transform: [{ translateY: bg3Y.value }] }));

  const completedLevels = Object.values(progress.levels).filter(l => l.bestStars > 0).length;
  const totalStars = Object.values(progress.levels).reduce((sum, l) => sum + l.bestStars, 0);

  return (
    <LinearGradient colors={BG} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        {/* Floating bg stars */}
        <Animated.Text style={[styles.bgStar, { top: 60, left: 16 }, bg1Style]}>⭐</Animated.Text>
        <Animated.Text style={[styles.bgStar, { top: 140, right: 20 }, bg2Style]}>✨</Animated.Text>
        <Animated.Text style={[styles.bgStar, { top: 300, left: 40 }, bg3Style]}>🌟</Animated.Text>
        <Animated.Text style={[styles.bgStar, { top: 500, right: 30 }, bg1Style]}>💫</Animated.Text>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Game controller logo */}
          <Animated.View style={[styles.heroArea, logoStyle]}>
            <Animated.Text style={[styles.controllerEmoji, controllerStyle]}>🎮</Animated.Text>
          </Animated.View>

          {/* Title */}
          <Animated.View style={[styles.titleArea, titleStyle]}>
            <Text style={styles.title}>WORD MATCH</Text>
            <Text style={styles.titleKids}>KIDS</Text>
            <Text style={styles.tagline}>Spell • Match • Build Words!</Text>
          </Animated.View>

          {/* Streak banner */}
          {progress.dailyStreak > 1 && (
            <View style={styles.streakBanner}>
              <Text style={styles.streakText}>🔥 {progress.dailyStreak} DAY STREAK!</Text>
            </View>
          )}

          {/* Stats row */}
          <Animated.View style={[styles.statsRow, statsStyle]}>
            <View style={[styles.statCard, {
              borderColor: '#00D4FF',
              shadowColor: '#00D4FF',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 8,
              elevation: 8,
            }]}>
              <Ionicons name="trophy" size={22} color="#FFD700" />
              <Text style={styles.statNum}>{completedLevels}</Text>
              <Text style={styles.statLabel}>LEVELS</Text>
            </View>
            <View style={[styles.statCard, {
              borderColor: '#FFD700',
              shadowColor: '#FFD700',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 8,
              elevation: 8,
            }]}>
              <Text style={styles.statEmoji}>⭐</Text>
              <Text style={styles.statNum}>{totalStars}</Text>
              <Text style={styles.statLabel}>STARS</Text>
            </View>
            <View style={[styles.statCard, {
              borderColor: '#39FF14',
              shadowColor: '#39FF14',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 8,
              elevation: 8,
            }]}>
              <Ionicons name="text" size={22} color="#39FF14" />
              <Text style={[styles.statNum, { color: '#39FF14' }]}>{progress.totalWordsFound}</Text>
              <Text style={styles.statLabel}>WORDS</Text>
            </View>
          </Animated.View>

          {/* PLAY button */}
          <Animated.View style={[styles.playWrapper, playStyle]}>
            <Pressable onPress={() => navigation.navigate('LevelSelect')} style={styles.playBtn}>
              <Text style={styles.playBtnText}>▶  PLAY!</Text>
            </Pressable>
          </Animated.View>

          {/* Level progress */}
          <View style={styles.progressCard}>
            <Text style={styles.progressTitle}>YOUR PROGRESS</Text>
            <View style={styles.levelDots}>
              {Array.from({ length: TOTAL_LEVELS }, (_, i) => {
                const lvl = i + 1;
                const lvlData = progress.levels[lvl];
                const isUnlocked = lvlData?.unlocked;
                const stars = lvlData?.bestStars || 0;
                const color = isUnlocked ? getLevelColor(lvl) : 'rgba(255,255,255,0.15)';
                return (
                  <Pressable
                    key={lvl}
                    onPress={() => isUnlocked && navigation.navigate('Game', { level: lvl })}
                    style={[styles.levelDot, { borderColor: color, backgroundColor: `${color}20` }]}
                  >
                    {isUnlocked ? (
                      stars > 0
                        ? <Text style={styles.dotStars}>{'★'.repeat(stars)}</Text>
                        : <Text style={[styles.dotNum, { color }]}>{lvl}</Text>
                    ) : (
                      <Text style={styles.dotLock}>🔒</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.progressSummary}>
              ★ {totalStars} / {TOTAL_LEVELS * 3} STARS
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const DOT = 42;

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  bgStar: { position: 'absolute', fontSize: 22, opacity: 0.10 },

  heroArea: { marginBottom: 8 },
  controllerEmoji: { fontSize: 80 },

  titleArea: { alignItems: 'center', marginBottom: 8 },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 38,
    color: '#FFFFFF',
    letterSpacing: 3,
    textShadowColor: '#00D4FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  titleKids: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 44,
    color: '#FFD700',
    marginTop: -8,
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  tagline: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 4,
    letterSpacing: 0.5,
  },

  streakBanner: {
    backgroundColor: 'rgba(255,107,0,0.20)',
    borderWidth: 2,
    borderColor: '#FF6B00',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 12,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  streakText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    color: '#FF6B00',
    letterSpacing: 1,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    marginTop: 8,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 80,
    gap: 2,
  },
  statEmoji: { fontSize: 22 },
  statNum: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    color: '#FFD700',
  },
  statLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.50)',
    letterSpacing: 1,
  },

  playWrapper: { width: '100%', marginBottom: 24 },
  playBtn: {
    backgroundColor: '#39FF14',
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 16,
  },
  playBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 24,
    color: '#0D0B1E',
    letterSpacing: 3,
  },

  progressCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  progressTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: 'rgba(255,255,255,0.40)',
    letterSpacing: 3,
  },
  levelDots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  levelDot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotNum: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
  },
  dotStars: {
    fontSize: 10,
    color: '#FFD700',
  },
  dotLock: { fontSize: 16, opacity: 0.5 },
  progressSummary: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: '#FFD700',
    opacity: 0.8,
  },
});
