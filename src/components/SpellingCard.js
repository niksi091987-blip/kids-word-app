import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '../constants/colors';
import { SPACE, FONT_SIZE, LAYOUT } from '../constants/dimensions';
import { getWordEmoji } from '../data/wordEmojis';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function SpellingCard({
  word,
  typedLetters = [],
  isActive = false,
  isComplete = false,
  isWrong = false,
  onPress,
  delay = 0,
}) {
  const cardScale = useSharedValue(0);
  const bounce = useSharedValue(1);
  const wobble = useSharedValue(0);
  const shake = useSharedValue(0);
  const glow = useSharedValue(0);

  // Entry animation
  useEffect(() => {
    cardScale.value = withDelay(delay, withSpring(1, { damping: 8, stiffness: 120 }));
  }, [delay, cardScale]);

  // Active state — gentle pulse
  useEffect(() => {
    if (isActive && !isComplete) {
      wobble.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      wobble.value = withTiming(0, { duration: 200 });
    }
  }, [isActive, isComplete, wobble]);

  // Complete — celebration bounce
  useEffect(() => {
    if (isComplete) {
      glow.value = withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0.5, { duration: 500 }),
      );
      bounce.value = withSequence(
        withSpring(1.1, { damping: 4, stiffness: 200 }),
        withSpring(1.0, { damping: 8 }),
      );
    }
  }, [isComplete, glow, bounce]);

  // Wrong — shake
  useEffect(() => {
    if (isWrong) {
      shake.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-4, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    }
  }, [isWrong, shake]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: cardScale.value * bounce.value },
      { translateX: shake.value },
    ],
    borderColor: isComplete
      ? COLORS.success
      : isActive
      ? `rgba(74, 144, 217, ${0.5 + wobble.value * 0.5})`
      : 'rgba(255,255,255,0.6)',
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  const emoji = getWordEmoji(word);
  const wordLetters = word ? word.toLowerCase().split('') : [];

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[
        styles.card,
        isActive && styles.cardActive,
        isComplete && styles.cardComplete,
        cardStyle,
      ]}
    >
      {/* Glow overlay for complete */}
      {isComplete && (
        <Animated.View style={[styles.glowOverlay, glowStyle]} />
      )}

      {/* Emoji picture */}
      <Text style={styles.emoji}>{emoji}</Text>

      {/* Speaker icon */}
      <View style={styles.speakerBadge}>
        <Text style={styles.speakerIcon}>🔊</Text>
      </View>

      {/* Status indicator */}
      {isComplete && (
        <View style={styles.checkBadge}>
          <Text style={styles.checkText}>✅</Text>
        </View>
      )}

      {/* Spelling slots */}
      <View style={styles.slotsRow}>
        {wordLetters.map((correctLetter, index) => {
          const typed = typedLetters[index];
          const isTyped = typed !== undefined;
          const isCorrectSoFar = isTyped && typed === correctLetter;
          const isWrongLetter = isTyped && typed !== correctLetter;

          return (
            <View
              key={index}
              style={[
                styles.slot,
                isTyped && styles.slotFilled,
                isComplete && styles.slotCorrect,
                isWrongLetter && styles.slotWrong,
              ]}
            >
              <Text
                style={[
                  styles.slotText,
                  isComplete && styles.slotTextCorrect,
                  isWrongLetter && styles.slotTextWrong,
                ]}
              >
                {isTyped ? typed.toUpperCase() : ''}
              </Text>
              {!isTyped && <View style={styles.slotUnderline} />}
            </View>
          );
        })}
      </View>

      {/* Word length hint */}
      <Text style={styles.lengthHint}>
        {isComplete ? '🎉 Correct!' : `${wordLetters.length} letters`}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: LAYOUT.cardRadius,
    padding: SPACE.sm,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  cardActive: {
    backgroundColor: '#F8FBFF',
  },
  cardComplete: {
    backgroundColor: '#F0FFF4',
    borderColor: COLORS.success,
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(76, 175, 125, 0.15)',
    borderRadius: LAYOUT.cardRadius,
  },
  emoji: {
    fontSize: 52,
    marginBottom: 4,
  },
  speakerBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(74,144,217,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakerIcon: {
    fontSize: 14,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
  },
  checkText: {
    fontSize: 18,
  },
  slotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 3,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  slot: {
    width: 26,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(184,201,240,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  slotFilled: {
    backgroundColor: COLORS.tileActive,
  },
  slotCorrect: {
    backgroundColor: COLORS.success,
  },
  slotWrong: {
    backgroundColor: COLORS.error,
  },
  slotText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: FONT_SIZE.sm,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  slotTextCorrect: {
    color: '#FFFFFF',
  },
  slotTextWrong: {
    color: '#FFFFFF',
  },
  slotUnderline: {
    position: 'absolute',
    bottom: 4,
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.textMuted,
    opacity: 0.4,
  },
  lengthHint: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
});
