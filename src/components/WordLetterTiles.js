import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const NEON_COLORS = ['#FF006E', '#00D4FF', '#39FF14', '#FFD700', '#BF5AF2', '#FF6B00'];
const NEON_BG = [
  'rgba(255,0,110,0.25)',
  'rgba(0,212,255,0.25)',
  'rgba(57,255,20,0.25)',
  'rgba(255,215,0,0.25)',
  'rgba(191,90,242,0.25)',
  'rgba(255,107,0,0.25)',
];

function getLetterColor(letter) {
  return NEON_COLORS[letter.charCodeAt(0) % NEON_COLORS.length];
}
function getLetterBg(letter) {
  return NEON_BG[letter.charCodeAt(0) % NEON_BG.length];
}

function Tile({ tile, onTap, disabled }) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePress() {
    if (tile.used || disabled) return;
    scale.value = withSpring(0.85, { damping: 6, stiffness: 300 }, () => {
      scale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onTap(tile.id);
  }

  const color = getLetterColor(tile.letter);
  const bg = getLetterBg(tile.letter);
  const topBorderColor = tile.wordSource === 1 ? '#00D4FF' : '#FF006E';

  return (
    <Pressable onPress={handlePress} disabled={tile.used || disabled}>
      <Animated.View style={[
        styles.tile,
        { borderColor: tile.used ? 'rgba(255,255,255,0.1)' : color },
        { backgroundColor: tile.used ? 'rgba(255,255,255,0.04)' : bg },
        !tile.used && { borderTopColor: topBorderColor, borderTopWidth: 3 },
        !tile.used && {
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 6,
          elevation: 6,
        },
        animStyle,
      ]}>
        <Text style={[styles.letter, { color: tile.used ? 'rgba(255,255,255,0.2)' : color }]}>
          {tile.letter.toUpperCase()}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function WordLetterTiles({ label, tiles, onTileTap, disabled }) {
  const labelColor = label === 'WORD 1' ? '#00D4FF' : '#FF006E';

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      <View style={styles.tilesRow}>
        {tiles.map((tile) => (
          <Tile
            key={tile.id}
            tile={tile}
            onTap={onTileTap}
            disabled={disabled}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    letterSpacing: 2,
    opacity: 0.8,
  },
  tilesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  tile: {
    width: 50,
    height: 54,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontSize: 22,
    fontFamily: 'Nunito_800ExtraBold',
  },
});
