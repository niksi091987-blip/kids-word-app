import React from 'react';
import { View, StyleSheet } from 'react-native';
import LetterTile from './LetterTile';
import { SPACE } from '../constants/dimensions';

/**
 * LetterTray — displays the available letter tiles for the current puzzle.
 *
 * Props:
 *   tiles      [{id, letter, used}]
 *   onTileTap  fn(tileId)
 *   disabled   bool
 */
export default function LetterTray({ tiles = [], onTileTap, disabled = false }) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {tiles.map((tile) => (
          <View key={tile.id} style={styles.tileWrapper}>
            <LetterTile
              id={tile.id}
              letter={tile.letter}
              state={tile.used ? 'used' : 'idle'}
              size="large"
              onPress={onTileTap}
              disabled={disabled || tile.used}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACE.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACE.sm,
  },
  tileWrapper: {
    // Gives a bit of extra hit area
    padding: 2,
  },
});
