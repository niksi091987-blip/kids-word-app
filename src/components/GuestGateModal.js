import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, withSequence, withDelay, withRepeat, Easing,
} from 'react-native-reanimated';

// ── Stars earned summary ───────────────────────────────────────────────────────
function StarRow({ levels }) {
  const completed = Object.values(levels).filter(l => l.bestStars > 0).length;
  const total     = Object.values(levels).reduce((s, l) => s + l.bestStars, 0);
  return (
    <View style={sr.row}>
      <View style={sr.chip}>
        <Text style={sr.chipNum}>{completed}</Text>
        <Text style={sr.chipLabel}>Levels{'\n'}Done</Text>
      </View>
      <View style={sr.chip}>
        <Text style={sr.chipNum}>{total}</Text>
        <Text style={sr.chipLabel}>Stars{'\n'}Earned</Text>
      </View>
      <View style={sr.chip}>
        <Text style={sr.chipNum}>5</Text>
        <Text style={sr.chipLabel}>More{'\n'}Levels</Text>
      </View>
    </View>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────────
export default function GuestGateModal({ visible, onClose, onSignedIn, levels = {} }) {
  const backdropOp = useSharedValue(0);
  const cardY      = useSharedValue(300);
  const iconBounce = useSharedValue(0);
  const btnPulse   = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      backdropOp.value = withTiming(1, { duration: 250 });
      cardY.value      = withSpring(0, { damping: 14, stiffness: 120 });
      iconBounce.value = withDelay(400, withRepeat(
        withSequence(
          withTiming(-12, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(0,   { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ), -1, true,
      ));
      btnPulse.value = withDelay(600, withRepeat(
        withSequence(
          withSpring(1.04, { damping: 5, stiffness: 120 }),
          withSpring(1,    { damping: 5 }),
        ), -1, true,
      ));
    } else {
      backdropOp.value = withTiming(0, { duration: 200 });
      cardY.value      = withTiming(300, { duration: 220 });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOp.value }));
  const cardStyle     = useAnimatedStyle(() => ({ transform: [{ translateY: cardY.value }] }));
  const iconStyle     = useAnimatedStyle(() => ({ transform: [{ translateY: iconBounce.value }] }));
  const btnStyle      = useAnimatedStyle(() => ({ transform: [{ scale: btnPulse.value }] }));

  const handleSignIn = () => {
    onClose();
    onSignedIn?.('goToLogin');
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[s.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Card */}
      <View style={s.cardWrap} pointerEvents="box-none">
        <Animated.View style={[s.card, cardStyle]}>
          <LinearGradient colors={['#1565C0', '#1E88E5', '#42A5F5']} style={s.cardBg} />

          <Animated.Text style={[s.lockIcon, iconStyle]}>🔓</Animated.Text>

          <Text style={s.title}>Unlock More Levels!</Text>
          <Text style={s.sub}>You've been amazing as a guest —{'\n'}sign in to keep your stars forever!</Text>

          <StarRow levels={levels} />

          <View style={s.divider} />
          <View style={s.featureRow}>
            {[
              '🏆  Keep progress across devices',
              '🌟  Unlock levels 6 – 10',
              '📊  Track your best scores',
              '🎯  Parent progress reports',
            ].map(f => (
              <Text key={f} style={s.featureText}>{f}</Text>
            ))}
          </View>

          {/* Sign in with Google */}
          <Animated.View style={[s.googleBtnWrap, btnStyle]}>
            <Pressable
              onPress={handleSignIn}
              style={({ pressed }) => [s.googleBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
            >
              <Text style={s.googleG}>G</Text>
              <View>
                <Text style={s.googleBtnText}>Sign in with Google</Text>
                <Text style={s.googleBtnSub}>It's free — takes 10 seconds</Text>
              </View>
            </Pressable>
          </Animated.View>

          <Pressable onPress={onClose} style={s.laterBtn}>
            <Text style={s.laterText}>Maybe later — keep playing as guest</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const sr = StyleSheet.create({
  row:  { flexDirection: 'row', gap: 10, marginVertical: 14 },
  chip: {
    flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  chipNum:   { fontFamily: 'Nunito_800ExtraBold', fontSize: 26, color: '#FFD700' },
  chipLabel: { fontFamily: 'Nunito_700Bold', fontSize: 10, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 14, marginTop: 2 },
});

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  cardWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    overflow: 'hidden',
    paddingHorizontal: 24, paddingTop: 28, paddingBottom: 36,
    alignItems: 'center',
  },
  cardBg: { ...StyleSheet.absoluteFillObject },

  lockIcon: { fontSize: 52, marginBottom: 8 },

  title: {
    fontFamily: 'Nunito_800ExtraBold', fontSize: 26, color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4,
  },
  sub: {
    fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: 'rgba(255,255,255,0.88)',
    textAlign: 'center', marginTop: 6, lineHeight: 21,
  },

  divider: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.20)', marginVertical: 6 },

  featureRow: { width: '100%', gap: 7, marginBottom: 18 },
  featureText: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: 'rgba(255,255,255,0.90)' },

  googleBtnWrap: { width: '100%' },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 22, paddingVertical: 16, paddingHorizontal: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  googleG: {
    fontFamily: 'Nunito_800ExtraBold', fontSize: 20, color: '#4285F4',
    width: 36, height: 36, textAlign: 'center', lineHeight: 36,
    backgroundColor: 'rgba(66,133,244,0.12)', borderRadius: 18,
  },
  googleBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 17, color: '#1E3A5F' },
  googleBtnSub:  { fontFamily: 'Nunito_600SemiBold', fontSize: 11, color: '#64748B', marginTop: 2 },

  laterBtn: { marginTop: 16, paddingVertical: 8 },
  laterText: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: 'rgba(255,255,255,0.65)', textDecorationLine: 'underline' },
});
