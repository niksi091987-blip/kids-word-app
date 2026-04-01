import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import LetterTile from './LetterTile';
import { COLORS } from '../constants/colors';
import { LAYOUT, SPACE, FONT_SIZE, TILE, TOUCH } from '../constants/dimensions';

/**
 * WordBuilder — shows the slots being filled with letters.
 * Shakes on wrong answer; flashes green on correct.
 *
 * Props:
 *   slots       [{id, letter} | null]  current placed tiles
 *   phase       'idle'|'correct'|'wrong'|'duplicate'
 *   onSlotTap   fn(tileId)             recall a tile from a slot
 *   onClear     fn()                   clear all slots
 */
export default function WordBuilder({ slots = [], phase = 'idle', onSlotTap, onClear }) {
  const shakeX = useSharedValue(0);
  const bgFlash = useSharedValue(0);

  useEffect(() => {
    if (phase === 'wrong' || phase === 'duplicate') {
      // Shake animation
      shakeX.value = withSequence(
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(-6, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(-4, { duration: 60 }),
        withTiming(4, { duration: 60 }),
        withTiming(0, { duration: 60 }),
      );
      // Red flash
      bgFlash.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 300 }),
      );
    } else if (phase === 'correct') {
      // Green flash
      bgFlash.value = withSequence(
        withTiming(2, { duration: 100 }),
        withTiming(0, { duration: 500 }),
      );
    }
  }, [phase]);

  const containerAnimStyle = useAnimatedStyle(() => {
    let bg = COLORS.surface;
    if (bgFlash.value > 1) {
      // green flash
      const t = (bgFlash.value - 1);
      bg = `rgba(76, 175, 125, ${t * 0.3})`;
    } else if (bgFlash.value > 0) {
      // red flash
      bg = `rgba(255, 107, 107, ${bgFlash.value * 0.3})`;
    }
    return {
      transform: [{ translateX: shakeX.value }],
      backgroundColor: bg,
    };
  });

  const filledSlots = slots.filter(Boolean);
  const hasLetters = filledSlots.length > 0;

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.container, containerAnimStyle]}>
        <View style={styles.slotsRow}>
          {slots.map((slot, index) => (
            <View key={index} style={styles.slotOuter}>
              {slot ? (
                <LetterTile
                  id={slot.id}
                  letter={slot.letter}
                  state={phase === 'correct' ? 'correct' : 'placed'}
                  size="medium"
                  onPress={() => onSlotTap && onSlotTap(slot.id)}
                />
              ) : (
                <View style={styles.emptySlot} />
              )}
            </View>
          ))}
        </View>

        {hasLetters && (
          <Pressable onPress={onClear} style={styles.clearBtn} hitSlop={8}>
            <Text style={styles.clearText}>CLEAR</Text>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: SPACE.md,
  },
  container: {
    borderRadius: LAYOUT.cardRadius,
    padding: SPACE.md,
    minHeight: TILE.medium + SPACE.md * 2,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  slotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: SPACE.xs,
  },
  slotOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlot: {
    width: TILE.medium,
    height: TILE.medium,
    borderRadius: LAYOUT.tileRadius,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  clearBtn: {
    marginTop: SPACE.sm,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.xs,
    borderRadius: LAYOUT.tagRadius,
    backgroundColor: COLORS.border,
  },
  clearText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
});
