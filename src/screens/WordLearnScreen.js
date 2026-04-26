import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useSpeech } from '../hooks/useSpeech';
import { getWordEmoji } from '../data/wordEmojis';
import { getWordDefinition } from '../data/wordDefinitions';
import { useProgress, PROGRESS_ACTIONS } from '../context/ProgressContext';
import { STICKERS } from '../data/stickerData';

const BG = ['#1565C0', '#1E88E5', '#42A5F5', '#7EC8F0'];
const { width, height: SH } = Dimensions.get('window');

// ── Twinkling star background ──────────────────────────────────────────────────
const STAR_DATA = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 137.5) % 100, y: (i * 61.8) % 75,
  size: 2 + (i % 3) * 1.5, delay: (i * 320) % 2800, dur: 1200 + (i % 5) * 400,
}));
function Twinkle({ x, y, size, delay, dur }) {
  const op = useSharedValue(0.1);
  useEffect(() => {
    op.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.85, { duration: dur, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.1,  { duration: dur, easing: Easing.inOut(Easing.ease) }),
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

// ── Confetti ───────────────────────────────────────────────────────────────────
const CONFETTI_EMOJIS = ['⭐','🌟','✨','🎊','🎉','💫','🎈','🌈'];
const CONFETTI_DATA = Array.from({ length: 24 }, (_, i) => ({
  x: (i * (width / 24)),
  delay: (i * 100) % 700,
  duration: 2200 + (i % 5) * 340,
  emoji: CONFETTI_EMOJIS[i % CONFETTI_EMOJIS.length],
  size: 16 + (i % 4) * 6,
}));

function ConfettiPiece({ x, delay, duration, emoji, size }) {
  const y   = useSharedValue(-70);
  const op  = useSharedValue(0);
  const rot = useSharedValue(0);
  useEffect(() => {
    y.value   = withDelay(delay, withTiming(SH + 70, { duration, easing: Easing.linear }));
    op.value  = withDelay(delay, withSequence(
      withTiming(1, { duration: 250 }),
      withTiming(1, { duration: duration - 450 }),
      withTiming(0, { duration: 200 }),
    ));
    rot.value = withDelay(delay, withRepeat(
      withTiming(360, { duration: 800, easing: Easing.linear }), -1, false,
    ));
    return () => { cancelAnimation(y); cancelAnimation(op); cancelAnimation(rot); };
  }, []);
  const anim = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotate: `${rot.value}deg` }],
    opacity: op.value,
  }));
  return (
    <Animated.Text style={[{ position:'absolute', left:x, top:0, fontSize:size }, anim]}>
      {emoji}
    </Animated.Text>
  );
}

function ConfettiBurst() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {CONFETTI_DATA.map((d, i) => <ConfettiPiece key={i} {...d} />)}
    </View>
  );
}

