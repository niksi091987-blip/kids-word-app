import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { isValidWord, isWordFromCommonLetters } from '../utils/gameLogic';
import { SPELL_SCORE_FIRST_TRY, SPELL_SCORE_WITH_HINT, WORD_SCORE_PER_LETTER } from '../constants/config';

// ── Initial State ──────────────────────────────────────────────────────────────
const initialGameState = {
  puzzle: null,           // { word1, word2, commonLetters, possibleWords, difficulty }
  phase: 'idle',
  // Phases:
  // 'idle' | 'spelling_word1' | 'spelling_word2'
  // | 'word_building' | 'word_correct' | 'word_wrong' | 'word_duplicate' | 'complete'

  // Spelling phase
  spellingTarget: 1,          // 1 or 2 — which word we're spelling
  spellingSlots: [],          // string[] — letters typed so far, '' = empty slot
  spellingAttempts: 0,        // failed attempts for current word
  spellingHintActive: false,  // first letter revealed as hint

  word1Spelled: false,
  word2Spelled: false,

  // Word building phase (phase 3)
  wordTiles: [],    // [{ id, letter, wordSource: 1|2, used: boolean }]
  buildSlots: new Array(8).fill(null),  // [{ id, letter } | null]
  foundWords: [],   // string[]

  // Scoring
  score: 0,
  spellScore: 0,
  wordScore: 0,

  // Timer (word building phase only)
  secondsLeft: 0,
  totalSeconds: 0,

  hintsUsed: 0,
  timeTaken: 0,
};

