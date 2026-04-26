/**
 * Firebase Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO SET UP FIREBASE:
 *
 * 1. Go to https://console.firebase.google.com
 * 2. Click "Add project" → name it (e.g. "Lexies Word Lab")
 * 3. Enable Google Analytics if you want (optional)
 * 4. In the project dashboard click "Web" icon (</>)  to add a web app
 * 5. Register the app (e.g. "word-match-kids") — copy the firebaseConfig object
 *    and paste the values below
 *
 * ENABLE AUTH:
 *   Build → Authentication → Get started
 *   Sign-in method → Enable "Email/Password" and "Google"
 *
 * ENABLE FIRESTORE:
 *   Build → Firestore Database → Create database → Start in production mode
 *   After creation, go to Rules tab and paste these security rules:
 *
 *   rules_version = '2';
 *   service cloud.firestore {
 *     match /databases/{database}/documents {
 *       match /users/{userId}/{document=**} {
 *         allow read, write: if request.auth != null
 *                             && request.auth.uid == userId;
 *       }
 *     }
 *   }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ← PASTE YOUR FIREBASE CONFIG HERE ↓
const firebaseConfig = {
  apiKey:            'AIzaSyCOGbJDMSNn19GvpF3H5oryFs8S_Jk0zAs',
  authDomain:        'lexies-word-lab.firebaseapp.com',
  projectId:         'lexies-word-lab',
  storageBucket:     'lexies-word-lab.firebasestorage.app',
  messagingSenderId: '917952111371',
  appId:             '1:917952111371:web:19feb472bb3bdae29bb80e',
  measurementId:     'G-MHLFCEJZ33',
};

/** True only when the developer has filled in a project ID. */
export const FIREBASE_ENABLED = !!firebaseConfig.projectId;

// Initialise once — guard against HMR double-init in Expo Go
const app = FIREBASE_ENABLED
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp())
  : null;

// Auth initialisation:
//   Web  → getAuth() uses browser localStorage persistence (works with signInWithPopup)
//   Native → initializeAuth with AsyncStorage persistence so sessions survive restarts
let auth = null;
if (FIREBASE_ENABLED) {
  try {
    if (Platform.OS === 'web') {
      auth = getAuth(app);
    } else {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    }
  } catch {
    auth = getAuth(app);
  }
}
export { auth };

// Firestore database
export const db = FIREBASE_ENABLED ? getFirestore(app) : null;

export default app;