// ── Sticker Reveal Overlay ─────────────────────────────────────────────────────
function StickerRevealOverlay({ sticker, onDismiss }) {
  const bgOp    = useSharedValue(0);
  const cardSc  = useSharedValue(0);
  const shine   = useSharedValue(0.3);

  useEffect(() => {
    bgOp.value   = withTiming(1, { duration: 350 });
    cardSc.value = withSpring(1, { damping: 5, stiffness: 100 });
    shine.value  = withRepeat(withSequence(
      withTiming(1,   { duration: 500 }),
      withTiming(0.2, { duration: 500 }),
    ), -1, true);
  }, []);

  const bgAnim   = useAnimatedStyle(() => ({ opacity: bgOp.value }));
  const cardAnim = useAnimatedStyle(() => ({ transform: [{ scale: cardSc.value }] }));
  const shineAnim = useAnimatedStyle(() => ({ opacity: shine.value }));

  return (
    <Pressable onPress={onDismiss} style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, st.overlay, bgAnim]}>
        <Animated.View style={cardAnim}>
          <LinearGradient colors={sticker.bg} style={st.card}>
            {/* Sparkles */}
            <Animated.Text style={[st.sparkle, { top:-14, right:-14 }, shineAnim]}>✨</Animated.Text>
            <Animated.Text style={[st.sparkle, { top:-14, left:-14  }, shineAnim]}>⭐</Animated.Text>
            <Animated.Text style={[st.sparkle, { bottom:-14, left:-8 }, shineAnim]}>💫</Animated.Text>

            <Text style={st.newLabel}>🎉 NEW STICKER!</Text>
            <Text style={st.stickerEmoji}>{sticker.emoji}</Text>
            <Text style={st.stickerName}>{sticker.name}</Text>
            <Text style={st.levelTag}>Level {sticker.level}</Text>
            <Text style={st.tapHint}>Tap to continue</Text>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    borderRadius: 30,
    paddingHorizontal: 44,
    paddingVertical: 36,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  sparkle: { position:'absolute', fontSize:26 },
  newLabel: {
    fontFamily: 'Nunito_800ExtraBold', fontSize: 18, color: '#fff',
    textShadowColor:'rgba(0,0,0,0.3)', textShadowOffset:{width:0,height:1}, textShadowRadius:3,
  },
  stickerEmoji: { fontSize: 90 },
  stickerName: {
    fontFamily: 'Nunito_800ExtraBold', fontSize: 26, color: '#fff',
    textShadowColor:'rgba(0,0,0,0.25)', textShadowOffset:{width:0,height:2}, textShadowRadius:4,
  },
  levelTag: {
    fontFamily: 'Nunito_700Bold', fontSize: 14, color: 'rgba(255,255,255,0.80)',
    backgroundColor: 'rgba(0,0,0,0.20)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4,
  },
  tapHint: {
    fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: 'rgba(255,255,255,0.60)',
    marginTop: 4,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function WordLearnScreen({ route, navigation }) {
  const {
    level, stars, score, wordsFound, timeTaken,
    possibleWords, puzzle, timerRanOut, allFound,
  } = route.params;

  const { speakWord, stopSpeech } = useSpeech();
  const { state: progress, dispatch: progressDispatch } = useProgress();
  const isMountedRef = useRef(true);
  const autoAdvanceTimer = useRef(null);

  const words = possibleWords || [];
  const foundSet = new Set((wordsFound || []).map(w => w.toLowerCase()));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [allDone, setAllDone] = useState(false);
  const [showConfetti, setShowConfetti] = useState(stars === 3);
  const [showStickerReveal, setShowStickerReveal] = useState(false);

  const sticker = STICKERS.find(s => s.level === level);
  const isNewSticker = sticker && stars === 3 && !(progress.unlockedStickers || []).includes(level);

  // Animations
  const cardScale   = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const emojiFloat  = useSharedValue(0);
  const emojiScale  = useSharedValue(1);
  const doneScale   = useSharedValue(0);

  useEffect(() => {
    isMountedRef.current = true;
    emojiFloat.value = withRepeat(withSequence(
      withTiming(-10, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      withTiming(0,   { duration: 1400, easing: Easing.inOut(Easing.ease) }),
    ), -1, true);

    // Stop confetti after 4 seconds
    if (stars === 3) {
      const t = setTimeout(() => { if (isMountedRef.current) setShowConfetti(false); }, 4000);
      return () => { isMountedRef.current = false; stopSpeech(); clearTimeout(autoAdvanceTimer.current); clearTimeout(t); };
    }

    return () => {
      isMountedRef.current = false;
      stopSpeech();
      clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  // ── Show & speak the current word ──────────────────────────────────────────
  useEffect(() => {
    if (words.length === 0) { goToResult(); return; }
    clearTimeout(autoAdvanceTimer.current);
    cardScale.value = 0; cardOpacity.value = 0; emojiScale.value = 0;
    cardScale.value   = withDelay(60,  withSpring(1, { damping: 8, stiffness: 110 }));
    cardOpacity.value = withDelay(60,  withTiming(1, { duration: 250 }));
    emojiScale.value  = withDelay(250, withSpring(1, { damping: 7, stiffness: 100 }));
    const word       = words[currentIndex];
    const definition = getWordDefinition(word);
    stopSpeech();
    setTimeout(() => { if (!isMountedRef.current) return; speakWord(word); }, 450);
    if (definition) {
      setTimeout(() => { if (!isMountedRef.current) return; speakWord(definition); }, 450 + 1200);
    }
    const defWords = definition ? definition.split(/\s+/).length : 6;
    const autoDelay = 450 + 1200 + defWords * 420 + 2000;
    autoAdvanceTimer.current = setTimeout(() => { if (!isMountedRef.current) return; advance(); }, autoDelay);
    return () => clearTimeout(autoAdvanceTimer.current);
  }, [currentIndex]); // eslint-disable-line

  function advance() {
    clearTimeout(autoAdvanceTimer.current);
    if (currentIndex < words.length - 1) { setCurrentIndex(i => i + 1); }
    else { markAllDone(); }
  }

  function markAllDone() {
    setAllDone(true);
    stopSpeech();
    doneScale.value = withDelay(isNewSticker ? 3400 : 100, withSpring(1, { damping: 7, stiffness: 100 }));

    if (isNewSticker) {
      // Unlock sticker then show reveal overlay
      progressDispatch({ type: PROGRESS_ACTIONS.UNLOCK_STICKER, payload: { level } });
      speakWord("You unlocked a new sticker!");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTimeout(() => { if (isMountedRef.current) setShowStickerReveal(true); }, 300);
      // After overlay, play the all-done speech
      setTimeout(() => {
        if (isMountedRef.current) speakWord("Amazing! You learned all the words!");
      }, 3600);
    } else {
      setTimeout(() => {
        if (isMountedRef.current) speakWord("Amazing! You learned all the words!");
      }, 300);
    }
  }

  function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    stopSpeech();
    clearTimeout(autoAdvanceTimer.current);
    advance();
  }

  function handleSkipAll() {
    stopSpeech();
    clearTimeout(autoAdvanceTimer.current);
    goToResult();
  }

  function goToResult() {
    if (!isMountedRef.current) return;
    navigation.replace('Result', {
      level, stars, score, wordsFound, timeTaken,
      possibleWords, puzzle, timerRanOut, allFound,
    });
  }

  // Animated styles
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));
  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: emojiFloat.value }, { scale: emojiScale.value }],
  }));
  const doneStyle = useAnimatedStyle(() => ({
    transform: [{ scale: doneScale.value }],
  }));

  if (words.length === 0) return null;

  const currentWord       = words[currentIndex];
  const currentEmoji      = getWordEmoji(currentWord) || '📖';
  const currentDefinition = getWordDefinition(currentWord);
  const wasFound          = foundSet.has(currentWord.toLowerCase());

  return (
    <View style={styles.root}>
      <LinearGradient colors={BG} style={StyleSheet.absoluteFill} />
      {STAR_DATA.map((st, i) => <Twinkle key={i} {...st} />)}

      {/* Confetti — 3 stars only, pointerEvents none so it doesn't block taps */}
      {showConfetti && <ConfettiBurst />}

      <SafeAreaView style={styles.safe}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerOwl}>🦉</Text>
          <View style={styles.headerTextCol}>
            <Text style={styles.headerTitle}>Word Discovery!</Text>
            <Text style={styles.headerSub}>Listen and learn each word</Text>
          </View>
          {stars === 3 && <Text style={styles.starBadge}>⭐⭐⭐</Text>}
        </View>

        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {words.map((_, i) => (
            <View key={i} style={[styles.dot, i < currentIndex && styles.dotDone, i === currentIndex && styles.dotActive]} />
          ))}
        </View>
        <Text style={styles.progressLabel}>
          {allDone ? `All ${words.length} words!` : `${currentIndex + 1} of ${words.length}`}
        </Text>

        {/* ── Word card ─────────────────────────────────────────────────────── */}
        {!allDone && (
          <Animated.View style={[styles.card, cardStyle]}>
            <View style={[styles.badge, wasFound ? styles.badgeFound : styles.badgeNew]}>
              <Text style={styles.badgeText}>{wasFound ? '⭐ YOU FOUND IT!' : '📚 NEW WORD!'}</Text>
            </View>
            <Animated.Text style={[styles.cardEmoji, emojiStyle]}>{currentEmoji}</Animated.Text>
            <Text style={styles.cardWord}>{currentWord.toUpperCase()}</Text>
            <View style={styles.divider} />
            {currentDefinition ? (
              <View style={styles.sentenceBox}>
                <Text style={styles.sentenceOwl}>🦉</Text>
                <Text style={styles.sentenceText}>{currentDefinition}</Text>
              </View>
            ) : null}
          </Animated.View>
        )}

        {/* ── All-done celebration ──────────────────────────────────────────── */}
        {allDone && (
          <Animated.View style={[styles.doneCard, doneStyle]}>
            <Text style={styles.doneEmoji}>🎉</Text>
            <Text style={styles.doneTitle}>Amazing job!</Text>
            <Text style={styles.doneSub}>
              You learned {words.length} word{words.length !== 1 ? 's' : ''}!
            </Text>
            <View style={styles.doneWordChips}>
              {words.map((w, i) => (
                <View key={i} style={[styles.doneChip, foundSet.has(w.toLowerCase()) && styles.doneChipFound]}>
                  <Text style={styles.doneChipEmoji}>{getWordEmoji(w) || '📖'}</Text>
                  <Text style={styles.doneChipWord}>{w.toUpperCase()}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* ── Bottom actions ─────────────────────────────────────────────────── */}
        <View style={styles.bottomRow}>
          {!allDone ? (
            <>
              <Pressable onPress={handleNext} style={styles.nextBtn}>
                <Text style={styles.nextBtnText}>
                  {currentIndex < words.length - 1 ? 'Next ▶' : 'Finish ✓'}
                </Text>
              </Pressable>
              <Pressable onPress={handleSkipAll} style={styles.skipBtn}>
                <Text style={styles.skipBtnText}>Skip All →</Text>
              </Pressable>
            </>
          ) : (
            <Pressable onPress={goToResult} style={styles.resultsBtn}>
              <Text style={styles.resultsBtnText}>See My Results! 🏆</Text>
            </Pressable>
          )}
        </View>

      </SafeAreaView>

      {/* Sticker reveal — on top of everything */}
      {showStickerReveal && sticker && (
        <StickerRevealOverlay
          sticker={sticker}
          onDismiss={() => setShowStickerReveal(false)}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 16 },

  header: { flexDirection:'row', alignItems:'center', paddingTop:8, paddingBottom:12, gap:10 },
  headerOwl: { fontSize: 36 },
  headerTextCol: { flex: 1 },
  headerTitle: {
    fontSize: 22, fontFamily: 'Nunito_800ExtraBold', color: '#fff',
    textShadowColor:'rgba(0,0,0,0.25)', textShadowOffset:{width:0,height:1}, textShadowRadius:4,
  },
  headerSub: { fontSize:13, fontFamily:'Nunito_400Regular', color:'rgba(255,255,255,0.8)', marginTop:1 },
  starBadge: { fontSize:18, letterSpacing:2 },

  dotsRow: { flexDirection:'row', justifyContent:'center', gap:6, marginBottom:4, flexWrap:'wrap' },
  dot: { width:10, height:10, borderRadius:5, backgroundColor:'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor:'#FFD700', width:18, shadowColor:'#FFD700', shadowOpacity:0.8, shadowRadius:4, elevation:4 },
  dotDone: { backgroundColor:'rgba(255,255,255,0.75)' },
  progressLabel: { textAlign:'center', fontSize:13, fontFamily:'Nunito_600SemiBold', color:'rgba(255,255,255,0.7)', marginBottom:12 },

  card: {
    flex:1, backgroundColor:'rgba(255,255,255,0.14)', borderRadius:28, borderWidth:2,
    borderColor:'rgba(255,255,255,0.35)', marginBottom:12, alignItems:'center', justifyContent:'center',
    paddingHorizontal:24, paddingVertical:20, shadowColor:'#000', shadowOpacity:0.2, shadowRadius:16, elevation:8,
  },

  badge: { position:'absolute', top:16, right:16, paddingHorizontal:12, paddingVertical:5, borderRadius:20 },
  badgeFound: { backgroundColor:'#F59E0B' },
  badgeNew:   { backgroundColor:'#8B5CF6' },
  badgeText: { fontSize:12, fontFamily:'Nunito_800ExtraBold', color:'#fff', letterSpacing:0.4 },

  cardEmoji: { fontSize:80, marginBottom:12 },
  cardWord: {
    fontSize:42, fontFamily:'Nunito_800ExtraBold', color:'#fff', letterSpacing:2,
    textShadowColor:'rgba(0,0,0,0.3)', textShadowOffset:{width:0,height:2}, textShadowRadius:6, marginBottom:12,
  },
  divider: { width:'60%', height:2, backgroundColor:'rgba(255,255,255,0.3)', borderRadius:1, marginBottom:14 },
  sentenceBox: {
    flexDirection:'row', alignItems:'flex-start', backgroundColor:'rgba(255,255,255,0.18)',
    borderRadius:16, paddingHorizontal:16, paddingVertical:12, gap:8, maxWidth: width - 96,
  },
  sentenceOwl: { fontSize:20, marginTop:1 },
  sentenceText: { flex:1, fontSize:17, fontFamily:'Nunito_600SemiBold', color:'#fff', lineHeight:24 },

  doneCard: {
    flex:1, backgroundColor:'rgba(255,255,255,0.14)', borderRadius:28, borderWidth:2,
    borderColor:'rgba(255,255,255,0.35)', marginBottom:12, alignItems:'center', justifyContent:'center',
    paddingHorizontal:20, paddingVertical:24,
  },
  doneEmoji: { fontSize:56, marginBottom:8 },
  doneTitle: { fontSize:30, fontFamily:'Nunito_800ExtraBold', color:'#fff', marginBottom:4 },
  doneSub: { fontSize:16, fontFamily:'Nunito_600SemiBold', color:'rgba(255,255,255,0.85)', marginBottom:20 },
  doneWordChips: { flexDirection:'row', flexWrap:'wrap', justifyContent:'center', gap:8 },
  doneChip: {
    flexDirection:'row', alignItems:'center', gap:4, backgroundColor:'rgba(255,255,255,0.2)',
    borderRadius:20, paddingHorizontal:12, paddingVertical:6, borderWidth:1.5, borderColor:'rgba(255,255,255,0.3)',
  },
  doneChipFound: { backgroundColor:'rgba(245,158,11,0.35)', borderColor:'#F59E0B' },
  doneChipEmoji: { fontSize:18 },
  doneChipWord: { fontSize:14, fontFamily:'Nunito_700Bold', color:'#fff' },

  bottomRow: { flexDirection:'row', gap:10, paddingBottom:8, alignItems:'center', justifyContent:'center' },
  nextBtn: {
    flex:1, backgroundColor:'#FFD700', borderRadius:18, paddingVertical:16, alignItems:'center',
    shadowColor:'#FFD700', shadowOpacity:0.5, shadowRadius:8, elevation:5,
  },
  nextBtnText: { fontSize:18, fontFamily:'Nunito_800ExtraBold', color:'#1565C0' },
  skipBtn: {
    backgroundColor:'rgba(255,255,255,0.18)', borderRadius:18, paddingVertical:16, paddingHorizontal:20,
    alignItems:'center', borderWidth:1.5, borderColor:'rgba(255,255,255,0.4)',
  },
  skipBtnText: { fontSize:15, fontFamily:'Nunito_600SemiBold', color:'rgba(255,255,255,0.85)' },
  resultsBtn: {
    flex:1, backgroundColor:'#FFD700', borderRadius:18, paddingVertical:18, alignItems:'center',
    shadowColor:'#FFD700', shadowOpacity:0.6, shadowRadius:10, elevation:6,
  },
  resultsBtnText: { fontSize:20, fontFamily:'Nunito_800ExtraBold', color:'#1565C0' },
});
