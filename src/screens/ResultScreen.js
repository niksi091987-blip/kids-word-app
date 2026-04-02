import React, { useEffect, useRef } from 'react';
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
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useProgress } from '../context/ProgressContext';
import { TOTAL_LEVELS } from '../constants/config';
import { getWordEmoji } from '../data/wordEmojis';
import LexieBadge from '../components/LexieBadge';

const BG = ['#0D0B1E', '#1A1035', '#251848'];

const LEVEL_COLORS = [
  '#39FF14', '#39FF14',
  '#00FFDD', '#00FFDD',
  '#00D4FF', '#00D4FF',
  '#BF5AF2', '#BF5AF2',
  '#FF006E', '#FF006E',
];

const MESSAGES = {
  3: ['🔥 INCREDIBLE!', '⚡ LEGENDARY!', '🌟 PERFECT!', '🏆 FLAWLESS!'],
  2: ['🎉 AWESOME!', '💪 GREAT JOB!', '⭐ WELL DONE!', '🎊 NICE WORK!'],
  1: ['🙌 NICE TRY!', '✨ KEEP GOING!', '🌈 GOOD EFFORT!', '💫 YOU GOT IT!'],
  0: ['🤗 TRY AGAIN!', '💪 YOU CAN DO IT!'],
};

function NavButton({ label, color, onPress, large }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable onPress={onPress} onPressIn={() => { scale.value = withSpring(0.94); }}
      onPressOut={() => { scale.value = withSpring(1); }}>
      <Animated.View style={[
        styles.navBtn,
        large && styles.navBtnLarge,
        {
          borderColor: color,
          backgroundColor: `${color}18`,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 10,
          elevation: 8,
        },
        animStyle,
      ]}>
        <Text style={[styles.navBtnText, { color, fontSize: large ? 18 : 14 }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function ResultScreen({ route, navigation }) {
  const {
    level = 1,
    stars = 0,
    score = 0,
    wordsFound = [],
    timeTaken = 0,
    possibleWords = [],
    puzzle = null,
  } = route.params ?? {};

  const { state: progress } = useProgress();

  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.85);
  const scoreScale = useSharedValue(0);
  const btnsOpacity = useSharedValue(0);
  const s1Scale = useSharedValue(0);
  const s2Scale = useSharedValue(0);
  const s3Scale = useSharedValue(0);
  const bg1Y = useSharedValue(0);
  const bg2Y = useSharedValue(0);

  useEffect(() => {
    cardOpacity.value = withTiming(1, { duration: 350 });
    cardScale.value = withSpring(1, { damping: 10, stiffness: 120 });
    scoreScale.value = withDelay(300, withSpring(1, { damping: 7, stiffness: 130 }));

    // Stars pop in sequentially
    if (stars >= 1) s1Scale.value = withDelay(500, withSpring(1.2, { damping: 5, stiffness: 200 }, () => {
      s1Scale.value = withSpring(1);
    }));
    if (stars >= 2) s2Scale.value = withDelay(800, withSpring(1.2, { damping: 5, stiffness: 200 }, () => {
      s2Scale.value = withSpring(1);
    }));
    if (stars >= 3) s3Scale.value = withDelay(1100, withSpring(1.2, { damping: 5, stiffness: 200 }, () => {
      s3Scale.value = withSpring(1);
    }));

    btnsOpacity.value = withDelay(stars > 0 ? 1400 : 800, withTiming(1, { duration: 400 }));

    // Floating background particles
    bg1Y.value = withRepeat(withSequence(
      withTiming(-14, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
    ), -1, true);
    bg2Y.value = withRepeat(withSequence(
      withTiming(-10, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
    ), -1, true);
  }, []);

  const cardStyle = useAnimatedStyle(() => ({ opacity: cardOpacity.value, transform: [{ scale: cardScale.value }] }));
  const scoreStyle = useAnimatedStyle(() => ({ transform: [{ scale: scoreScale.value }] }));
  const btnsStyle = useAnimatedStyle(() => ({ opacity: btnsOpacity.value }));
  const s1Style = useAnimatedStyle(() => ({ transform: [{ scale: s1Scale.value }] }));
  const s2Style = useAnimatedStyle(() => ({ transform: [{ scale: s2Scale.value }] }));
  const s3Style = useAnimatedStyle(() => ({ transform: [{ scale: s3Scale.value }] }));
  const bg1Style = useAnimatedStyle(() => ({ transform: [{ translateY: bg1Y.value }] }));
  const bg2Style = useAnimatedStyle(() => ({ transform: [{ translateY: bg2Y.value }] }));

  const messageList = MESSAGES[stars] || MESSAGES[0];
  const message = useRef(messageList[Math.floor(Math.random() * messageList.length)]).current;

  const levelColor = LEVEL_COLORS[level - 1] || '#00D4FF';
  const isLastLevel = level >= TOTAL_LEVELS;
  const nextUnlocked = !isLastLevel && progress.levels[level + 1]?.unlocked === true;

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <LinearGradient colors={BG} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        {/* Floating bg */}
        <Animated.Text style={[styles.bgParticle, { top: 60, left: 20 }, bg1Style]}>🌟</Animated.Text>
        <Animated.Text style={[styles.bgParticle, { top: 180, right: 24 }, bg2Style]}>✨</Animated.Text>
        <Animated.Text style={[styles.bgParticle, { top: 320, left: 50 }, bg1Style]}>⭐</Animated.Text>
        <Animated.Text style={[styles.bgParticle, { top: 450, right: 40 }, bg2Style]}>🎉</Animated.Text>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.card, cardStyle]}>
            <LexieBadge style={{ marginBottom: 10 }} />
            {/* Level badge */}
            <View style={[styles.levelBadge, {
              borderColor: levelColor,
              backgroundColor: `${levelColor}20`,
              shadowColor: levelColor,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 12,
              elevation: 10,
            }]}>
              <Text style={[styles.levelBadgeText, { color: levelColor }]}>
                LEVEL {level} COMPLETE!
              </Text>
            </View>

            {/* Stars */}
            <View style={styles.starsRow}>
              {[s1Style, s2Style, s3Style].map((style, i) => (
                <Animated.Text
                  key={i}
                  style={[styles.star, style, { opacity: i < stars ? 1 : 0.18 }]}
                >
                  ⭐
                </Animated.Text>
              ))}
            </View>

            {/* Message */}
            <Text style={styles.message}>{message}</Text>

            {/* Score */}
            <Animated.View style={[styles.scoreBox, scoreStyle, {
              borderColor: '#FFD700',
              shadowColor: '#FFD700',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 14,
              elevation: 12,
            }]}>
              <Text style={styles.scoreLabel}>SCORE</Text>
              <Text style={styles.scoreValue}>⭐ {score}</Text>
            </Animated.View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{wordsFound.length}</Text>
                <Text style={styles.statLabel}>Words</Text>
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

            {/* Words found */}
            {wordsFound.length > 0 && (
              <View style={styles.wordsSection}>
                <Text style={styles.sectionTitle}>WORDS FOUND</Text>
                <View style={styles.chips}>
                  {wordsFound.map((word, i) => (
                    <View key={i} style={styles.chipGreen}>
                      <Text style={styles.chipText}>{getWordEmoji(word)} {word.toUpperCase()}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Missed words */}
            {possibleWords.filter(w => !wordsFound.map(f => f.toLowerCase()).includes(w.toLowerCase())).length > 0 && (
              <View style={styles.wordsSection}>
                <Text style={[styles.sectionTitle, { color: 'rgba(255,255,255,0.35)' }]}>YOU COULD ALSO FIND</Text>
                <View style={styles.chips}>
                  {possibleWords
                    .filter(w => !wordsFound.map(f => f.toLowerCase()).includes(w.toLowerCase()))
                    .map((word, i) => (
                      <View key={i} style={styles.chipGray}>
                        <Text style={styles.chipTextGray}>{word.toUpperCase()}</Text>
                      </View>
                    ))}
                </View>
              </View>
            )}
          </Animated.View>

          {/* Action buttons */}
          <Animated.View style={[styles.buttons, btnsStyle]}>
            {nextUnlocked && stars > 0 && (
              <NavButton
                label="▶ NEXT LEVEL"
                color="#39FF14"
                large
                onPress={() => navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'Game', params: { level: level + 1 } }] })}
              />
            )}
            <NavButton
              label="↺ PLAY AGAIN"
              color="#00D4FF"
              large={!(nextUnlocked && stars > 0)}
              onPress={() => navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'Game', params: { level, puzzle } }] })}
            />
            <View style={styles.btnRow}>
              <View style={{ flex: 1 }}>
                <NavButton
                  label="☰ LEVELS"
                  color="#BF5AF2"
                  onPress={() => navigation.navigate('LevelSelect')}
                />
              </View>
              <View style={{ flex: 1 }}>
                <NavButton
                  label="🏠 HOME"
                  color="#FFD700"
                  onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
                />
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  bgParticle: { position: 'absolute', fontSize: 24, opacity: 0.10 },

  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },

  levelBadge: {
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 7,
  },
  levelBadgeText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
    letterSpacing: 2,
  },

  starsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  star: { fontSize: 42 },

  message: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 28,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  scoreBox: {
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 40,
    paddingVertical: 14,
    alignItems: 'center',
  },
  scoreLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: 'rgba(255,215,0,0.70)',
    letterSpacing: 3,
  },
  scoreValue: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 38,
    color: '#FFD700',
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statNum: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 20,
    color: '#FFFFFF',
  },
  statLabel: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  wordsSection: { width: '100%', gap: 6 },
  sectionTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.40)',
    letterSpacing: 2,
    textAlign: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  chipGreen: {
    backgroundColor: 'rgba(57,255,20,0.15)',
    borderWidth: 1,
    borderColor: '#39FF14',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: '#39FF14',
  },
  chipGray: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipTextGray: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },

  buttons: { width: '100%', gap: 10 },
  btnRow: { flexDirection: 'row', gap: 10 },
  navBtn: {
    borderWidth: 2,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnLarge: { paddingVertical: 18 },
  navBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    letterSpacing: 1,
  },
});
