import { WORDS_BY_LENGTH, ALL_WORDS } from '../data/words';
import { hasEmoji } from '../data/wordEmojis';
import { getTimerSeconds } from '../constants/config';

// Find common characters between two words (multiset intersection)
export function findCommonLetters(word1, word2) {
  const freq1 = {};
  const freq2 = {};
  for (const ch of word1.toLowerCase()) {
    freq1[ch] = (freq1[ch] || 0) + 1;
  }
  for (const ch of word2.toLowerCase()) {
    freq2[ch] = (freq2[ch] || 0) + 1;
  }
  const common = [];
  for (const ch of Object.keys(freq1)) {
    if (freq2[ch]) {
      const count = Math.min(freq1[ch], freq2[ch]);
      for (let i = 0; i < count; i++) {
        common.push(ch);
      }
    }
  }
  return common.sort();
}

// Check if a word can be formed from the given letters
export function canFormWord(word, availableLetters) {
  const letterPool = [...availableLetters];
  for (const ch of word.toLowerCase()) {
    const idx = letterPool.indexOf(ch);
    if (idx === -1) return false;
    letterPool.splice(idx, 1);
  }
  return true;
}

// Check if word is valid English
export function isValidWord(word) {
  return ALL_WORDS.has(word.toLowerCase());
}

// Check if a word can be formed using ONLY common letters between word1 and word2
export function isWordFromCommonLetters(word, commonLetters) {
  return canFormWord(word, commonLetters);
}

// Find all valid words that can be formed from given letters
export function findAllValidWords(letters) {
  const results = [];
  for (const word of ALL_WORDS) {
    if (word.length >= 2 && canFormWord(word, letters)) {
      results.push(word);
    }
  }
  return results.sort((a, b) => b.length - a.length);
}

// Get a spelling hint message for wrong attempts
export function getSpellingHint(correctWord) {
  const firstLetter = correctWord[0].toUpperCase();
  return `Starts with "${firstLetter}"! It has ${correctWord.length} letters.`;
}

// Get difficulty parameters
function getDifficultyParams(level) {
  if (level <= 2) {
    // Levels 1-2: simple 3-letter words for youngest kids
    return { wordLengths: [3], minCommon: 2, maxCommon: 3, timeBonus: 120 };
  } else if (level <= 3) {
    return { wordLengths: [3, 4], minCommon: 3, maxCommon: 4, timeBonus: 110 };
  } else if (level <= 4) {
    return { wordLengths: [4], minCommon: 3, maxCommon: 4, timeBonus: 100 };
  } else if (level <= 5) {
    return { wordLengths: [4, 5], minCommon: 3, maxCommon: 5, timeBonus: 90 };
  } else if (level <= 6) {
    return { wordLengths: [5], minCommon: 3, maxCommon: 5, timeBonus: 85 };
  } else if (level <= 7) {
    return { wordLengths: [5, 6], minCommon: 4, maxCommon: 6, timeBonus: 75 };
  } else if (level <= 8) {
    return { wordLengths: [6], minCommon: 4, maxCommon: 6, timeBonus: 70 };
  } else if (level <= 9) {
    return { wordLengths: [6, 7], minCommon: 5, maxCommon: 7, timeBonus: 65 };
  } else {
    return { wordLengths: [7, 8], minCommon: 5, maxCommon: 8, timeBonus: 60 };
  }
}

// Generate a puzzle — only uses words that have emoji mappings
export function generatePuzzle(level) {
  const params = getDifficultyParams(level);
  const { wordLengths, minCommon, maxCommon } = params;

  // Collect candidate words that have emoji representations
  let candidates = [];
  for (const len of wordLengths) {
    if (WORDS_BY_LENGTH[len]) {
      candidates = candidates.concat(
        WORDS_BY_LENGTH[len].filter(w => hasEmoji(w))
      );
    }
  }

  // Shuffle candidates
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);

  // Try pairs until we find one with the right number of common letters
  for (let i = 0; i < shuffled.length; i++) {
    for (let j = i + 1; j < Math.min(i + 50, shuffled.length); j++) {
      const w1 = shuffled[i];
      const w2 = shuffled[j];
      if (w1 === w2) continue;
      const common = findCommonLetters(w1, w2);

      if (common.length >= minCommon && common.length <= maxCommon) {
        const validWords = findAllValidWords(common);
        if (validWords.length > 0) {
          return {
            word1: w1,
            word2: w2,
            commonLetters: common,
            possibleWords: validWords,
            difficulty: level,
          };
        }
      }
    }
  }

  // Fallback: relax constraints but still require emojis
  for (let i = 0; i < shuffled.length; i++) {
    for (let j = i + 1; j < Math.min(i + 100, shuffled.length); j++) {
      const w1 = shuffled[i];
      const w2 = shuffled[j];
      if (w1 === w2) continue;
      const common = findCommonLetters(w1, w2);

      if (common.length >= 2) {
        const validWords = findAllValidWords(common);
        if (validWords.length > 0) {
          return {
            word1: w1,
            word2: w2,
            commonLetters: common,
            possibleWords: validWords,
            difficulty: level,
          };
        }
      }
    }
  }

  // Ultimate fallback
  return {
    word1: 'cat',
    word2: 'hat',
    commonLetters: ['a', 't'],
    possibleWords: ['at'],
    difficulty: level,
  };
}

// Get star rating based on time taken and difficulty
export function getStarRating(timeTaken, difficulty) {
  const target = getTimerSeconds(difficulty);
  if (timeTaken <= target * 0.3) return 3;
  if (timeTaken <= target * 0.7) return 2;
  return 1;
}
