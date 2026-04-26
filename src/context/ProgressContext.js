import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOTAL_LEVELS, PROGRESS_KEY_GUEST, PROGRESS_KEY_GOOGLE, STORAGE_KEY } from '../constants/config';
import { useUser } from './UserContext';
import {
  saveProgressToCloud,
  loadProgressFromCloud,
  mergeProgress,
} from '../services/progressService';

// ── Initial State ──────────────────────────────────────────────────────────────
function buildInitialLevels() {
  const levels = {};
  for (let i = 1; i <= TOTAL_LEVELS; i++) {
    levels[i] = { unlocked: i <= 1, bestStars: 0, bestScore: 0, attempts: 0 };
  }
  return levels;
}

const initialProgressState = {
  _loaded: false,
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
  unlockedStickers: [],
};

// ── Action Types ───────────────────────────────────────────────────────────────
export const PROGRESS_ACTIONS = {
  COMPLETE_LEVEL:   'COMPLETE_LEVEL',
  UNLOCK_LEVEL:     'UNLOCK_LEVEL',
  TOGGLE_SOUND:     'TOGGLE_SOUND',
  TOGGLE_HAPTICS:   'TOGGLE_HAPTICS',
  LOAD_SAVED:       'LOAD_SAVED',
  MERGE_FROM_GUEST: 'MERGE_FROM_GUEST',
  RESET_ALL:        'RESET_ALL',
  ADD_BADGE:        'ADD_BADGE',
  UPDATE_STREAK:    'UPDATE_STREAK',
  ADD_WORDS_FOUND:  'ADD_WORDS_FOUND',
  RECORD_PAIR:      'RECORD_PAIR',
  UNLOCK_STICKER:   'UNLOCK_STICKER',
};

