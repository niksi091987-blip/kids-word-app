import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export default function SpellingBoard({ slots, phase }) {
  const shakeX = useSharedValue(0);
  const boardScale = useSharedValue(1);

  useEffect(() => {
    if (phase === 'wrong') {
      // Shake left-right
      shakeX.value = withSequence(
        withTiming(-10, { duration: 60 }),
        withTiming(10, { duration: 60 }),
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(-5, { duration: 60 }),
        withTiming(0, { duration: 60 }),
      );
    }
    if (phase === 'correct') {
      boardScale.value = withSequence(
        withSpring(1.1, { damping: 4, stiffness: 200 }),
        withSpring(0.95, { damping: 6 }),
        withSpring(1, { damping: 8 }),
      );
    }
  }, [phase]);

  const boardAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shakeX.value },
      { scale: boardScale.value },
    ],
  }));

  const isCorrect = phase === 'correct';

  return (
    <Animated.View style={[styles.container, boardAnimStyle]}>
      {slots.map((letter, idx) => {
        const filled = letter !== '';
        return (
          <View
            key={idx}
            style={[
              styles.slot,
              filled && styles.slotFilled,
              isCorrect && styles.slotCorrect,
            ]}
          >
            {filled ? (
              <Text style={[styles.letter, isCorrect && styles.letterCorrect]}>
                {letter.toUpperCase()}
              </Text>
            ) : (
              <View style={styles.dash} />
            )}
          </View>
        );
      })}
      {isCorrect && (
        <Text style={styles.correctBadge}>✓</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  slot: {
    width: 52,
    height: 58,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotFilled: {
    borderColor: '#00D4FF',
    backgroundColor: 'rgba(0,212,255,0.2)',
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  slotCorrect: {
    borderColor: '#39FF14',
    backgroundColor: 'rgba(57,255,20,0.2)',
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  letter: {
    fontSize: 26,
    fontFamily: 'Nunito_800ExtraBold',
    color: '#00D4FF',
  },
  letterCorrect: {
    color: '#39FF14',
  },
  dash: {
    width: 28,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.30)',
    borderRadius: 2,
    marginTop: 32,
  },
  correctBadge: {
    fontSize: 28,
    color: '#39FF14',
    marginLeft: 6,
  },
});
