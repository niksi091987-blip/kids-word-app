import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  TextInput, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withSequence, withTiming,
  withDelay, withRepeat, Easing,
} from 'react-native-reanimated';

import { useUser } from '../context/UserContext';
import { CHARACTERS, AVATAR_COLORS, ACCESSORIES, getCharacter, getAccessory } from '../constants/avatarData';

const { width: SW } = Dimensions.get('window');

// ── Avatar Preview ─────────────────────────────────────────────────────────────
function AvatarPreview({ character, color, accessory, name }) {
  const sc     = useSharedValue(1);
  const bounceY = useSharedValue(0);
  const accessoryBounce = useSharedValue(0);
  const sparkleOp = useSharedValue(0);

  const char = getCharacter(character);
  const acc  = getAccessory(accessory);

  // Pop animation when character/color/accessory changes
  useEffect(() => {
    sc.value = withSequence(
      withSpring(1.15, { damping: 4, stiffness: 300 }),
      withSpring(1,    { damping: 8, stiffness: 200 }),
    );
    sparkleOp.value = withSequence(
      withTiming(1, { duration: 120 }),
      withDelay(400, withTiming(0, { duration: 300 })),
    );
  }, [character, color, accessory]);

  // Idle bob
  useEffect(() => {
    bounceY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0,  { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ), -1, true,
    );
    accessoryBounce.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(0,  { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      ), -1, true,
    );
  }, []);

  const circleAnim  = useAnimatedStyle(() => ({
    transform: [{ scale: sc.value }, { translateY: bounceY.value }],
  }));
  const accessoryAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: accessoryBounce.value }],
  }));
  const sparkleAnim = useAnimatedStyle(() => ({ opacity: sparkleOp.value }));

  return (
    <View style={pv.container}>
      {/* Sparkle flash */}
      <Animated.Text style={[pv.sparkleL, sparkleAnim]}>✨</Animated.Text>
      <Animated.Text style={[pv.sparkleR, sparkleAnim]}>⭐</Animated.Text>

      {/* Accessory above circle */}
      {acc.id !== 'none' && (
        <Animated.Text style={[pv.accessoryTop, accessoryAnim]}>
          {acc.emoji}
        </Animated.Text>
      )}

      {/* Main character circle */}
      <Animated.View style={circleAnim}>
        <View style={[pv.circle, { backgroundColor: color, shadowColor: color }]}>
          {/* Inner glow ring */}
          <View style={[pv.innerRing, { borderColor: 'rgba(255,255,255,0.4)' }]} />
          <Text style={pv.charEmoji}>{char.emoji}</Text>
        </View>
      </Animated.View>

      {/* Name tag */}
      <View style={pv.nameTag}>
        <Text style={pv.nameText} numberOfLines={1}>
          {name.trim() || char.name}
        </Text>
      </View>
    </View>
  );
}

// ── Selector Row helpers ───────────────────────────────────────────────────────
function CharCell({ char, selected, onPress }) {
  const sc = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
  return (
    <Pressable
      onPress={() => { sc.value = withSequence(withSpring(0.88), withSpring(1)); onPress(); }}
    >
      <Animated.View style={[cc.cell, selected && cc.selected, anim]}>
        <Text style={cc.emoji}>{char.emoji}</Text>
        <Text style={[cc.label, selected && cc.labelSelected]}>{char.name}</Text>
      </Animated.View>
    </Pressable>
  );
}

function ColorDot({ color, selected, onPress }) {
  const sc = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
  return (
    <Pressable onPress={() => { sc.value = withSequence(withSpring(0.80), withSpring(1.15), withSpring(1)); onPress(); }}>
      <Animated.View style={[cd.dot, { backgroundColor: color, borderWidth: selected ? 3 : 0, borderColor: '#fff', shadowColor: color, shadowOpacity: selected ? 0.7 : 0.3 }, anim]} />
    </Pressable>
  );
}

