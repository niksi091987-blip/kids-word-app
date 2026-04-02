import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEY, TOTAL_LEVELS } from '../constants/config';

// ── Initial State ──────────────────────────────────────────────────────────────
function buildInitialLevels() {
  const levels = {};
  for (let i = 1; i <= TOTAL_LEVELS; i++) {
    levels[i] = {
      unlocked: i <= 1,
      bestStars: 0,
      bestScore: 0,
      attempts: 0,
    };
  }
  return levels;
}

const initialProgressState = {
  levels: buildInitialLevels(),
  totalScore: 0,
  totalWordsFound: 0,
  currentLevel: 1,
  soundEnabled: true,
  hapticsEnabled: true,
  dailyStreak: 0,
  lastPlayedDate: null,
  badges: [],
  usedPairs: [],
};

// ── Action Types ───────────────────────────────────────────────────────────────
export const PROGRESS_ACTIONS = {
  COMPLETE_LEVEL: 'COMPLETE_LEVEL',
  UNLOCK_LEVEL: 'UNLOCK_LEVEL',
  TOGGLE_SOUND: 'TOGGLE_SOUND',
  TOGGLE_HAPTICS: 'TOGGLE_HAPTICS',
  LOAD_SAVED: 'LOAD_SAVED',
  RESET_ALL: 'RESET_ALL',
  ADD_BADGE: 'ADD_BADGE',
  UPDATE_STREAK: 'UPDATE_STREAK',
  ADD_WORDS_FOUND: 'ADD_WORDS_FOUND',
  RECORD_PAIR: 'RECORD_PAIR',
};

// ── Reducer ────────────────────────────────────────────────────────────────────
function progressReducer(state, action) {
  switch (action.type) {
    case PROGRESS_ACTIONS.LOAD_SAVED: {
      const saved = action.payload;
      if (!saved) return state;
      // Merge saved with initial to handle any new fields
      return {
        ...initialProgressState,
        ...saved,
        levels: {
          ...buildInitialLevels(),
          ...(saved.levels || {}),
        },
      };
    }

    case PROGRESS_ACTIONS.COMPLETE_LEVEL: {
      const { level, stars, score } = action.payload;
      const existing = state.levels[level] || { unlocked: true, bestStars: 0, bestScore: 0, attempts: 0 };
      const newBestStars = Math.max(existing.bestStars, stars);
      const newBestScore = Math.max(existing.bestScore, score);

      const newLevels = {
        ...state.levels,
        [level]: {
          ...existing,
          bestStars: newBestStars,
          bestScore: newBestScore,
          attempts: existing.attempts + 1,
        },
      };

      // Unlock next level if stars > 0
      if (stars > 0 && level < TOTAL_LEVELS) {
        newLevels[level + 1] = {
          ...(newLevels[level + 1] || { bestStars: 0, bestScore: 0, attempts: 0 }),
          unlocked: true,
        };
      }

      const newCurrentLevel = Math.max(state.currentLevel, stars > 0 ? Math.min(level + 1, TOTAL_LEVELS) : level);

      return {
        ...state,
        levels: newLevels,
        totalScore: state.totalScore + score,
        currentLevel: newCurrentLevel,
      };
    }

    case PROGRESS_ACTIONS.UNLOCK_LEVEL: {
      const { level } = action.payload;
      if (!state.levels[level]) return state;
      return {
        ...state,
        levels: {
          ...state.levels,
          [level]: { ...state.levels[level], unlocked: true },
        },
      };
    }

    case PROGRESS_ACTIONS.TOGGLE_SOUND:
      return { ...state, soundEnabled: !state.soundEnabled };

    case PROGRESS_ACTIONS.TOGGLE_HAPTICS:
      return { ...state, hapticsEnabled: !state.hapticsEnabled };

    case PROGRESS_ACTIONS.ADD_BADGE: {
      const { badge } = action.payload;
      if (state.badges.includes(badge)) return state;
      return { ...state, badges: [...state.badges, badge] };
    }

    case PROGRESS_ACTIONS.UPDATE_STREAK: {
      const { date } = action.payload;
      const last = state.lastPlayedDate;
      if (last === date) return state; // same day, no change

      let newStreak = 1;
      if (last) {
        const lastDate = new Date(last);
        const today = new Date(date);
        const diffMs = today - lastDate;
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          newStreak = state.dailyStreak + 1;
        }
      }

      return { ...state, dailyStreak: newStreak, lastPlayedDate: date };
    }

    case PROGRESS_ACTIONS.ADD_WORDS_FOUND: {
      const { count } = action.payload;
      return { ...state, totalWordsFound: state.totalWordsFound + count };
    }

    case PROGRESS_ACTIONS.RECORD_PAIR: {
      const { word1, word2 } = action.payload;
      const key = [word1, word2].sort().join('|');
      if (state.usedPairs.includes(key)) return state;
      const updated = [...state.usedPairs, key];
      // Keep at most 500 entries to avoid unbounded growth
      return { ...state, usedPairs: updated.length > 500 ? updated.slice(-400) : updated };
    }

    case PROGRESS_ACTIONS.RESET_ALL:
      return { ...initialProgressState };

    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────────────────────────
const ProgressContext = createContext(null);

export function ProgressProvider({ children }) {
  const [state, dispatch] = useReducer(progressReducer, initialProgressState);

  // Load from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            dispatch({ type: PROGRESS_ACTIONS.LOAD_SAVED, payload: parsed });
          } catch {
            // corrupted data — start fresh
          }
        }
      })
      .catch(() => {});
  }, []);

  // Debounced save on state changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
    }, 500);
    return () => clearTimeout(timeout);
  }, [state]);

  return (
    <ProgressContext.Provider value={{ state, dispatch }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within a ProgressProvider');
  return ctx;
}
