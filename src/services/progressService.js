/**
 * progressService.js
 * Reads and writes game progress to Firestore.
 * All operations are no-ops when FIREBASE_ENABLED is false.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, FIREBASE_ENABLED } from '../config/firebase';

// ── Firestore path helper ─────────────────────────────────────────────────────
const progressRef = (uid) => doc(db, 'users', uid, 'data', 'progress');
const profileRef  = (uid) => doc(db, 'users', uid, 'data', 'profile');

// ── Save progress ─────────────────────────────────────────────────────────────
/**
 * Writes the full progress object to Firestore under users/{uid}/data/progress.
 * Uses setDoc with merge so it never clobbers fields we don't know about.
 */
export async function saveProgressToCloud(uid, progressData) {
  if (!FIREBASE_ENABLED || !db || !uid) return;

  try {
    const { _loaded, ...clean } = progressData;   // strip internal flag
    await setDoc(progressRef(uid), {
      ...clean,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (e) {
    // Non-fatal — local AsyncStorage copy is still the source of truth
    console.warn('[progressService] saveProgressToCloud failed:', e.message);
  }
}

// ── Load progress ─────────────────────────────────────────────────────────────
/**
 * Fetches progress from Firestore.
 * @returns {Object|null}  the saved progress object or null if none exists.
 */
export async function loadProgressFromCloud(uid) {
  if (!FIREBASE_ENABLED || !db || !uid) return null;

  try {
    const snap = await getDoc(progressRef(uid));
    if (snap.exists()) {
      const data = snap.data();
      const { updatedAt, ...rest } = data;   // strip server timestamp
      return rest;
    }
    return null;
  } catch (e) {
    console.warn('[progressService] loadProgressFromCloud failed:', e.message);
    return null;
  }
}

// ── Merge strategy ────────────────────────────────────────────────────────────
/**
 * Takes local (guest) progress and cloud progress, returns the best of each field.
 * "Best" means: highest stars/scores per level, union of badges, highest streak.
 */
export function mergeProgress(local, cloud) {
  if (!cloud) return local;
  if (!local) return cloud;

  const mergedLevels = { ...cloud.levels };
  for (const [k, localLevel] of Object.entries(local.levels || {})) {
    const cloudLevel = mergedLevels[k] || { unlocked: false, bestStars: 0, bestScore: 0, attempts: 0 };
    mergedLevels[k] = {
      ...cloudLevel,
      unlocked:  cloudLevel.unlocked  || localLevel.unlocked,
      bestStars: Math.max(cloudLevel.bestStars  || 0, localLevel.bestStars  || 0),
      bestScore: Math.max(cloudLevel.bestScore  || 0, localLevel.bestScore  || 0),
      attempts:  (cloudLevel.attempts || 0) + (localLevel.attempts || 0),
    };
  }

  const allBadges = Array.from(new Set([
    ...(local.badges  || []),
    ...(cloud.badges  || []),
  ]));

  const allPairs = Array.from(new Set([
    ...(local.usedPairs || []),
    ...(cloud.usedPairs || []),
  ]));

  return {
    ...cloud,
    levels:          mergedLevels,
    totalScore:      Math.max(local.totalScore      || 0, cloud.totalScore      || 0),
    totalWordsFound: (local.totalWordsFound || 0) + (cloud.totalWordsFound || 0),
    dailyStreak:     Math.max(local.dailyStreak     || 0, cloud.dailyStreak     || 0),
    currentLevel:    Math.max(local.currentLevel    || 1, cloud.currentLevel    || 1),
    badges:          allBadges,
    usedPairs:       allPairs.slice(-500),
  };
}

// ── Save profile ──────────────────────────────────────────────────────────────
export async function saveProfileToCloud(uid, profileData) {
  if (!FIREBASE_ENABLED || !db || !uid) return;

  try {
    await setDoc(profileRef(uid), {
      ...profileData,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (e) {
    console.warn('[progressService] saveProfileToCloud failed:', e.message);
  }
}