function AccCell({ acc, selected, onPress }) {
  const sc = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
  return (
    <Pressable onPress={() => { sc.value = withSequence(withSpring(0.85), withSpring(1.1), withSpring(1)); onPress(); }}>
      <Animated.View style={[ac.cell, selected && ac.selected, anim]}>
        <Text style={ac.emoji}>{acc.id === 'none' ? '✕' : acc.emoji}</Text>
        <Text style={[ac.label, selected && ac.labelSelected]}>{acc.label}</Text>
      </Animated.View>
    </Pressable>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────────
function SectionHead({ emoji, title }) {
  return (
    <View style={sh.row}>
      <Text style={sh.emoji}>{emoji}</Text>
      <Text style={sh.title}>{title}</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function AvatarScreen({ navigation }) {
  const { state: user, saveAvatar } = useUser();

  const [character, setCharacter] = useState(user.avatar?.character || 'owl');
  const [color,     setColor]     = useState(user.avatar?.color     || '#FF9A3C');
  const [accessory, setAccessory] = useState(user.avatar?.accessory || 'cap');
  const [name,      setName]      = useState(user.name === 'Friend' ? '' : (user.name || ''));

  const btnPulse = useSharedValue(1);
  const slideUp  = useSharedValue(80);
  const inputRef = useRef(null);

  useEffect(() => {
    slideUp.value = withDelay(200, withSpring(0, { damping: 12, stiffness: 80 }));
    btnPulse.value = withDelay(1000, withRepeat(
      withSequence(
        withSpring(1.04, { damping: 5, stiffness: 120 }),
        withSpring(1,    { damping: 5 }),
      ), -1, true,
    ));
  }, []);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideUp.value }],
    opacity: Math.max(0, 1 - slideUp.value / 80),
  }));
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnPulse.value }],
  }));

  const handleDone = () => {
    saveAvatar({
      name,
      avatar: { character, color, accessory },
    });
    // If opened mid-game (navigated from Game/Home), go back instead of resetting to Home
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('Home');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#1565C0', '#1E88E5', '#42A5F5', '#7EC8F0']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={s.safe}>
        {/* Header */}
        <View style={s.header}>
          {/* Back button — only shown when navigated here mid-game */}
          {navigation.canGoBack() && (
            <Pressable
              onPress={() => navigation.goBack()}
              style={s.backBtn}
              hitSlop={12}
            >
              <Text style={s.backBtnText}>✕</Text>
            </Pressable>
          )}
          <Text style={s.headerTitle}>
            {navigation.canGoBack() ? 'Change Your Character!' : 'Create Your Character!'}
          </Text>
          <Text style={s.headerSub}>Make it uniquely yours 🎨</Text>
        </View>

        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[{ width: '100%', alignItems: 'center' }, slideStyle]}>

            {/* ── Avatar Preview ── */}
            <AvatarPreview
              character={character}
              color={color}
              accessory={accessory}
              name={name}
            />

            {/* ── Character picker ── */}
            <View style={s.card}>
              <SectionHead emoji="🐾" title="Choose Your Character" />
              <View style={s.charGrid}>
                {CHARACTERS.map(char => (
                  <CharCell
                    key={char.id}
                    char={char}
                    selected={character === char.id}
                    onPress={() => setCharacter(char.id)}
                  />
                ))}
              </View>
            </View>

            {/* ── Color picker ── */}
            <View style={s.card}>
              <SectionHead emoji="🎨" title="Pick a Color" />
              <View style={s.colorRow}>
                {AVATAR_COLORS.map(c => (
                  <ColorDot
                    key={c.id}
                    color={c.value}
                    selected={color === c.value}
                    onPress={() => setColor(c.value)}
                  />
                ))}
              </View>
            </View>

            {/* ── Accessory picker ── */}
            <View style={s.card}>
              <SectionHead emoji="✨" title="Add an Accessory" />
              <View style={s.accRow}>
                {ACCESSORIES.map(acc => (
                  <AccCell
                    key={acc.id}
                    acc={acc}
                    selected={accessory === acc.id}
                    onPress={() => setAccessory(acc.id)}
                  />
                ))}
              </View>
            </View>

            {/* ── Name input ── */}
            <View style={s.card}>
              <SectionHead emoji="📝" title="What's Your Name?" />
              <TextInput
                ref={inputRef}
                style={s.nameInput}
                value={name}
                onChangeText={setName}
                placeholder={getCharacter(character).name}
                placeholderTextColor="#94A3B8"
                maxLength={14}
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => inputRef.current?.blur()}
              />
              <Text style={s.nameHint}>Up to 14 characters</Text>
            </View>

            {/* ── Let's Play button ── */}
            <Animated.View style={[s.btnWrap, btnStyle]}>
              <View style={s.btnShadow} />
              <Pressable
                onPress={handleDone}
                style={({ pressed }) => [s.doneBtn, pressed && { opacity: 0.9 }]}
              >
                <Text style={s.doneBtnText}>Let's Play! 🚀</Text>
              </Pressable>
            </Animated.View>

          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const pv = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: 20, height: 180, justifyContent: 'flex-end' },
  accessoryTop: { fontSize: 36, marginBottom: 2, zIndex: 2 },
  circle: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.85)',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.55, shadowRadius: 16, elevation: 14,
  },
  innerRing: {
    position: 'absolute', width: 104, height: 104, borderRadius: 52,
    borderWidth: 2,
  },
  charEmoji:  { fontSize: 58 },
  nameTag: {
    marginTop: 10, backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 6,
    shadowColor: '#0D47A1', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 6, elevation: 4,
    minWidth: 100, alignItems: 'center',
  },
  nameText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 17, color: '#1565C0' },
  sparkleL: { position: 'absolute', left: SW * 0.22, top: 10, fontSize: 22 },
  sparkleR: { position: 'absolute', right: SW * 0.22, top: 20, fontSize: 18 },
});

