/**
 * authService.js
 * Wraps Firebase Auth operations with input validation and friendly errors.
 * Works whether FIREBASE_ENABLED is true or false (falls back to guest mode).
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, FIREBASE_ENABLED } from '../config/firebase';

// ── Validation helpers ─────────────────────────────────────────────────────────

/** Returns null if valid, or a human-readable error string. */
export function validateEmail(email) {
  if (!email || !email.trim()) return 'Email is required.';
  // RFC-compliant-ish regex — good enough for UX
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!re.test(email.trim())) return 'Please enter a valid email address.';
  return null;
}

export function validatePassword(password) {
  if (!password) return 'Password is required.';
  if (password.length < 6) return 'Password must be at least 6 characters.';
  return null;
}

export function validateDisplayName(name) {
  if (!name || !name.trim()) return 'Name is required.';
  if (name.trim().length < 2) return 'Name must be at least 2 characters.';
  // Prevent script injection in display names
  if (/<[^>]*>/.test(name)) return 'Name contains invalid characters.';
  return null;
}

// ── Firebase error → friendly message ─────────────────────────────────────────
function friendlyError(code) {
  const map = {
    'auth/email-already-in-use':    'That email is already registered. Try logging in.',
    'auth/invalid-email':           'Please enter a valid email address.',
    'auth/user-not-found':          'No account found with that email.',
    'auth/wrong-password':          'Incorrect password. Please try again.',
    'auth/too-many-requests':       'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed':  'No internet connection. Check your network and retry.',
    'auth/weak-password':           'Choose a stronger password (at least 6 characters).',
    'auth/user-disabled':           'This account has been disabled.',
    'auth/popup-closed-by-user':    'Sign-in was cancelled.',
    'auth/cancelled-popup-request': 'Sign-in was cancelled.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

// ── Register ───────────────────────────────────────────────────────────────────
/**
 * Creates a new account.
 * @returns {{ user, error }}  exactly one of these will be set.
 */
export async function registerWithEmail(email, password, displayName) {
  // Client-side validation first
  const emailErr = validateEmail(email);
  if (emailErr) return { user: null, error: emailErr };

  const passErr = validatePassword(password);
  if (passErr) return { user: null, error: passErr };

  const nameErr = validateDisplayName(displayName);
  if (nameErr) return { user: null, error: nameErr };

  if (!FIREBASE_ENABLED) {
    return { user: null, error: 'Firebase is not configured yet. Ask the developer to add the Firebase config.' };
  }

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password,
    );
    // Set the display name on the Firebase user profile
    await updateProfile(credential.user, {
      displayName: displayName.trim(),
    });
    return { user: credential.user, error: null };
  } catch (e) {
    return { user: null, error: friendlyError(e.code) };
  }
}

// ── Login ──────────────────────────────────────────────────────────────────────
/**
 * Signs in an existing account.
 * @returns {{ user, error }}
 */
export async function loginWithEmail(email, password) {
  const emailErr = validateEmail(email);
  if (emailErr) return { user: null, error: emailErr };

  if (!password) return { user: null, error: 'Password is required.' };

  if (!FIREBASE_ENABLED) {
    return { user: null, error: 'Firebase is not configured yet.' };
  }

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password,
    );
    return { user: credential.user, error: null };
  } catch (e) {
    return { user: null, error: friendlyError(e.code) };
  }
}

// ── Google Sign-In ─────────────────────────────────────────────────────────────
/**
 * Signs in with a Google ID token (obtained via expo-auth-session).
 * @param {string} idToken  — from Google OAuth flow
 * @returns {{ user, error }}
 */
export async function loginWithGoogleToken(idToken, accessToken) {
  if (!FIREBASE_ENABLED) {
    return { user: null, error: 'Firebase is not configured yet.' };
  }

  try {
    const googleCredential = GoogleAuthProvider.credential(idToken ?? null, accessToken ?? null);
    const credential = await signInWithCredential(auth, googleCredential);
    return { user: credential.user, error: null };
  } catch (e) {
    return { user: null, error: friendlyError(e.code) };
  }
}

// ── Password reset ─────────────────────────────────────────────────────────────
export async function sendPasswordReset(email) {
  const emailErr = validateEmail(email);
  if (emailErr) return { error: emailErr };

  if (!FIREBASE_ENABLED) return { error: 'Firebase is not configured yet.' };

  try {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
    return { error: null };
  } catch (e) {
    return { error: friendlyError(e.code) };
  }
}

// ── Logout ─────────────────────────────────────────────────────────────────────
export async function logout() {
  if (!FIREBASE_ENABLED || !auth) return;
  try {
    await signOut(auth);
  } catch { /* ignore */ }
}

// ── Auth state listener ────────────────────────────────────────────────────────
/**
 * Subscribes to auth state changes.
 * @param {Function} callback  — called with Firebase User or null
 * @returns unsubscribe function
 */
export function onAuthChange(callback) {
  if (!FIREBASE_ENABLED || !auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}
