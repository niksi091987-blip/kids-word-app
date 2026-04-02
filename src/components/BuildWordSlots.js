import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// Vibrant readable colors — same palette as rest of app
const SLOT_COLORS  = ['#E85D04','#2D9CDB','#27AE60','#8B5CF6','#E91E8C','#F59E0B'];
const SLOT_SHADOWS = ['#A83C00','#1A6FA1','#1A7A42','#5B28B0','#A0105E','#B87200'];

function getSlotColor(letter) {
  return SLOT_COLORS[letter.charCodeAt(0) % SLOT_COLORS.length];
}
function getSlotShadow(letter) {
  return SLOT_SHADOWS[letter.charCodeAt(0) % SLOT_SHADOWS.length];
}

function FilledSlot({ slot, onTap }) {
  const color  = getSlotColor(slot.letter);
  const shadow = getSlotShadow(slot.letter);

  function handlePress() {
    onTap(slot.id);
  }

  return (
    <Pressable onPress={handlePress}>
      <View style={[styles.slot, {
        backgroundColor: '#FFFFFF',
        borderColor: color,
        borderWidth: 2.5,
        shadowColor: shadow,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.28,
        shadowRadius: 5,
        elevation: 5,
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
        withTiming(0, { duration: 400 }),
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

  const filledCount  = slots.filter(Boolean).length;
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
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
  slotEmpty: {
    borderColor: '#94A3B8',
    backgroundColor: '#F8FAFC',
    borderStyle: 'dashed',
  },
  slotLetter: {
    fontSize: 24,
    fontFamily: 'Nunito_800ExtraBold',
  },
  correctFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(39,174,96,0.25)',
    borderRadius: 12,
    pointerEvents: 'none',
  },
});