const cc = StyleSheet.create({
  cell: {
    width: 72, height: 80, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 3,
    backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 2, borderColor: 'transparent',
  },
  selected: { backgroundColor: 'rgba(255,255,255,0.95)', borderColor: 'rgba(255,255,255,0.95)' },
  emoji: { fontSize: 32 },
  label: { fontFamily: 'Nunito_700Bold', fontSize: 9, color: 'rgba(255,255,255,0.80)', letterSpacing: 0.3 },
  labelSelected: { color: '#1565C0' },
});

const cd = StyleSheet.create({
  dot: {
    width: 46, height: 46, borderRadius: 23,
    shadowOffset: { width: 0, height: 3 }, shadowRadius: 6, elevation: 5,
  },
});

const ac = StyleSheet.create({
  cell: {
    width: 54, height: 62, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 2,
    backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 2, borderColor: 'transparent',
  },
  selected: { backgroundColor: 'rgba(255,255,255,0.95)', borderColor: 'rgba(255,255,255,0.95)' },
  emoji: { fontSize: 26 },
  label: { fontFamily: 'Nunito_700Bold', fontSize: 8, color: 'rgba(255,255,255,0.80)', letterSpacing: 0.3 },
  labelSelected: { color: '#1565C0' },
});

const sh = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  emoji: { fontSize: 20 },
  title: { fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: '#fff', letterSpacing: 0.3 },
});

const s = StyleSheet.create({
  safe:   { flex: 1 },
  header: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  backBtn: {
    position: 'absolute', top: 8, right: 16,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: '#fff' },
  headerTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 26, color: '#fff', letterSpacing: 0.5, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  headerSub:   { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  scroll: { paddingHorizontal: 18, paddingBottom: 40, paddingTop: 8, alignItems: 'center', gap: 14 },

  card: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 22, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },

  charGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  colorRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  accRow:   { flexDirection: 'row', justifyContent: 'space-between' },

  nameInput: {
    backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 16,
    paddingHorizontal: 18, paddingVertical: 14,
    fontFamily: 'Nunito_700Bold', fontSize: 20, color: '#1E3A5F',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
  },
  nameHint: { fontFamily: 'Nunito_600SemiBold', fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 6, marginLeft: 4 },

  btnWrap:   { width: '100%', marginTop: 6 },
  btnShadow: { position: 'absolute', bottom: -5, left: 5, right: -5, height: 56, borderRadius: 28, backgroundColor: '#C2410C' },
  doneBtn: {
    backgroundColor: '#F97316', borderRadius: 28, paddingVertical: 18,
    alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#F97316', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 18, elevation: 14,
  },
  doneBtnText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 24, color: '#fff', letterSpacing: 3, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
});
