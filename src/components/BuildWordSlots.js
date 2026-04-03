import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';

// Vibrant readable colors — same palette as rest of app
const LETTER_COLORS  = ['#E85D04','#2D9CDB','#27AE60','#8B5CF6','#E91E8C','#F59E0B'];
const LETTER_SHADOWS = ['#A83C00','#1A6FA1','#1A7A42','#5B28B0','#A0105E','#B87200'];

function getLetterColor(letter) {
  return LETTER_COLORS[letter.charCodeAt(0) % LETTER_COLORS.length];
}
function getLetterShadow(letter) {
  return LETTER_SHADOWS[letter.charCodeAt(0) % LETTER_SHADOWS.length];
}

// A single placed letter — tap it to recall
function PlacedLetter({ slot, onTap }) {
  const color  = getLetterColor(slot.letter);
  const shadow = getLetterShadow(slot.letter);
  const pop    = useSharedValue(0);

  useEffect(() => {
    pop.value = withSpring(1, { damping: 6, stiffness: 280 });
  }, []);

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

  return (
    <Pressable onPress={() => onTap(slot.id)}>
      <Animated.View style={[styles.letter, {
        backgroundColor: color,
        shadowColor: shadow,
      }, anim]}>
        <Text style={styles.letterText}>{slot.letter.toUpperCase()}</Text>
        <Text style={styles.tapBack}>✕</Text>
      </Animated.View>
    </Pressable>
  );
}

// Blinking cursor shown when the strip is empty or after letters
function Cursor() {
  const op = useSharedValue(1);
  useEffect(() => {
    op.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 520 }),
        withTiming(1, { duration: 520 }),
      ),
      -1,
      false,
    );
  }, []);
  const anim = useAnimatedStyle(() => ({ opacity: op.value }));
  return (
    <Animated.View style={[styles.cursor, anim]} />
  );
}

export default function BuildWordSlots({ slots, phase, onSlotTap }) {
  const shakeX       = useSharedValue(0);
  const flashOpacity = useSharedValue(0);

  useEffect(() => {
    if (phase === 'word_wrong') {
      shakeX.value = withSequence(
        withTiming(-10, { duration: 55 }),
        withTiming( 10, { duration: 55 }),
        withTiming( -8, { duration: 55 }),
        withTiming(  8, { duration: 55 }),
        withTiming(  0, { duration: 55 }),
      );
    }
    if (phase === 'word_correct') {
      flashOpacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 500 }),
      );
    }
    if (phase === 'word_duplicate') {
      shakeX.value = withSequence(
        withTiming(-6, { duration: 60 }),
        withTiming( 6, { duration: 60 }),
        withTiming( 0, { duration: 60 }),
      );
    }
  }, [phase]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const filled = slots.filter(Boolean);
  const isEmpty = filled.length === 0;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>YOUR WORD</Text>

      <Animated.View style={[styles.strip, containerStyle]}>
        {isEmpty ? (
          // Placeholder prompt when nothing typed yet
          <View style={styles.placeholderRow}>
            <Cursor />
            <Text style={styles.placeholderText}>Tap letters below!</Text>
          </View>
        ) : (
          <View style={styles.lettersRow}>
            {filled.map((slot, idx) => (
              <PlacedLetter key={idx} slot={slot} onTap={onSlotTap} />
            ))}
            <Cursor />
          </View>
        )}

        {/* Green flash on correct */}
        <Animated.View style={[styles.correctFlash, flashStyle]} pointerEvents="none" />
      </Animated.View>

      {!isEmpty && (
        <Text style={styles.hintText}>Tap a letter to remove it</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  label: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // The word-preview strip
  strip: {
    minWidth: 180,
    minHeight: 66,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: '#7EC8F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },

  // Row of placed letters
  lettersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  // A single letter tile
  letter: {
    width: 52,
    height: 58,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.32,
    shadowRadius: 5,
    elevation: 5,
    gap: 1,
  },
  letterText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 26,
    color: '#FFFFFF',
    lineHeight: 30,
  },
  tapBack: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Nunito_700Bold',
    lineHeight: 11,
  },

  // Empty state
  placeholderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: '#94A3B8',
  },

  // Blinking cursor
  cursor: {
    width: 3,
    height: 38,
    borderRadius: 2,
    backgroundColor: '#7EC8F0',
  },

  hintText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 11,
    color: 'rgba(255,255,255,0.70)',
    letterSpacing: 0.3,
  },

  // Flash overlay
  correctFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(39,174,96,0.28)',
    borderRadius: 18,
  },
});
