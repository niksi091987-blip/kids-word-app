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
  const shakeX      = useSharedValue(0);
  const boardScale  = useSharedValue(1);

  useEffect(() => {
    if (phase === 'wrong') {
      shakeX.value = withSequence(
        withTiming(-10, { duration: 60 }),
        withTiming( 10, { duration: 60 }),
        withTiming( -8, { duration: 60 }),
        withTiming(  8, { duration: 60 }),
        withTiming( -5, { duration: 60 }),
        withTiming(  0, { duration: 60 }),
      );
    }
    if (phase === 'correct') {
      boardScale.value = withSequence(
        withSpring(1.1, { damping: 4, stiffness: 200 }),
        withSpring(0.95, { damping: 6 }),
        withSpring(1,    { damping: 8 }),
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
              filled    && styles.slotFilled,
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
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0,0,0,0.10)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  slotFilled: {
    borderColor: '#2D9CDB',
    borderWidth: 2.5,
    backgroundColor: '#EFF6FF',
    shadowColor: '#2D9CDB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.30,
    shadowRadius: 6,
    elevation: 5,
  },
  slotCorrect: {
    borderColor: '#27AE60',
    backgroundColor: '#F0FDF4',
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  letter: {
    fontSize: 26,
    fontFamily: 'Nunito_800ExtraBold',
    color: '#1565C0',
  },
  letterCorrect: {
    color: '#166534',
  },
  dash: {
    width: 28,
    height: 3,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    marginTop: 32,
  },
  correctBadge: {
    fontSize: 28,
    color: '#27AE60',
    marginLeft: 6,
  },
});