// ── Action Types ───────────────────────────────────────────────────────────────
export const GAME_ACTIONS = {
  RESET:              'RESET',
  START_PUZZLE:       'START_PUZZLE',
  SET_PHASE:          'SET_PHASE',
  // Spelling
  TYPE_LETTER:        'TYPE_LETTER',
  BACKSPACE:          'BACKSPACE',
  CLEAR_SPELLING:     'CLEAR_SPELLING',
  SPELLING_CORRECT:   'SPELLING_CORRECT',
  SPELLING_WRONG:     'SPELLING_WRONG',
  ADVANCE_PHASE:      'ADVANCE_PHASE',
  // Word building
  PLACE_TILE:         'PLACE_TILE',
  RECALL_TILE:        'RECALL_TILE',
  WORD_ACCEPTED:      'WORD_ACCEPTED',
  WORD_REJECTED:      'WORD_REJECTED',
  WORD_DUPLICATE:     'WORD_DUPLICATE',
  CLEAR_BUILD_SLOTS:  'CLEAR_BUILD_SLOTS',
  TOGGLE_TILE:        'TOGGLE_TILE',
  CLEAR_TILE_WRONG:   'CLEAR_TILE_WRONG',
  START_BUILDING:     'START_BUILDING',
  USE_HINT:           'USE_HINT',
  SET_SPELLING_SLOTS: 'SET_SPELLING_SLOTS',
  TIMER_TICK:         'TIMER_TICK',
  COMPLETE_PUZZLE:    'COMPLETE_PUZZLE',
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function buildWordTiles(word1, word2) {
  const tiles = [];
  word1.toLowerCase().split('').forEach((letter, i) => {
    tiles.push({ id: `w1_${letter}_${i}`, letter, wordSource: 1, selected: false, used: false });
  });
  word2.toLowerCase().split('').forEach((letter, i) => {
    tiles.push({ id: `w2_${letter}_${i}`, letter, wordSource: 2, selected: false, used: false });
  });
  return tiles;
}

// ── Reducer ────────────────────────────────────────────────────────────────────
function gameReducer(state, action) {
  switch (action.type) {
    case GAME_ACTIONS.RESET:
      return { ...initialGameState };

    case GAME_ACTIONS.START_PUZZLE: {
      const { puzzle, timerSeconds } = action.payload;
      const spellingSlots = new Array(puzzle.word1.length).fill('');
      const wordTiles = buildWordTiles(puzzle.word1, puzzle.word2);
      return {
        ...initialGameState,
        puzzle,
        phase: 'spelling_word1',
        spellingTarget: 1,
        spellingSlots,
        wordTiles,
        secondsLeft: timerSeconds,
        totalSeconds: timerSeconds,
      };
    }

    case GAME_ACTIONS.SET_PHASE:
      return { ...state, phase: action.payload };

    // ── Spelling ──────────────────────────────────────────────────────
    case GAME_ACTIONS.TYPE_LETTER: {
      const { letter } = action.payload;
      const slots = [...state.spellingSlots];
      const emptyIdx = slots.indexOf('');
      if (emptyIdx === -1) return state; // all full
      slots[emptyIdx] = letter.toLowerCase();
      return { ...state, spellingSlots: slots };
    }

    case GAME_ACTIONS.BACKSPACE: {
      const slots = [...state.spellingSlots];
      // Find last filled slot
      let lastFilled = -1;
      for (let i = slots.length - 1; i >= 0; i--) {
        if (slots[i] !== '') { lastFilled = i; break; }
      }
      if (lastFilled === -1) return state;
      slots[lastFilled] = '';
      return { ...state, spellingSlots: slots };
    }

    case GAME_ACTIONS.CLEAR_SPELLING: {
      const targetWord = state.spellingTarget === 1
        ? state.puzzle?.word1 : state.puzzle?.word2;
      const len = targetWord?.length || state.spellingSlots.length;
      return { ...state, spellingSlots: new Array(len).fill('') };
    }

    case GAME_ACTIONS.SPELLING_CORRECT: {
      const { wordNum, points } = action.payload;
      const newScore = state.score + points;
      if (wordNum === 1) {
        return {
          ...state,
          word1Spelled: true,
          phase: 'spelling_word1', // stays, ADVANCE_PHASE will move it
          score: newScore,
          spellScore: state.spellScore + points,
          spellingAttempts: 0,
          spellingHintActive: false,
        };
      } else {
        return {
          ...state,
          word2Spelled: true,
          phase: 'spelling_word2',
          score: newScore,
          spellScore: state.spellScore + points,
          spellingAttempts: 0,
          spellingHintActive: false,
        };
      }
    }

    case GAME_ACTIONS.SPELLING_WRONG: {
      return {
        ...state,
        spellingAttempts: state.spellingAttempts + 1,
        spellingHintActive: true,
      };
    }

    case GAME_ACTIONS.ADVANCE_PHASE: {
      if (state.phase === 'spelling_word1' || (state.word1Spelled && !state.word2Spelled)) {
        // Move to spell word 2
        const word2Len = state.puzzle?.word2?.length || 3;
        return {
          ...state,
          phase: 'spelling_word2',
          spellingTarget: 2,
          spellingSlots: new Array(word2Len).fill(''),
          spellingAttempts: 0,
          spellingHintActive: false,
        };
      } else if (state.phase === 'spelling_word2' || state.word2Spelled) {
        // Move to common_finding — kids discover the common letters
        return {
          ...state,
          phase: 'common_finding',
          buildSlots: new Array(8).fill(null),
        };
      }
      return state;
    }

    // ── Word Building ─────────────────────────────────────────────────
    case GAME_ACTIONS.PLACE_TILE: {
      const { tileId } = action.payload;
      const tile = state.wordTiles.find(t => t.id === tileId);
      if (!tile || tile.used) return state;

      const slotIndex = state.buildSlots.findIndex(s => s === null);
      if (slotIndex === -1) return state;

      const newTiles = state.wordTiles.map(t =>
        t.id === tileId ? { ...t, used: true } : t
      );
      const newSlots = [...state.buildSlots];
      newSlots[slotIndex] = { id: tileId, letter: tile.letter };

      return { ...state, wordTiles: newTiles, buildSlots: newSlots };
    }

    case GAME_ACTIONS.RECALL_TILE: {
      const { tileId } = action.payload;
      const slotIndex = state.buildSlots.findIndex(s => s && s.id === tileId);
      if (slotIndex === -1) return state;

      const newSlots = [...state.buildSlots];
      newSlots[slotIndex] = null;

      // Compact slots (shift left)
      const filled = newSlots.filter(s => s !== null);
      const compacted = [...filled, ...new Array(newSlots.length - filled.length).fill(null)];

      const newTiles = state.wordTiles.map(t =>
        t.id === tileId ? { ...t, used: false } : t
      );
      return { ...state, wordTiles: newTiles, buildSlots: compacted };
    }

    case GAME_ACTIONS.WORD_ACCEPTED: {
      const { word, points } = action.payload;
      const newFound = [...state.foundWords, word.toLowerCase()];

      const usedIds = state.buildSlots.filter(Boolean).map(s => s.id);
      const newTiles = state.wordTiles.map(t =>
        usedIds.includes(t.id) ? { ...t, used: false } : t
      );
      const newSlots = new Array(8).fill(null);

      const allFound = state.puzzle &&
        newFound.length >= state.puzzle.possibleWords.length;

      return {
        ...state,
        phase: allFound ? 'complete' : 'word_correct',
        foundWords: newFound,
        wordTiles: newTiles,
        buildSlots: newSlots,
        score: state.score + points,
        wordScore: state.wordScore + points,
      };
    }

    case GAME_ACTIONS.WORD_REJECTED:
      return { ...state, phase: 'word_wrong' };

    case GAME_ACTIONS.WORD_DUPLICATE:
      return { ...state, phase: 'word_duplicate' };

    case GAME_ACTIONS.CLEAR_BUILD_SLOTS: {
      const usedIds = state.buildSlots.filter(Boolean).map(s => s.id);
      const newTiles = state.wordTiles.map(t =>
        usedIds.includes(t.id) ? { ...t, used: false } : t
      );
      return { ...state, wordTiles: newTiles, buildSlots: new Array(8).fill(null) };
    }

    case GAME_ACTIONS.TOGGLE_TILE: {
      const { tileId } = action.payload;
      const tile = state.wordTiles.find(t => t.id === tileId);
      if (!tile) return state;
      const w1 = state.puzzle?.word1?.toLowerCase() || '';
      const w2 = state.puzzle?.word2?.toLowerCase() || '';
      const isCommon = w1.includes(tile.letter) && w2.includes(tile.letter);
      const newTiles = state.wordTiles.map(t =>
        t.id === tileId
          ? isCommon
            ? { ...t, selected: !t.selected, wrong: false }
            : { ...t, wrong: true, selected: false }
          : t
      );
      return { ...state, wordTiles: newTiles };
    }

    case GAME_ACTIONS.CLEAR_TILE_WRONG: {
      const { tileId } = action.payload;
      return {
        ...state,
        wordTiles: state.wordTiles.map(t =>
          t.id === tileId ? { ...t, wrong: false } : t
        ),
      };
    }

    case GAME_ACTIONS.START_BUILDING: {
      // Deduplicate by letter — each common letter appears once
      const seen = new Set();
      const selectedTiles = state.wordTiles
        .filter(t => t.selected)
        .filter(t => { if (seen.has(t.letter)) return false; seen.add(t.letter); return true; })
        .map(t => ({ ...t, used: false, selected: false }));
      return {
        ...state,
        phase: 'word_building',
        wordTiles: selectedTiles,
        buildSlots: new Array(8).fill(null),
      };
    }

    case GAME_ACTIONS.USE_HINT:
      return { ...state, hintsUsed: state.hintsUsed + 1 };

    case GAME_ACTIONS.SET_SPELLING_SLOTS:
      return { ...state, spellingSlots: action.payload };

    case GAME_ACTIONS.TIMER_TICK: {
      const newSeconds = Math.max(0, state.secondsLeft - 1);
      if (newSeconds === 0) {
        return { ...state, secondsLeft: 0, phase: 'complete' };
      }
      return { ...state, secondsLeft: newSeconds };
    }

    case GAME_ACTIONS.COMPLETE_PUZZLE: {
      const { timeTaken } = action.payload;
      return { ...state, phase: 'complete', timeTaken };
    }

    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────────────────────────
const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);

  // Submit spelling for the current target word
  const submitSpelling = useCallback((targetWord) => {
    const typed = state.spellingSlots.join('').toLowerCase();
    const correct = targetWord.toLowerCase();

    if (typed === correct) {
      const points = state.spellingAttempts === 0
        ? SPELL_SCORE_FIRST_TRY
        : SPELL_SCORE_WITH_HINT;
      dispatch({
        type: GAME_ACTIONS.SPELLING_CORRECT,
        payload: { wordNum: state.spellingTarget, points },
      });
    } else {
      dispatch({ type: GAME_ACTIONS.SPELLING_WRONG });
    }
  }, [state.spellingSlots, state.spellingTarget, state.spellingAttempts]);

  // Submit a word in the word-building phase
  const submitWord = useCallback(() => {
    const word = state.buildSlots
      .filter(Boolean)
      .map(s => s.letter)
      .join('');

    if (word.length < 2) return;

    const wordLower = word.toLowerCase();

    if (state.foundWords.includes(wordLower)) {
      dispatch({ type: GAME_ACTIONS.WORD_DUPLICATE });
      return;
    }

    const commonLetters = state.puzzle?.commonLetters || [];
    if (!isValidWord(wordLower) || !isWordFromCommonLetters(wordLower, commonLetters)) {
      dispatch({ type: GAME_ACTIONS.WORD_REJECTED });
      return;
    }

    const points = wordLower.length * WORD_SCORE_PER_LETTER;
    dispatch({ type: GAME_ACTIONS.WORD_ACCEPTED, payload: { word: wordLower, points } });
  }, [state.buildSlots, state.foundWords, state.puzzle]);

  return (
    <GameContext.Provider value={{ state, dispatch, submitSpelling, submitWord }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within a GameProvider');
  return ctx;
}
