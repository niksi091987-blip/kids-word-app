import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withRepeat, withSequence,
  withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

import { useUser } from '../context/UserContext';
import { GOOGLE_CONFIG, GOOGLE_AUTH_ENABLED } from '../config/googleAuth';
import { auth } from '../config/firebase';

WebBrowser.maybeCompleteAuthSession();

const { width: SW } = Dimensions.get('window');

const STARS = Array.from({ length: 22 }, (_, i) => ({
  x: (i * 137.5) % 100, y: (i * 61.8) % 80,
  size: 2 + (i % 3) * 1.5, delay: (i * 280) % 2500, dur: 1100 + (i % 5) * 400,
}));

// ── Native-only child — keeps useAuthRequest off the web render path ─────────────
// Platform.OS is a constant so this is either always or never rendered per platform,
// satisfying React's rules of hooks.
function NativeGoogleAuth({ onPromptReady, onSuccess, onFallback }) {
  const [, response, promptAsync] = Google.useAuthRequest(GOOGLE_CONFIG);

  useEffect(() => {
    onPromptReady(promptAsync);
  }, [promptAsync]);

  useEffect(() => {
    if (response?.type !== 'success') return;
    const { idToken, accessToken } = response.authentication ?? {};
    if (idToken || accessToken) {
      onSuccess(idToken, accessToken);
    } else {
      onFallback();
    }
  }, [response]);

  return null;
}

// ── Decorative sub-components ─────────────────────────────────────────────────────

function Twinkle({ x, y, size, delay, dur }) {
  const op = useSharedValue(0.1);
  useEffect(() => {
    op.value = withDelay(delay, withRepeat(withSequence(
      withTiming(0.9, { duration: dur, easing: Easing.inOut(Easing.ease) }),
      withTiming(0.1, { duration: dur, easing: Easing.inOut(Easing.ease) }),
    ), -1, false));
  }, []);
  const animStyle = useAnimatedStyle(() => ({ opacity: op.value }));
  return (
    <Animated.View style={[{
      position: 'absolute', left: `${x}%`, top: `${y}%`,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: 'rgba(255,255,255,0.95)',
    }, animStyle]} />
  );
}

function Cloud({ top, startX, speed, scale = 1 }) {
  const x = useSharedValue(startX);
  useEffect(() => {
    x.value = withRepeat(withSequence(
      withTiming(SW + 200, { duration: speed, easing: Easing.linear }),
      withTiming(-200, { duration: 0 }),
    ), -1, false);
  }, []);
  const w = 120 * scale, h = 44 * scale;
  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <Animated.View style={[{ position: 'absolute', top }, animStyle]}>
      <View style={{ width: w, height: h, backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: h / 2 }} />
      <View style={{ position: 'absolute', left: w * 0.06, top: -h * 0.45, width: h * 1.1, height: h * 1.1, backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 999 }} />
      <View style={{ position: 'absolute', left: w * 0.35, top: -h * 0.75, width: h * 1.5, height: h * 1.5, backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 999 }} />
      <View style={{ position: 'absolute', left: w * 0.65, top: -h * 0.45, width: h * 1.1, height: h * 1.1, backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 999 }} />
    </Animated.View>
  );
}

