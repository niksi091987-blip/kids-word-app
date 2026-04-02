import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// Vibrant readable colors — same palette as level tiles / AlphabetPanel
const TILE_COLORS  = ['#E85D04','#2D9CDB','#27AE60','#8B5CF6','#E91E8C','#F59E0B'];
const TILE_SHADOWS = ['#A83C00','#1A6FA1','#1A7A42','#5B28B0','#A0105E','#B87200'];

function getTileColor(letter) {
  return TILE_COLORS[letter.charCodeAt(0) % TILE_COLORS.length];
}
function getTileShadow(letter) {
  return TILE_SHADOWS[letter.charCodeAt(0) % TILE_SHADOWS.length];
}

// Word 1 = blue accent top bar, Word 2 = orange accent top bar
const SOURCE_ACCENT = { 1: '#2D9CDB', 2: '#E85D04' };

function Tile({ tile, onTap, disabled }) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePress() {
    if (tile.used || disabled) return;
    scale.value = withSpring(0.82, { damping: 6, stiffness: 300 }, () => {
      scale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onTap(tile.id);
  }

  const color  = getTileColor(tile.letter);
  const shadow = getTileShadow(tile.letter);
  const accent = SOURCE_ACCENT[tile.wordSource] || '#2D9CDB';

  if (tile.used) {
    return (
      <Pressable onPress={handlePress} disabled>
        <Animated.View style={[styles.tile, styles.tileUsed, animStyle]}>
          <Text style={styles.letterUsed}>{tile.letter.toUpperCase()}</Text>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={handlePress} disabled={disabled}>
      <Animated.View style={[
        styles.tile,
        {
          backgroundColor: '#FFFFFF',
          borderColor: color,
          borderTopColor: accent,
          borderTopWidth: 4,
          shadowColor: shadow,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.28,
          shadowRadius: 5,
          elevation: 5,
        },
        animStyle,
      ]}>
        <Text style={[styles.letter, { color }]}>
          {tile.letter.toUpperCase()}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function WordLetterTiles({ label, tiles, onTileTap, disabled }) {
  const labelColor = '#FFFFFF';

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
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
  tileUsed: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderTopWidth: 2,
  },
  letter: {
    fontSize: 22,
    fontFamily: 'Nunito_800ExtraBold',
  },
  letterUsed: {
    fontSize: 22,
    fontFamily: 'Nunito_800ExtraBold',
    color: '#94A3B8',
  },
});
