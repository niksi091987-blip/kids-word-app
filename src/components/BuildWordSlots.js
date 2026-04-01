import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const NEON_COLORS = ['#FF006E', '#00D4FF', '#39FF14', '#FFD700', '#BF5AF2', '#FF6B00'];
function getLetterColor(letter) {
  return NEON_COLORS[letter.charCodeAt(0) % NEON_COLORS.length];
}

function FilledSlot({ slot, onTap }) {
  const color = getLetterColor(slot.letter);
  function handlePress() {
    onTap(slot.id);
  }
  return (
    <Pressable onPress={handlePress}>
      <View style={[styles.slot, styles.slotFilled, {
        borderColor: color,
        backgroundColor: `${color}30`,
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 8,
        elevation: 8,
      }]}>
        <Text style={[styles.slotLetter, { color }]}>
          {slot.letter.toUpperCase()}
        </Text>
      </View>
    </Pressable>
  );
}

function EmptySlot() {
  return <View style={[styles.slot, styles.slotEmpty]} />;
}

export default function BuildWordSlots({ slots, phase, onSlotTap }) {
  const shakeX = useSharedValue(0);
  const flashOpacity = useSharedValue(0);

  useEffect(() => {
    if (phase === 'word_wrong') {
      shakeX.value = withSequence(
        withTiming(-10, { duration: 55 }),
        withTiming(10, { duration: 55 }),
        withTiming(-8, { duration: 55 }),
        withTiming(8, { duration: 55 }),
        withTiming(0, { duration: 55 }),
      );
    }
    if (phase === 'word_correct') {
      flashOpacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 400 }),
      );
    }
    if (phase === 'word_duplicate') {
      shakeX.value = withSequence(
        withTiming(-6, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(0, { duration: 60 }),
      );
    }
  }, [phase]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  // Show filled slots + 2 empty, minimum 4 visible
  const filledCount = slots.filter(Boolean).length;
  const visibleCount = Math.max(4, filledCount + 2, 4);
  const visibleSlots = slots.slice(0, Math.min(visibleCount, 8));

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>BUILD A WORD</Text>
      <Animated.View style={[styles.row, containerStyle]}>
        {visibleSlots.map((slot, idx) =>
          slot ? (
            <FilledSlot key={idx} slot={slot} onTap={onSlotTap} />
          ) : (
            <EmptySlot key={idx} />
          )
        )}
      </Animated.View>
      {/* Green flash overlay on correct */}
      <Animated.View style={[styles.correctFlash, flashStyle]} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: 'rgba(255,255,255,0.50)',
    letterSpacing: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    minHeight: 62,
    alignItems: 'center',
  },
  slot: {
    width: 54,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  slotFilled: {},
  slotEmpty: {
    borderColor: 'rgba(255,255,255,0.20)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderStyle: 'dashed',
  },
  slotLetter: {
    fontSize: 24,
    fontFamily: 'Nunito_800ExtraBold',
  },
  correctFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(57,255,20,0.25)',
    borderRadius: 12,
    pointerEvents: 'none',
  },
});
