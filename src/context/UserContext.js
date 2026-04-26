import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  registerWithEmail,
  loginWithEmail,
  loginWithGoogleToken,
  logout as firebaseLogout,
  onAuthChange,
} from '../services/authService';
import { saveProfileToCloud } from '../services/progressService';
import { auth, FIREBASE_ENABLED } from '../config/firebase';

const USER_KEY = 'wm_user_v1';

// ── Initial State ──────────────────────────────────────────────────────────────
const initialUserState = {
  loaded: false,
  isLoggedIn: false,
  type: null,               // 'guest' | 'email' | 'google'
  uid: null,                // Firebase UID (null for guests)
  email: null,
  name: 'Friend',
  avatar: {
    character: 'owl',
    color: '#FF9A3C',
    accessory: 'cap',
  },
  hasCreatedAvatar: false,
};

// ── Action Types ───────────────────────────────────────────────────────────────
export const USER_ACTIONS = {
  SET_LOADED:       'SET_LOADED',
  LOGIN_GUEST:      'LOGIN_GUEST',
  LOGIN_EMAIL:      'LOGIN_EMAIL',
  LOGIN_GOOGLE:     'LOGIN_GOOGLE',
  SAVE_AVATAR:      'SAVE_AVATAR',
  LOGOUT:           'LOGOUT',
};

// ── Reducer ────────────────────────────────────────────────────────────────────
function userReducer(state, action) {
  switch (action.type) {
    case USER_ACTIONS.SET_LOADED:
      return { ...initialUserState, loaded: true, ...action.payload };

    case USER_ACTIONS.LOGIN_GUEST:
      return { ...state, isLoggedIn: true, type: 'guest', uid: null, name: 'Friend' };

    case USER_ACTIONS.LOGIN_EMAIL:
      return {
        ...state,
        isLoggedIn: true,
        type: 'email',
        uid:   action.payload.uid,
        email: action.payload.email,
        name:  action.payload.name || action.payload.email?.split('@')[0] || 'Friend',
      };

    case USER_ACTIONS.LOGIN_GOOGLE:
      return {
        ...state,
        isLoggedIn: true,
        type: 'google',
        uid:   action.payload.uid,
        email: action.payload.email,
        name:  action.payload.name || 'Friend',
      };

    case USER_ACTIONS.SAVE_AVATAR:
      return { ...state, hasCreatedAvatar: true, avatar: action.payload.avatar ?? state.avatar, name: action.payload.name ?? state.name };

    case USER_ACTIONS.LOGOUT:
      return { ...initialUserState, loaded: true };

    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────────────────────────
const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [state, dispatch] = useReducer(userReducer, initialUserState);

  // ── 1. Load local snapshot on mount ─────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(USER_KEY).then(raw => {
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          dispatch({ type: USER_ACTIONS.SET_LOADED, payload: saved });
        } catch {
          dispatch({ type: USER_ACTIONS.SET_LOADED, payload: {} });
        }
      } else {
        dispatch({ type: USER_ACTIONS.SET_LOADED, payload: {} });
      }
    });
  }, []);

  // ── 2. Sync Firebase auth state → context ────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      if (!firebaseUser) return;    // signed-out handled by logout()
      // If a Firebase session was restored after app restart, re-hydrate state
      dispatch({
        type: firebaseUser.providerData?.[0]?.providerId === 'google.com'
          ? USER_ACTIONS.LOGIN_GOOGLE
          : USER_ACTIONS.LOGIN_EMAIL,
        payload: {
          uid:   firebaseUser.uid,
          email: firebaseUser.email,
          name:  firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Friend',
        },
      });
    });
    return unsubscribe;
  }, []);

  // ── 3. Persist to AsyncStorage whenever state changes ───────────────────────
  useEffect(() => {
    if (!state.loaded) return;
    const { loaded, ...toSave } = state;
    AsyncStorage.setItem(USER_KEY, JSON.stringify(toSave));
  }, [state]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const loginAsGuest = useCallback(() => {
    dispatch({ type: USER_ACTIONS.LOGIN_GUEST });
  }, []);

  /**
   * Register a new account with email + password.
   * @returns {{ error: string|null }}
   */
  const register = useCallback(async (email, password, displayName) => {
    const { user, error } = await registerWithEmail(email, password, displayName);
    if (error) return { error };
    dispatch({
      type: USER_ACTIONS.LOGIN_EMAIL,
      payload: { uid: user.uid, email: user.email, name: displayName },
    });
    return { error: null };
  }, []);

  /**
   * Sign in with email + password.
   * @returns {{ error: string|null }}
   */
  const loginWithEmailPassword = useCallback(async (email, password) => {
    const { user, error } = await loginWithEmail(email, password);
    if (error) return { error };
    dispatch({
      type: USER_ACTIONS.LOGIN_EMAIL,
      payload: {
        uid:   user.uid,
        email: user.email,
        name:  user.displayName || email.split('@')[0],
      },
    });
    return { error: null };
  }, []);

  /**
   * Sign in with Google (pass the idToken from expo-auth-session).
   * @returns {{ error: string|null }}
   */
  const loginWithGoogle = useCallback(async (idToken, accessToken) => {
    const { user, error } = await loginWithGoogleToken(idToken, accessToken);
    if (error) return { error };
    dispatch({
      type: USER_ACTIONS.LOGIN_GOOGLE,
      payload: {
        uid:   user.uid,
        email: user.email,
        name:  user.displayName || 'Friend',
      },
    });
    return { error: null };
  }, []);

  const syncWithFirebaseUser = useCallback(() => {
    if (!FIREBASE_ENABLED || !auth) return false;
    const fbUser = auth.currentUser;
    if (!fbUser) return false;
    const isGoogle = fbUser.providerData?.[0]?.providerId === 'google.com';
    dispatch({
      type: isGoogle ? USER_ACTIONS.LOGIN_GOOGLE : USER_ACTIONS.LOGIN_EMAIL,
      payload: {
        uid:   fbUser.uid,
        email: fbUser.email,
        name:  fbUser.displayName || 'Friend',
      },
    });
    return true;
  }, []);

  const saveAvatar = useCallback((avatarData) => {
    dispatch({ type: USER_ACTIONS.SAVE_AVATAR, payload: avatarData });
    // Persist avatar to Firestore if logged in
    if (state.uid) {
      saveProfileToCloud(state.uid, avatarData).catch(() => {});
    }
  }, [state.uid]);

  const logout = useCallback(async () => {
    await firebaseLogout();
    await AsyncStorage.removeItem(USER_KEY);
    dispatch({ type: USER_ACTIONS.LOGOUT });
  }, []);

  return (
    <UserContext.Provider value={{
      state,
      dispatch,
      loginAsGuest,
      register,
      loginWithEmailPassword,
      loginWithGoogle,
      syncWithFirebaseUser,
      saveAvatar,
      logout,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within a UserProvider');
  return ctx;
}