function WelcomeOwl() {
  const bodyS  = useSharedValue(0);
  const bounceY = useSharedValue(0);
  const waveR  = useSharedValue(0);
  useEffect(() => {
    bodyS.value  = withDelay(200, withSpring(1, { damping: 6, stiffness: 80 }));
    bounceY.value = withDelay(500, withRepeat(withSequence(
      withTiming(-10, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      withTiming(0,   { duration: 800, easing: Easing.inOut(Easing.ease) }),
    ), -1, true));
    waveR.value  = withDelay(700, withRepeat(withSequence(
      withTiming(28, { duration: 340 }), withTiming(-10, { duration: 300 }),
      withTiming(0,  { duration: 200 }), withTiming(0,   { duration: 1200 }),
    ), -1, false));
  }, []);
  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bodyS.value }, { translateY: bounceY.value }],
  }));
  const waveStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${waveR.value}deg` }],
  }));
  return (
    <Animated.View style={[owl.wrap, bodyStyle]}>
      <LinearGradient colors={['#FF9A3C', '#FF6B35']} style={owl.body}>
        <View style={owl.eyes}>
          <View style={owl.eye}><View style={owl.pupil} /><View style={owl.shine} /></View>
          <View style={owl.eye}><View style={owl.pupil} /><View style={owl.shine} /></View>
        </View>
        <View style={owl.beak} />
        <View style={[owl.cheek, { left: 12, bottom: 26 }]} />
        <View style={[owl.cheek, { right: 12, bottom: 26 }]} />
        <View style={owl.belly} />
      </LinearGradient>
      <Text style={owl.hat}>🎓</Text>
      <Animated.Text style={[owl.wave, waveStyle]}>👋</Animated.Text>
      <Text style={[owl.star, { top: -6, right: 4 }]}>⭐</Text>
      <Text style={[owl.star, { top: 14, left: -10 }]}>✨</Text>
      <View style={owl.bubbleWrap}>
        <View style={owl.bubbleTail} />
        <View style={owl.bubble}>
          <Text style={owl.bubbleText}>Hi! I'm Lexie! 🦉{'\n'}Let's learn words!</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────────

export default function WelcomeScreen({ navigation }) {
  const { state: user, loginAsGuest, loginWithGoogle, syncWithFirebaseUser } = useUser();
  const [loading, setLoading] = useState(false);
  const promptAsyncRef = useRef(() => {});

  // ── Shared values — always declared before any early return ──────────────────
  const btnSlide   = useSharedValue(60);
  const titleSlide = useSharedValue(-40);

  // ── Animated styles — must be called unconditionally before any early return ─
  const titleAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleSlide.value }],
    opacity: Math.max(0, 1 - Math.abs(titleSlide.value) / 40),
  }));
  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: btnSlide.value }],
    opacity: Math.max(0, 1 - btnSlide.value / 60),
  }));

  // ── Effects ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    titleSlide.value = withDelay(300, withSpring(0, { damping: 12, stiffness: 90 }));
    btnSlide.value   = withDelay(550, withSpring(0, { damping: 12, stiffness: 90 }));
  }, []);

  // Auto-redirect when already signed in
  useEffect(() => {
    if (!user.loaded) return;
    if (user.type === 'google' || user.type === 'email') {
      navigation.replace(user.hasCreatedAvatar ? 'Home' : 'Avatar');
    }
  }, [user.loaded, user.type, user.hasCreatedAvatar]);


  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleGoogle = () => {
    if (syncWithFirebaseUser()) return;
    if (!GOOGLE_AUTH_ENABLED) {
      Alert.alert('Coming Soon!', 'Google sign-in will be available soon.');
      return;
    }
    if (Platform.OS === 'web') {
      setLoading(true);
      signInWithPopup(auth, new GoogleAuthProvider())
        .then(() => {
          // onAuthStateChanged in UserContext fires → dispatches LOGIN_GOOGLE → auto-redirect fires
        })
        .catch((e) => {
          setLoading(false);
          if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
            Alert.alert('Sign-in failed', 'Please try again.');
          }
        });
      return;
    }
    promptAsyncRef.current();
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  if (!user.loaded || loading) {
    return (
      <View style={{ flex: 1 }}>
        <LinearGradient colors={['#1565C0', '#1E88E5', '#42A5F5', '#7EC8F0']} style={StyleSheet.absoluteFill} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 64 }}>🍭</Text>
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#1565C0', '#1E88E5', '#42A5F5', '#7EC8F0']} style={StyleSheet.absoluteFill} />
      {STARS.map((st, i) => <Twinkle key={i} {...st} />)}
      <Cloud top={30}  startX={SW * 0.5} speed={22000} scale={1.0} />
      <Cloud top={90}  startX={-150}     speed={31000} scale={0.65} />
      <Cloud top={200} startX={SW * 0.2} speed={37000} scale={0.50} />

      {/* Handles useAuthRequest on native only — never rendered on web */}
      {Platform.OS !== 'web' && (
        <NativeGoogleAuth
          onPromptReady={(fn) => { promptAsyncRef.current = fn; }}
          onSuccess={(idToken, accessToken) => {
            setLoading(true);
            loginWithGoogle(idToken, accessToken).then(({ error }) => {
              setLoading(false);
              if (error) Alert.alert('Sign-in failed', error);
            });
          }}
          onFallback={() => syncWithFirebaseUser()}
        />
      )}

      <SafeAreaView style={s.safe}>
        <View style={s.owlArea}><WelcomeOwl /></View>

        <Animated.View style={[s.titleArea, titleAnimStyle]}>
          <Text style={s.appTitle}>LEXIE'S</Text>
          <Text style={s.appSubtitle}>WORD LAB</Text>
          <Text style={s.tagline}>Spell · Match · Build ✨</Text>
        </Animated.View>

        <Animated.View style={[s.btnArea, btnAnimStyle]}>
          <Pressable
            onPress={handleGoogle}
            style={({ pressed }) => [s.googleBtn, pressed && s.pressed]}
          >
            <View style={s.googleBtnInner}>
              <Text style={s.googleIcon}>G</Text>
              <View>
                <Text style={s.googleBtnText}>Sign in with Google</Text>
                <Text style={s.googleBtnSub}>Save progress across devices</Text>
              </View>
            </View>
          </Pressable>

          <Pressable
            onPress={() => { loginAsGuest(); navigation.replace('Avatar'); }}
            style={({ pressed }) => [s.guestPlayBtn, pressed && s.pressed]}
          >
            <Text style={s.guestPlayIcon}>🎮</Text>
            <View>
              <Text style={s.guestPlayText}>Play as Guest</Text>
              <Text style={s.guestPlaySub}>No account needed</Text>
            </View>
          </Pressable>

          <View style={s.perksRow}>
            {['🏆 Save progress', '🌟 Sync devices', '👨‍👩‍👧 Parent controls'].map(p => (
              <Text key={p} style={s.perkText}>{p}</Text>
            ))}
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const owl = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: 4 },
  body: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#C05621', shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 10, overflow: 'hidden' },
  eyes: { flexDirection: 'row', gap: 12, marginBottom: 5 },
  eye:  { width: 24, height: 24, borderRadius: 12, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  pupil:{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#1A1A2E' },
  shine:{ position: 'absolute', top: 2, left: 3, width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.9)' },
  beak: { width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 14, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#F59E0B' },
  cheek:{ position: 'absolute', width: 18, height: 12, borderRadius: 9, backgroundColor: 'rgba(255,150,80,0.5)' },
  belly:{ position: 'absolute', bottom: 4, width: 56, height: 38, backgroundColor: 'rgba(255,255,255,0.20)', borderTopLeftRadius: 999, borderTopRightRadius: 999 },
  hat:  { position: 'absolute', top: -22, fontSize: 26 },
  wave: { position: 'absolute', right: -26, top: 24, fontSize: 24 },
  star: { position: 'absolute', fontSize: 14 },
  bubbleWrap: { position: 'absolute', left: 90, top: 0, width: 170 },
  bubbleTail: { position: 'absolute', left: -8, top: 18, width: 0, height: 0, borderTopWidth: 8, borderTopColor: 'transparent', borderBottomWidth: 8, borderBottomColor: 'transparent', borderRightWidth: 10, borderRightColor: 'rgba(255,255,255,0.97)' },
  bubble: { backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, shadowColor: '#0D47A1', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 6, elevation: 4 },
  bubbleText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#1565C0', lineHeight: 19 },
});

const s = StyleSheet.create({
  safe:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  owlArea:    { marginBottom: 12 },
  titleArea:  { alignItems: 'center', marginBottom: 32 },
  appTitle:   { fontFamily: 'Nunito_800ExtraBold', fontSize: 44, color: '#fff', letterSpacing: 4, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 6 },
  appSubtitle:{ fontFamily: 'Nunito_800ExtraBold', fontSize: 38, color: '#FFD700', letterSpacing: 3, marginTop: -8, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 6 },
  tagline:    { fontFamily: 'Nunito_600SemiBold', fontSize: 16, color: 'rgba(255,255,255,0.90)', marginTop: 6, letterSpacing: 1 },
  btnArea:    { width: '100%', gap: 14, alignItems: 'center' },
  pressed:    { opacity: 0.85 },

  googleBtn:     { width: '100%', borderRadius: 22, overflow: 'hidden', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 8 },
  googleBtnInner:{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 24, backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 22 },
  googleIcon:    { fontFamily: 'Nunito_800ExtraBold', fontSize: 24, color: '#4285F4', width: 36, height: 36, textAlign: 'center', lineHeight: 36, backgroundColor: 'rgba(66,133,244,0.10)', borderRadius: 18 },
  googleBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 18, color: '#1E3A5F' },
  googleBtnSub:  { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: '#64748B', marginTop: 2 },

  guestPlayBtn:  { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 22, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.40)', backgroundColor: 'rgba(255,255,255,0.10)' },
  guestPlayIcon: { fontSize: 24, width: 36, textAlign: 'center' },
  guestPlayText: { fontFamily: 'Nunito_700Bold', fontSize: 17, color: 'rgba(255,255,255,0.90)' },
  guestPlaySub:  { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: 'rgba(255,255,255,0.60)', marginTop: 2 },

  perksRow:{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 4 },
  perkText:{ fontFamily: 'Nunito_600SemiBold', fontSize: 11, color: 'rgba(255,255,255,0.75)', backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
});
