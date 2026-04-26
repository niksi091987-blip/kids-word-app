import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, withDelay, withRepeat, withSequence,
  Easing,
} from 'react-native-reanimated';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

import { useUser } from '../context/UserContext';
import { auth, FIREBASE_ENABLED } from '../config/firebase';
import { GOOGLE_CONFIG, GOOGLE_AUTH_ENABLED } from '../config/googleAuth';

// Required for expo-auth-session on web (handles popup redirect back to app)
WebBrowser.maybeCompleteAuthSession({ skipRedirectCheck: true });

const STARS = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 137.5) % 100,
  y: (i * 61.8) % 80,
  size: 2 + (i % 3) * 1.5,
  delay: (i * 280) % 2500,
  dur: 1100 + (i % 5) * 400,
}));

function Star({ x, y, size, delay, dur }) {
  const op = useSharedValue(0.1);
  useEffect(() => {
    op.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.9, { duration: dur, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.1, { duration: dur, easing: Easing.inOut(Easing.ease) }),
      ), -1, false,
    ));
  }, []);
  const anim = useAnimatedStyle(() => ({ opacity: op.value }));
  return (
    <Animated.View style={[{
      position: 'absolute', left: `${x}%`, top: `${y}%`,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: 'rgba(255,255,255,0.95)',
    }, anim]} />
  );
}

export default function LoginScreen({ navigation }) {
  const { state: user, loginAsGuest, loginWithGoogle, syncWithFirebaseUser } = useUser();
  const [loading, setLoading] = useState(false);

  const titleY = useSharedValue(30);
  const titleO = useSharedValue(0);
  useEffect(() => {
    titleY.value = withSpring(0, { damping: 14 });
    titleO.value = withTiming(1, { duration: 600 });
  }, []);
  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleY.value }],
    opacity: titleO.value,
  }));

  // Navigate away when signed in
  useEffect(() => {
    if (user.type === 'google' || user.type === 'email') {
      navigation.replace('Avatar');
    }
  }, [user.type]);

  // expo-auth-session hook — only used on native (iOS/Android)
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(GOOGLE_CONFIG);

  // Native auth response handler
  useEffect(() => {
    if (Platform.OS === 'web') return; // web uses signInWithPopup, not this flow
    if (response?.type === 'success') {
      const idToken = response.params?.id_token ?? response.authentication?.idToken;
      const accessToken = response.authentication?.accessToken ?? response.params?.access_token;
      if (idToken || accessToken) {
        handleNativeGoogleCredential(idToken, accessToken);
      } else {
        if (syncWithFirebaseUser()) {
          navigation.replace('Avatar');
        } else {
          Alert.alert('Sign-in error', 'Could not get your Google credentials. Please try again.');
        }
      }
    } else if (response?.type === 'error') {
      Alert.alert('Sign-in error', response.error?.message || 'Something went wrong. Please try again.');
    }
  }, [response]);

  const handleNativeGoogleCredential = async (idToken, accessToken) => {
    setLoading(true);
    const { error } = await loginWithGoogle(idToken, accessToken);
    setLoading(false);
    if (error) Alert.alert('Google Sign-In Failed', error);
  };

  const handleGoogle = async () => {
    if (syncWithFirebaseUser()) return;

    if (Platform.OS === 'web') {
      // Web: Firebase's own popup — uses Firebase's pre-configured OAuth client,
      // no redirect URI setup needed, no client ID configuration required.
      if (!FIREBASE_ENABLED || !auth) {
        Alert.alert('Not configured', 'Firebase is not set up yet.');
        return;
      }
      setLoading(true);
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        // UserContext's onAuthChange listener handles the state update + navigation
      } catch (e) {
        const ignored = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];
        if (!ignored.includes(e.code)) {
          Alert.alert('Sign-in failed', e.message || 'Something went wrong. Please try again.');
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // Native (requires dev build + iosClientId/androidClientId configured)
    if (!GOOGLE_AUTH_ENABLED) {
      Alert.alert('Coming Soon!', 'Google sign-in will be available in the next update.');
      return;
    }
    if (!request) {
      Alert.alert('Please wait', 'Still loading, try again in a moment.');
      return;
    }
    promptAsync();
  };

  const handleGuest = () => {
    loginAsGuest();
    navigation.replace('Avatar');
  };

  if (loading) {
    return (
      <LinearGradient colors={['#1a0533', '#2d1060', '#1a0533']} style={styles.gradient}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Signing in...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1a0533', '#2d1060', '#1a0533']} style={styles.gradient}>
      {STARS.map((s, i) => <Star key={i} {...s} />)}

      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.titleWrap, titleStyle]}>
          <Text style={styles.emoji}>🍭</Text>
          <Text style={styles.title}>Lexie's Word Lab</Text>
          <Text style={styles.subtitle}>Sign in to save your progress!</Text>
        </Animated.View>

        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.googleBtn, pressed && styles.btnPressed]}
            onPress={handleGoogle}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleText}>Sign in with Google</Text>
          </Pressable>

          <Pressable style={styles.guestBtn} onPress={handleGuest}>
            <Text style={styles.guestText}>Play as Guest (progress not saved online)</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient:    { flex: 1 },
  safe:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontFamily: 'Nunito_600SemiBold', fontSize: 16, color: '#fff' },

  titleWrap: { alignItems: 'center', marginBottom: 32 },
  emoji:     { fontSize: 52, marginBottom: 8 },
  title:     { fontFamily: 'Nunito_800ExtraBold', fontSize: 28, color: '#fff', textAlign: 'center' },
  subtitle:  { fontFamily: 'Nunito_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 6, maxWidth: 280 },

  card: {
    width: '100%', maxWidth: 400,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 24, alignItems: 'center',
  },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 24,
    width: '100%', gap: 10,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 3,
  },
  btnPressed:  { opacity: 0.8, transform: [{ scale: 0.97 }] },
  googleIcon:  { fontFamily: 'Nunito_800ExtraBold', fontSize: 18, color: '#4285F4' },
  googleText:  { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#333' },

  guestBtn:  { alignItems: 'center', marginTop: 20, paddingVertical: 8 },
  guestText: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.45)', textAlign: 'center' },
});
