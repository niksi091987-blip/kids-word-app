import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '../constants/colors';
import { LAYOUT, SPACE, FONT_SIZE } from '../constants/dimensions';
import { getWordEmoji } from '../data/wordEmojis';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * WordCard — A single interactive word card with picture + tap-to-hear.
 */
function WordCard({ word, onPress, delay = 0, bgColor }) {
  const scale = useSharedValue(0);
  const bounce = useSharedValue(1);
  const wobble = useSharedValue(0);

  useEffect(() => {
    // Pop-in animation
    scale.value = withDelay(delay, withSpring(1, { damping: 8, stiffness: 120 }));
    // Gentle idle wobble
    wobble.value = withDelay(
      delay + 400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(-1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );
  }, [delay, scale, wobble]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * bounce.value },
      { rotate: `${wobble.value * 2}deg` },
    ],
  }));

  function handlePressIn() {
    bounce.value = withSpring(0.92, { damping: 15 });
  }

  function handlePressOut() {
    bounce.value = withSpring(1, { damping: 8, stiffness: 200 });
  }

  const emoji = getWordEmoji(word);

  return (
    <AnimatedPressable
      style={[styles.wordCard, { backgroundColor: bgColor }, cardStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => onPress && onPress(word)}
    >
      <Text style={styles.emojiLarge}>{emoji}</Text>
      <View style={styles.speakerRow}>
        <Text style={styles.speakerIcon}>🔊</Text>
        <Text style={styles.tapHint}>Tap to hear!</Text>
      </View>
    </AnimatedPressable>
  );
}

/**
 * WordDisplay — shows two source words as interactive picture cards.
 * Kids tap to hear the word spoken aloud. No spelling shown — they discover the letters!
 */
export default function WordDisplay({ word1, word2, onSpeakWord }) {
  const vsScale = useSharedValue(0);
  const vsRotate = useSharedValue(0);

  useEffect(() => {
    vsScale.value = withDelay(300, withSpring(1, { damping: 6, stiffness: 100 }));
    vsRotate.value = withDelay(300, withSequence(
      withSpring(15, { damping: 4 }),
      withSpring(-10, { damping: 5 }),
      withSpring(0, { damping: 8 }),
    ));
  }, [vsScale, vsRotate]);

  const vsStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: vsScale.value },
      { rotate: `${vsRotate.value}deg` },
    ],
  }));

  return (
    <View style={styles.container}>
      <WordCard
        word={word1}
        onPress={onSpeakWord}
        delay={0}
        bgColor="#FFF0F5"
      />

      <Animated.View style={[styles.vsCircle, vsStyle]}>
        <Text style={styles.vsText}>VS</Text>
      </Animated.View>

      <WordCard
        word={word2}
        onPress={onSpeakWord}
        delay={200}
        bgColor="#F0F8FF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACE.xs,
    paddingHorizontal: SPACE.md,
  },
  wordCard: {
    flex: 1,
    borderRadius: LAYOUT.cardRadius,
    padding: SPACE.md,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  emojiLarge: {
    fontSize: 56,
    marginBottom: SPACE.xs,
  },
  speakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(74,144,217,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  speakerIcon: {
    fontSize: 16,
  },
  tapHint: {
    fontFamily: 'Nunito_700Bold',
    fontSize: FONT_SIZE.xs,
    color: COLORS.primary,
  },
  vsCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
    marginHorizontal: -6,
  },
  vsText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
  },
});