// ── Reducer ────────────────────────────────────────────────────────────────────
function progressReducer(state, action) {
  switch (action.type) {
    case PROGRESS_ACTIONS.LOAD_SAVED: {
      const saved = action.payload;
      if (!saved) return { ...state, _loaded: true };
      return {
        ...initialProgressState,
        ...saved,
        _loaded: true,
        levels: { ...buildInitialLevels(), ...(saved.levels || {}) },
      };
    }

    case PROGRESS_ACTIONS.MERGE_FROM_GUEST: {
      // Merge guest progress into current Google progress — best scores win
      const { guestProgress } = action.payload;
      if (!guestProgress) return state;
      const mergedLevels = { ...state.levels };
      for (const [k, gd] of Object.entries(guestProgress.levels || {})) {
        const ex = mergedLevels[k] || { unlocked: false, bestStars: 0, bestScore: 0, attempts: 0 };
        mergedLevels[k] = {
          ...ex,
          unlocked:   ex.unlocked || gd.unlocked,
          bestStars:  Math.max(ex.bestStars,  gd.bestStars  || 0),
          bestScore:  Math.max(ex.bestScore,  gd.bestScore  || 0),
          attempts:   ex.attempts + (gd.attempts || 0),
        };
      }
      return {
        ...state,
        levels:          mergedLevels,
        totalScore:      Math.max(state.totalScore,      guestProgress.totalScore      || 0),
        totalWordsFound: state.totalWordsFound +         (guestProgress.totalWordsFound || 0),
        dailyStreak:     Math.max(state.dailyStreak,     guestProgress.dailyStreak     || 0),
        currentLevel:    Math.max(state.currentLevel,    guestProgress.currentLevel    || 1),
      };
    }

    case PROGRESS_ACTIONS.COMPLETE_LEVEL: {
      const { level, stars, score } = action.payload;
      const existing = state.levels[level] || { unlocked: true, bestStars: 0, bestScore: 0, attempts: 0 };
      const newLevels = {
        ...state.levels,
        [level]: {
          ...existing,
          bestStars:  Math.max(existing.bestStars, stars),
          bestScore:  Math.max(existing.bestScore, score),
          attempts:   existing.attempts + 1,
        },
      };
      if (stars > 0 && level < TOTAL_LEVELS) {
        newLevels[level + 1] = {
          ...(newLevels[level + 1] || { bestStars: 0, bestScore: 0, attempts: 0 }),
          unlocked: true,
        };
      }
      return {
        ...state,
        levels: newLevels,
        totalScore:   state.totalScore + score,
        currentLevel: Math.max(state.currentLevel, stars > 0 ? Math.min(level + 1, TOTAL_LEVELS) : level),
      };
    }

    case PROGRESS_ACTIONS.UNLOCK_LEVEL: {
      const { level } = action.payload;
      if (!state.levels[level]) return state;
      return {
        ...state,
        levels: { ...state.levels, [level]: { ...state.levels[level], unlocked: true } },
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
      if (last === date) return state;
      let newStreak = 1;
      if (last) {
        const diffDays = Math.round((new Date(date) - new Date(last)) / 86400000);
        if (diffDays === 1) newStreak = state.dailyStreak + 1;
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
      return { ...state, usedPairs: updated.length > 500 ? updated.slice(-400) : updated };
    }

    case PROGRESS_ACTIONS.UNLOCK_STICKER: {
      const { level } = action.payload;
      if ((state.unlockedStickers || []).includes(level)) return state;
      return { ...state, unlockedStickers: [...(state.unlockedStickers || []), level] };
    }

    case PROGRESS_ACTIONS.RESET_ALL:
      return { ...initialProgressState, _loaded: true };

    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────────────────────────
const ProgressContext = createContext(null);

export function ProgressProvider({ children }) {
  const [state, dispatch] = useReducer(progressReducer, initialProgressState);
  const { state: user } = useUser();

  // Compute the current storage key based on user identity
  // Firebase users (email or google) are keyed by UID for cross-device persistence
  const isFirebaseUser = user.loaded && user.isLoggedIn && user.uid;
  const storageKey = user.loaded && user.isLoggedIn
    ? (user.uid ? `${PROGRESS_KEY_GOOGLE}${user.uid}` : PROGRESS_KEY_GUEST)
    : null;

  const storageKeyRef = useRef(storageKey);
  storageKeyRef.current = storageKey;
  const userUidRef = useRef(user.uid);
  userUidRef.current = user.uid;

  // Load progress whenever user identity is established or changes
  useEffect(() => {
    if (!storageKey) return;

    (async () => {
      // 1. Load local AsyncStorage copy first (fast)
      let localProgress = null;
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw) localProgress = JSON.parse(raw);
      } catch { /* ignore */ }

      // 2. Load cloud copy if user is logged in via Firebase
      let cloudProgress = null;
      if (isFirebaseUser) {
        cloudProgress = await loadProgressFromCloud(user.uid);
      }

      // 3. Merge: cloud + local (best scores win)
      const merged = mergeProgress(localProgress, cloudProgress);
      dispatch({ type: PROGRESS_ACTIONS.LOAD_SAVED, payload: merged });

      // 4. If Google/email user, also absorb any old guest progress
      if (isFirebaseUser) {
        try {
          const guestRaw = await AsyncStorage.getItem(PROGRESS_KEY_GUEST);
          if (guestRaw) {
            const guestParsed = JSON.parse(guestRaw);
            dispatch({ type: PROGRESS_ACTIONS.MERGE_FROM_GUEST, payload: { guestProgress: guestParsed } });
          }
        } catch { /* ignore */ }
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Debounced save — writes to both AsyncStorage (local) and Firestore (cloud)
  useEffect(() => {
    if (!storageKeyRef.current || !state._loaded) return;
    const { _loaded, ...toSave } = state;
    const timeout = setTimeout(() => {
      // Always save locally
      AsyncStorage.setItem(storageKeyRef.current, JSON.stringify(toSave)).catch(() => {});
      // Save to cloud if user has a Firebase UID
      if (userUidRef.current) {
        saveProgressToCloud(userUidRef.current, toSave).catch(() => {});
      }
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
