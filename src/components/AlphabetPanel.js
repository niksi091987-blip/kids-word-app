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

// Vibrant readable colors — work on white backgrounds
const KEY_COLORS  = ['#E85D04','#2D9CDB','#27AE60','#8B5CF6','#E91E8C','#F59E0B'];
const KEY_SHADOWS = ['#A83C00','#1A6FA1','#1A7A42','#5B28B0','#A0105E','#B87200'];

const ROWS = [
  ['A','B','C','D','E','F','G'],
  ['H','I','J','K','L','M','N'],
  ['O','P','Q','R','S','T','U'],
  ['V','W','X','Y','Z'],
];
const LAST_ROW_IDX = ROWS.length - 1;

function getColor(letter) {
  return KEY_COLORS[letter.charCodeAt(0) % KEY_COLORS.length];
}
function getShadow(letter) {
  return KEY_SHADOWS[letter.charCodeAt(0) % KEY_SHADOWS.length];
}

function LetterButton({ letter, onPress, disabled, highlight }) {
  const scale = useSharedValue(1);
  const color  = getColor(letter);
  const shadow = getShadow(letter);

  useEffect(() => {
    if (highlight) {
      scale.value = withRepeat(
        withSequence(
          withSpring(1.20, { damping: 5, stiffness: 200 }),
          withSpring(1,    { damping: 6 }),
        ), -1, true,
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
      withSpring(0.78, { damping: 8, stiffness: 400 }),
      withSpring(1.12, { damping: 5, stiffness: 250 }),
      withSpring(1,    { damping: 8 }),
    );
    onPress(letter.toLowerCase());
  }

  // highlight = pulse with colored bg; normal = white key with color letter; disabled = gray
  const keyBg     = disabled ? '#E9EDEF' : highlight ? color : '#FFFFFF';
  const letterClr = disabled ? '#B0BEC5' : highlight ? '#FFFFFF' : color;
  const borderClr = disabled ? '#CFD8DC' : shadow;

  return (
    <Pressable onPress={handlePress} disabled={disabled}>
      <Animated.View style={[
        styles.letterBtn,
        {
          backgroundColor: keyBg,
          borderBottomColor: borderClr,
          borderBottomWidth: disabled ? 2 : 3,
          borderColor: disabled ? '#CFD8DC' : highlight ? shadow : 'rgba(0,0,0,0.08)',
        },
        !disabled && {
          shadowColor: highlight ? color : 'rgba(0,0,0,0.18)',
          shadowOffset: { width: 0, height: highlight ? 4 : 2 },
          shadowOpacity: highlight ? 0.5 : 1,
          shadowRadius: highlight ? 8 : 3,
          elevation: highlight ? 8 : 3,
        },
        disabled && styles.disabledBtn,
        animStyle,
      ]}>
        <Text style={[styles.letterText, { color: letterClr }]}>
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
          {rowIdx === LAST_ROW_IDX && (
            <Pressable onPress={handleBack} disabled={disabled} style={[
              styles.backspaceKey,
              disabled && { opacity: 0.40 },
            ]}>
              <Text style={styles.backspaceKeyText}>⌫</Text>
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 6,
    paddingBottom: 2,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  letterBtn: {
    width: 40,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    fontSize: 18,
    fontFamily: 'Nunito_800ExtraBold',
  },
  disabledBtn: {
    opacity: 0.45,
  },
  backspaceKey: {
    width: 40,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderBottomWidth: 3,
    borderBottomColor: '#A83C00',
    backgroundColor: '#E85D04',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A83C00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  backspaceKeyText: {
    color: '#FFFFFF',
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 18,
  },
});
