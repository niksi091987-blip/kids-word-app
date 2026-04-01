import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { LAYOUT, SPACE, FONT_SIZE } from '../constants/dimensions';
import { getWordEmoji } from '../data/wordEmojis';

/**
 * FoundWordsList — scrollable list of words found in this puzzle.
 *
 * Props:
 *   words          string[]   found words (lowercase)
 *   possibleWords  string[]   all possible words for this puzzle
 *   showMissed     bool       show words player didn't find (after time up)
 */
export default function FoundWordsList({ words = [], possibleWords = [], showMissed = false }) {
  const foundSet = new Set(words.map(w => w.toLowerCase()));
  const missedWords = showMissed
    ? possibleWords.filter(w => !foundSet.has(w.toLowerCase()))
    : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Words Found</Text>
        <Text style={styles.counter}>
          {words.length} / {possibleWords.length}
        </Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {words.length === 0 && !showMissed && (
          <Text style={styles.emptyText}>🎯 Make your first word!</Text>
        )}

        {words.map((word, index) => (
          <View key={`found-${index}`} style={styles.wordRow}>
            <Text style={styles.wordEmoji}>{getWordEmoji(word)}</Text>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
            <Text style={styles.wordText}>{word.toUpperCase()}</Text>
            <Text style={styles.wordPoints}>
              {word.length} letters
            </Text>
          </View>
        ))}

        {showMissed && missedWords.map((word, index) => (
          <View key={`missed-${index}`} style={[styles.wordRow, styles.missedRow]}>
            <Ionicons name="ellipse-outline" size={20} color={COLORS.textMuted} />
            <Text style={[styles.wordText, styles.missedText]}>{word.toUpperCase()}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
    backgroundColor: COLORS.primary,
  },
  title: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: FONT_SIZE.lg,
    color: COLORS.textLight,
  },
  counter: {
    fontFamily: 'Nunito_700Bold',
    fontSize: FONT_SIZE.md,
    color: COLORS.textLight,
  },
  list: {
    maxHeight: 180,
  },
  listContent: {
    padding: SPACE.sm,
    gap: SPACE.xs,
  },
  emptyText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: SPACE.md,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingVertical: SPACE.xs,
    paddingHorizontal: SPACE.sm,
    borderRadius: LAYOUT.tagRadius,
    backgroundColor: COLORS.background,
  },
  wordEmoji: {
    fontSize: 18,
  },
  wordText: {
    flex: 1,
    fontFamily: 'Nunito_700Bold',
    fontSize: FONT_SIZE.lg,
    color: COLORS.textPrimary,
  },
  wordPoints: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: FONT_SIZE.sm,
    color: COLORS.success,
  },
  missedRow: {
    backgroundColor: COLORS.surface,
    opacity: 0.6,
  },
  missedText: {
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
});
