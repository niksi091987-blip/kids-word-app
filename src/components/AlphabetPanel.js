import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const NEON_COLORS = ['#FF006E', '#00D4FF', '#39FF14', '#FFD700', '#BF5AF2', '#FF6B00'];
const NEON_BG = [
  'rgba(255,0,110,0.25)',
  'rgba(0,212,255,0.25)',
  'rgba(57,255,20,0.25)',
  'rgba(255,215,0,0.25)',
  'rgba(191,90,242,0.25)',
  'rgba(255,107,0,0.25)',
];

const ROWS = [
  ['A','B','C','D','E','F','G'],
  ['H','I','J','K','L','M','N'],
  ['O','P','Q','R','S','T','U'],
  ['V','W','X','Y','Z'],
];

function getLetterColor(letter) {
  return NEON_COLORS[letter.charCodeAt(0) % NEON_COLORS.length];
}
function getLetterBg(letter) {
  return NEON_BG[letter.charCodeAt(0) % NEON_BG.length];
}

function LetterButton({ letter, onPress, disabled, highlight }) {
  const scale = useSharedValue(1);

  const color = getLetterColor(letter);
  const bg = getLetterBg(letter);

  useEffect(() => {
    if (highlight) {
      scale.value = withRepeat(
        withSequence(
          withSpring(1.18, { damping: 5, stiffness: 200 }),
          withSpring(1, { damping: 6 }),
        ),
        -1,
        true,
      );
    } else {
      scale.value = withSpring(1);
    }
  }, [highlight]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePress() {
    if (disabled) return;
    scale.value = withSequence(
      withSpring(0.80, { damping: 8, stiffness: 400 }),
      withSpring(1.15, { damping: 5, stiffness: 250 }),
      withSpring(1, { damping: 8 }),
    );
    onPress(letter.toLowerCase());
  }

  return (
    <Pressable onPress={handlePress} disabled={disabled}>
      <Animated.View style={[
        styles.letterBtn,
        {
          backgroundColor: disabled ? 'rgba(255,255,255,0.04)' : bg,
          borderColor: highlight ? '#FFD700' : color,
          borderWidth: highlight ? 3 : 2,
        },
        disabled && styles.disabledBtn,
        highlight && {
          shadowColor: '#FFD700',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 10,
          elevation: 10,
        },
        !disabled && !highlight && {
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 4,
        },
        animStyle,
      ]}>
        <Text style={[
          styles.letterText,
          { color: disabled ? 'rgba(255,255,255,0.20)' : color },
        ]}>
          {letter}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function AlphabetPanel({ onLetterPress, onBackspace, disabled, highlightLetter }) {
  const highlight = highlightLetter ? highlightLetter.toUpperCase() : null;

  const handleLetter = useCallback((letter) => {
    if (onLetterPress) onLetterPress(letter);
  }, [onLetterPress]);

  const handleBack = useCallback(() => {
    if (disabled) return;
    if (onBackspace) onBackspace();
  }, [onBackspace, disabled]);

  return (
    <View style={styles.container}>
      {ROWS.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map((letter) => (
            <LetterButton
              key={letter}
              letter={letter}
              onPress={handleLetter}
              disabled={disabled}
              highlight={highlight === letter}
            />
          ))}
        </View>
      ))}
      <Pressable onPress={handleBack} disabled={disabled} style={styles.backspaceBtn}>
        <Text style={[styles.backspaceText, disabled && { opacity: 0.3 }]}>⌫  BACK</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 6,
    paddingBottom: 4,
    gap: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  letterBtn: {
    width: 42,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    fontSize: 18,
    fontFamily: 'Nunito_800ExtraBold',
  },
  disabledBtn: {
    opacity: 0.35,
  },
  backspaceBtn: {
    marginTop: 2,
    backgroundColor: 'rgba(255,0,110,0.18)',
    borderWidth: 2,
    borderColor: '#FF006E',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  backspaceText: {
    color: '#FF006E',
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    letterSpacing: 1,
  },
});
