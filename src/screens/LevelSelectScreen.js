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
import { useProgress } from '../context/ProgressContext';
import { TOTAL_LEVELS } from '../constants/config';
import LexieBadge from '../components/LexieBadge';

const BG = ['#0D0B1E', '#1A1035', '#251848'];

const LEVEL_NAMES = [
  'Tiny Tiles', 'Word Wiz', 'Letter Fun', 'Smart Speller', 'Word Builder',
  'Brain Blast', 'Letter Master', 'Word Champ', 'Super Speller', 'LEGEND!',
];

const LEVEL_COLORS = [
  '#39FF14', '#39FF14',   // 1-2 green
  '#00FFDD', '#00FFDD',   // 3-4 cyan
  '#00D4FF', '#00D4FF',   // 5-6 blue
  '#BF5AF2', '#BF5AF2',   // 7-8 purple
  '#FF006E', '#FF006E',   // 9-10 pink
];

function LevelCard({ level, levelData, isCurrent, onPress, animDelay }) {
  const scale = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const isUnlocked = levelData?.unlocked;
  const stars = levelData?.bestStars || 0;
  const color = LEVEL_COLORS[level - 1];

  useEffect(() => {
    scale.value = withDelay(animDelay, withSpring(1, { damping: 10, stiffness: 120 }));
    if (isCurrent && isUnlocked) {
      pulseScale.value = withDelay(animDelay + 400, withRepeat(
        withSequence(
          withTiming(1.04, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ), -1, true,
      ));
    }
  }, [isCurrent, isUnlocked, animDelay]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pulseScale.value }],
  }));

  function handlePress() {
    if (!isUnlocked) {
      scale.value = withSequence(
        withTiming(0.92, { duration: 70 }),
        withTiming(1.05, { duration: 70 }),
        withTiming(1, { duration: 70 }),
      );
      return;
    }
    onPress(level);
  }

  const glowColor = isUnlocked ? color : 'transparent';

  return (
    <Pressable onPress={handlePress} style={styles.cardPressable}>
      <Animated.View style={[
        styles.card,
        {
          borderColor: isUnlocked ? color : 'rgba(255,255,255,0.12)',
          backgroundColor: isUnlocked ? `${color}12` : 'rgba(255,255,255,0.04)',
        },
        isUnlocked && {
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: isCurrent ? 0.8 : 0.4,
          shadowRadius: isCurrent ? 16 : 8,
          elevation: isCurrent ? 14 : 7,
        },
        cardStyle,
      ]}>
        {/* Level number */}
        <Text style={[styles.levelNum, { color: isUnlocked ? color : 'rgba(255,255,255,0.20)' }]}>
          {level}
        </Text>

        {/* Name */}
        <Text style={[styles.levelName, { color: isUnlocked ? '#FFFFFF' : 'rgba(255,255,255,0.25)' }]}
          numberOfLines={1}
        >
          {LEVEL_NAMES[level - 1]}
        </Text>

        {/* Stars */}
        <View style={styles.starsRow}>
          {[0, 1, 2].map(i => (
            <Text key={i} style={[styles.star, { opacity: i < stars ? 1 : 0.15 }]}>★</Text>
          ))}
        </View>

        {/* Lock or Play badge */}
        {!isUnlocked ? (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={14} color="rgba(255,255,255,0.30)" />
          </View>
        ) : isCurrent ? (
          <View style={[styles.playBadge, { backgroundColor: color }]}>
            <Text style={styles.playBadgeText}>▶ PLAY</Text>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

export default function LevelSelectScreen({ navigation }) {
  const { state: progress } = useProgress();

  const completedCount = Object.values(progress.levels).filter(l => l.bestStars > 0).length;
  const totalStars = Object.values(progress.levels).reduce((sum, l) => sum + (l.bestStars || 0), 0);

  function handleLevelSelect(level) {
    navigation.navigate('Game', { level });
  }

  return (
    <LinearGradient colors={BG} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <LexieBadge style={{ marginTop: 4, marginBottom: 6 }} />
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={24} color="#00D4FF" />
          </Pressable>
          <Text style={styles.headerTitle}>SELECT LEVEL</Text>
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>{completedCount}/{TOTAL_LEVELS}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Grid: 2 columns */}
          <View style={styles.grid}>
            {Array.from({ length: TOTAL_LEVELS }, (_, i) => {
              const level = i + 1;
              const levelData = progress.levels[level];
              const isCurrent = level === progress.currentLevel && levelData?.unlocked;
              return (
                <LevelCard
                  key={level}
                  level={level}
                  levelData={levelData}
                  isCurrent={isCurrent}
                  onPress={handleLevelSelect}
                  animDelay={i * 50}
                />
              );
            })}
          </View>

          {/* Total stars bar */}
          <View style={styles.totalStarsCard}>
            <Text style={styles.totalStarsText}>
              ★ {totalStars} / {TOTAL_LEVELS * 3} STARS COLLECTED
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.10)',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,212,255,0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.25)',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
  },
  completedBadge: {
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  completedText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: '#FFD700',
  },

  scroll: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 32,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },

  cardPressable: { width: '47%' },
  card: {
    borderWidth: 2,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    minHeight: 120,
    justifyContent: 'center',
  },
  levelNum: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 32,
    lineHeight: 36,
  },
  levelName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  star: {
    fontSize: 14,
    color: '#FFD700',
  },
  lockBadge: {
    marginTop: 2,
  },
  playBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 2,
  },
  playBadgeText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    color: '#0D0B1E',
    letterSpacing: 1,
  },

  totalStarsCard: {
    marginTop: 20,
    backgroundColor: 'rgba(255,215,0,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.30)',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  totalStarsText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
    color: '#FFD700',
    letterSpacing: 2,
  },
});
