import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useGame, GAME_ACTIONS } from '../context/GameContext';
import { useProgress, PROGRESS_ACTIONS } from '../context/ProgressContext';
import { useUser } from '../context/UserContext';
import { GUEST_LEVEL_LIMIT } from '../constants/config';
import { useTimer } from '../hooks/useTimer';
import { useSound } from '../hooks/useSound';
import { useSpeech } from '../hooks/useSpeech';
import { generatePuzzle, getStarRating, getSpellingHint } from '../utils/gameLogic';
import { getTimerSeconds, SPELL_SCORE_FIRST_TRY, SPELL_SCORE_WITH_HINT, DIFFICULTY_KEY, DIFFICULTY_MULT } from '../constants/config';
import LexieBadge from '../components/LexieBadge';
import PlayerAvatar from '../components/PlayerAvatar';
import { getWordEmoji, getWordSentence } from '../data/wordEmojis';

import AlphabetPanel from '../components/AlphabetPanel';
import SpellingBoard from '../components/SpellingBoard';
import WordLetterTiles from '../components/WordLetterTiles';
import BuildWordSlots from '../components/BuildWordSlots';
import TimerBar from '../components/TimerBar';
import FoundWordsList from '../components/FoundWordsList';
import GameButton from '../components/GameButton';
import HintBuddy from '../components/HintBuddy';
import BuddyIntroOverlay from '../components/BuddyIntroOverlay';

// ── Theme ──────────────────────────────────────────────────────────────────────
const BG = ['#1565C0', '#1E88E5', '#42A5F5', '#7EC8F0'];

const LEVEL_THEMES = [
  { mascot: '🐱', name: 'Kitty',   color: '#E85D04' },
  { mascot: '🐶', name: 'Puppy',   color: '#2D9CDB' },
  { mascot: '🐰', name: 'Bunny',   color: '#27AE60' },
  { mascot: '🦊', name: 'Foxy',    color: '#F59E0B' },
  { mascot: '🐸', name: 'Froggy',  color: '#8B5CF6' },
  { mascot: '🦉', name: 'Owly',    color: '#0891B2' },
  { mascot: '🐧', name: 'Penny',   color: '#2D9CDB' },
  { mascot: '🦋', name: 'Flutter', color: '#E91E8C' },
  { mascot: '🐬', name: 'Splash',  color: '#0077B6' },
  { mascot: '🦄', name: 'Sparkle', color: '#8B5CF6' },
];

// ── Background components (match HomeScreen) ──────────────────────────────────
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
      position:'absolute', left:`${x}%`, top:`${y}%`,
      width:size, height:size, borderRadius:size/2,
      backgroundColor:'rgba(255,255,255,0.95)',
    }, anim]} />
  );
}

const MASCOT_MESSAGES = {
  spelling_word1:   '🎤 Spell the first picture!',
  spelling_word2:   '🎤 Now spell the second one!',
  common_finding:   '🔍 Tap the letters in BOTH words!',
  word_building:    '🏗️ Now build words with those letters!',
  word_correct:     '🎉 Amazing word!',
  word_wrong:       '🤔 Not quite, try again!',
  word_duplicate:   '😄 Already found that one!',
  wrong_spelling:   '💡 Hint: check the first letter!',
  correct_spelling: '✅ Perfect spelling!',
};

// ── FindTile — common-finding tile with shake on wrong tap ────────────────────
function FindTile({ tile, onPress }) {
  const shake = useSharedValue(0);
  useEffect(() => {
    if (tile.wrong) {
      shake.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10,  { duration: 50 }),
        withTiming(-8,  { duration: 50 }),
        withTiming(8,   { duration: 50 }),
        withTiming(0,   { duration: 50 }),
      );
    }
  }, [tile.wrong]);
  const shakeAnim = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  return (
    <Animated.View style={shakeAnim}>
      <Pressable
        onPress={onPress}
        style={[styles.findTile, tile.selected && styles.findTileSelected, tile.wrong && styles.findTileWrong]}
      >
        <Text style={[styles.findTileLetter, tile.selected && styles.findTileLetterSelected, tile.wrong && styles.findTileLetterWrong]}>
          {tile.letter.toUpperCase()}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function GameScreen({ route, navigation }) {
  const { level = 1, puzzle: replayPuzzle = null, skipIntro = false } = route.params ?? {};
  const { state: game, dispatch, submitSpelling, submitWord } = useGame();
  const { state: progress, dispatch: progressDispatch } = useProgress();
  const { state: user } = useUser();
  const timer = useTimer();
  const { play } = useSound();
  const { speakWord, speakPhonics, speakLetter, stopSpeech } = useSpeech();

  const timerStarted = useRef(false);
  const completionHandled = useRef(false);
  const puzzleStarted = useRef(false);
  const gameRef = useRef(game);
  const countdownSpoken = useRef(new Set());
  const isMountedRef = useRef(true);
  const introPuzzleRef = useRef(null);       // holds puzzle while intro overlay is showing
  const allFoundHandledRef = useRef(false);  // prevents double-fire of celebration
  const prevFoundCountRef = useRef(0);       // tracks last spoken found-count
  const hintTimerRef = useRef(null);         // clears stale phonics timer on rapid hint taps
  const [mascotMsg, setMascotMsg] = useState(MASCOT_MESSAGES.spelling_word1);
  const [spellingPhase, setSpellingPhase] = useState('idle'); // 'idle' | 'wrong' | 'correct'
  const [overlayMounted, setOverlayMounted] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);

  // ── Guest level guard ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (user.type === 'guest' && level > GUEST_LEVEL_LIMIT) {
      navigation.replace('Home');
    }
  }, [user.type, level]);

  // ── Derived ───────────────────────────────────────────────────────────────────
  const isSpellingPhase = game.phase === 'spelling_word1' || game.phase === 'spelling_word2';
  const isCommonFinding = game.phase === 'common_finding';
  const isWordBuilding = game.phase === 'word_building' || game.phase === 'word_correct'
    || game.phase === 'word_wrong' || game.phase === 'word_duplicate';
  const theme = LEVEL_THEMES[(level - 1) % LEVEL_THEMES.length];

  const currentWord = game.puzzle
    ? (game.spellingTarget === 1 ? game.puzzle.word1 : game.puzzle.word2)
    : '';
  const currentEmoji = game.puzzle
    ? getWordEmoji(game.spellingTarget === 1 ? game.puzzle.word1 : game.puzzle.word2)
    : '❓';
  const allSlotsFilled = game.spellingSlots.length > 0 && !game.spellingSlots.includes('');

  const builtWordCount = game.buildSlots.filter(Boolean).length;
  const canSubmitWord = builtWordCount >= 2 && game.phase === 'word_building';

  const commonLetters = game.puzzle ? game.puzzle.commonLetters : [];
  // Only count word1 tiles — word2 is auto-mirrored, so word1 selections == what the kid found
  const word1Selected = game.wordTiles
    .filter(t => t.selected && t.wordSource === 1)
    .map(t => t.letter);
  // Multiset intersection: how many of the required commonLetters have a matching word1 selection
  const foundCommonCount = (() => {
    const pool = [...word1Selected];
    let n = 0;
    for (const l of commonLetters) {
      const idx = pool.indexOf(l);
      if (idx !== -1) { n++; pool.splice(idx, 1); }
    }
    return n;
  })();
  const allCommonLettersFound = commonLetters.length > 0 && foundCommonCount === commonLetters.length;

  const highlightLetter = game.spellingHintActive && game.puzzle
    ? (game.spellingTarget === 1 ? game.puzzle.word1[0] : game.puzzle.word2[0])
    : null;

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; stopSpeech(); };
  }, [stopSpeech]);

  useEffect(() => { gameRef.current = game; });

  // ── Animations ───────────────────────────────────────────────────────────────
  const pictureScale = useSharedValue(0);
  const pictureFloat = useSharedValue(0);
  const pictureWiggle = useSharedValue(0);
  const picturePulse = useSharedValue(1);
  const boardOpacity = useSharedValue(0);
  const scoreGlow = useSharedValue(0.3);
  const star1 = useSharedValue(0);
  const star2 = useSharedValue(0);
  const star3 = useSharedValue(0);
  const goalCardScale = useSharedValue(0);
  const goalCardPulse = useSharedValue(1);

  useEffect(() => {
    scoreGlow.value = withRepeat(withSequence(
      withTiming(1, { duration: 1500 }),
      withTiming(0.3, { duration: 1500 }),
    ), -1, true);
    pictureFloat.value = withRepeat(withSequence(
      withTiming(-8, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
    ), -1, true);
    // Gentle pulse — grows slightly then back
    picturePulse.value = withRepeat(withSequence(
      withTiming(1.10, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      withTiming(1.0,  { duration: 600, easing: Easing.inOut(Easing.ease) }),
      withTiming(1.0,  { duration: 1400 }), // pause between pulses
    ), -1);
    // Playful wiggle every few seconds
    pictureWiggle.value = withRepeat(withSequence(
      withTiming(0,    { duration: 2000 }),  // wait
      withTiming(10,   { duration: 100 }),
      withTiming(-10,  { duration: 100 }),
      withTiming(8,    { duration: 100 }),
      withTiming(-8,   { duration: 100 }),
      withTiming(4,    { duration: 100 }),
      withTiming(0,    { duration: 100 }),
    ), -1);
  }, []);

  const scoreGlowStyle = useAnimatedStyle(() => ({
    opacity: scoreGlow.value,
    transform: [{ scale: 0.98 + scoreGlow.value * 0.04 }],
  }));
  const pictureStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pictureScale.value * picturePulse.value },
      { translateY: pictureFloat.value },
      { rotate: `${pictureWiggle.value}deg` },
    ],
  }));
  const boardStyle = useAnimatedStyle(() => ({ opacity: boardOpacity.value }));
  const goalCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: goalCardScale.value * goalCardPulse.value }],
  }));

  // ── Mount: generate puzzle ────────────────────────────────────────────────────
  useEffect(() => {
    completionHandled.current = false;
    timerStarted.current = false;
    puzzleStarted.current = false;
    allFoundHandledRef.current = false;
    prevFoundCountRef.current = 0;
    dispatch({ type: GAME_ACTIONS.RESET });

    const t = setTimeout(async () => {
      if (!isMountedRef.current) return;
      const puzzle = replayPuzzle || generatePuzzle(level, progress.usedPairs || []);
      if (!replayPuzzle) {
        progressDispatch({ type: PROGRESS_ACTIONS.RECORD_PAIR, payload: { word1: puzzle.word1, word2: puzzle.word2 } });
      }
      const diffStr = (await AsyncStorage.getItem(DIFFICULTY_KEY).catch(() => null)) || 'normal';
      const timerSeconds = Math.round(getTimerSeconds(level) * (DIFFICULTY_MULT[diffStr] ?? 1.0));
      dispatch({ type: GAME_ACTIONS.START_PUZZLE, payload: { puzzle, timerSeconds } });
      puzzleStarted.current = true;

      pictureScale.value = withDelay(200, withSpring(1, { damping: 8, stiffness: 100 }));
      boardOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));

      // Show intro overlay only on first play — skip if coming from Next Level / Play Again
      introPuzzleRef.current = puzzle;
      if (skipIntro || level > 1) {
        // Speak the first word directly without the intro overlay
        setTimeout(() => {
          if (!isMountedRef.current) return;
          speakWord(puzzle.word1);
          setTimeout(() => {
            if (isMountedRef.current) speakWord(getWordSentence(puzzle.word1));
          }, 1400);
        }, 800);
      } else {
        setTimeout(() => {
          if (!isMountedRef.current) return;
          setOverlayMounted(true);
          setTimeout(() => { if (isMountedRef.current) setOverlayVisible(true); }, 80);
        }, 700);
      }
    }, 100);

    return () => { clearTimeout(t); timer.reset(); };
  }, [level]);

  // ── Start timer on word_building phase ───────────────────────────────────────
  useEffect(() => {
    if (game.phase === 'common_finding') {
      setMascotMsg(MASCOT_MESSAGES.common_finding);
      // No speech here — handleCheckSpelling already speaks the transition into this phase
    }
    if (game.phase === 'word_building' && !timerStarted.current) {
      timerStarted.current = true;
      countdownSpoken.current = new Set();
      timer.start();
      setMascotMsg(MASCOT_MESSAGES.word_building);
      // Bounce the goal card in, then start a gentle pulse to attract taps
      goalCardScale.value = withDelay(300, withSpring(1, { damping: 6, stiffness: 120 }));
      goalCardPulse.value = withDelay(1200, withRepeat(withSequence(
        withTiming(1.04, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0,  { duration: 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0,  { duration: 1800 }),
      ), -1));
      setTimeout(() => {
        if (!isMountedRef.current) return;
        const total = game.puzzle?.possibleWords?.length ?? 0;
        speakWord(`Amazing! Find ${total} word${total !== 1 ? 's' : ''}! Go!`);
      }, 500);
    }
  }, [game.phase]);

  // ── Common-finding: auto-advance when all letters found ─────────────────────
  useEffect(() => {
    if (game.phase !== 'common_finding' || !game.puzzle) return;
    if (foundCommonCount === 0) return;
    // Only react when count goes UP (letter added, not deselected)
    if (foundCommonCount <= prevFoundCountRef.current) {
      prevFoundCountRef.current = foundCommonCount;
      return;
    }
    prevFoundCountRef.current = foundCommonCount;

    const remaining = commonLetters.length - foundCommonCount;

    if (remaining === 0 && !allFoundHandledRef.current) {
      // ── ALL LETTERS FOUND ──────────────────────────────────────────────────
      allFoundHandledRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      play('word_correct');
      setMascotMsg('🎉 WOW! You found ALL the letters!');
      speakWord("Yes! You found them all! Let's build words!");
      // Advance after a fixed delay — don't rely on speech onDone which can silently
      // fail on some devices, leaving the game permanently stuck on this screen.
      setTimeout(() => {
        if (isMountedRef.current) dispatch({ type: GAME_ACTIONS.START_BUILDING });
      }, 2800);
    }
  }, [foundCommonCount]); // eslint-disable-line

  // ── Countdown tick sound + speech ────────────────────────────────────────────
  useEffect(() => {
    const s = game.secondsLeft;
    if (!timerStarted.current || s <= 0) return;

    // Tick sound every second; double-tick in last 10s for urgency
    play('timer_tick');
    if (s <= 10) setTimeout(() => play('timer_tick'), 500);

    // Speak number in last 5 seconds
    if (s <= 5 && !countdownSpoken.current.has(s)) {
      countdownSpoken.current.add(s);
      setTimeout(() => speakWord(String(s), { rate: 1.1, pitch: 1.5 }), 300);
    }
  }, [game.secondsLeft]);

  // ── Watch for completion ──────────────────────────────────────────────────────
  useEffect(() => {
    if (game.phase === 'complete' && !completionHandled.current && puzzleStarted.current) {
      handlePuzzleComplete();
    }
  }, [game.phase]);

  // ── Word building phase reactions ─────────────────────────────────────────────
  useEffect(() => {
    if (game.phase === 'word_correct') {
      play('word_correct');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const word = game.foundWords[game.foundWords.length - 1];
      setMascotMsg(MASCOT_MESSAGES.word_correct);
      // Speak the found word, return to building after a fixed delay
      if (word) {
        setTimeout(() => { speakWord(word); }, 150);
        setTimeout(() => {
          if (!completionHandled.current && isMountedRef.current)
            dispatch({ type: GAME_ACTIONS.SET_PHASE, payload: 'word_building' });
        }, 1200);
      } else {
        const t = setTimeout(() => {
          if (!completionHandled.current) dispatch({ type: GAME_ACTIONS.SET_PHASE, payload: 'word_building' });
        }, 900);
        return () => clearTimeout(t);
      }
    }
    if (game.phase === 'word_wrong') {
      play('word_wrong');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setMascotMsg(MASCOT_MESSAGES.word_wrong);
      const t = setTimeout(() => {
        dispatch({ type: GAME_ACTIONS.SET_PHASE, payload: 'word_building' });
        dispatch({ type: GAME_ACTIONS.CLEAR_BUILD_SLOTS });
      }, 700);
      return () => clearTimeout(t);
    }
    if (game.phase === 'word_duplicate') {
      play('word_wrong');
      setMascotMsg(MASCOT_MESSAGES.word_duplicate);
      const t = setTimeout(() => {
        dispatch({ type: GAME_ACTIONS.CLEAR_BUILD_SLOTS });
        dispatch({ type: GAME_ACTIONS.SET_PHASE, payload: 'word_building' });
      }, 700);
      return () => clearTimeout(t);
    }
  }, [game.phase]);

  // ── Puzzle complete ───────────────────────────────────────────────────────────
  const handlePuzzleComplete = useCallback(() => {
    if (completionHandled.current) return;
    completionHandled.current = true;
    timer.pause();
    stopSpeech();

    const currentGame = gameRef.current;
    const timeTaken = (currentGame.totalSeconds || getTimerSeconds(level)) - currentGame.secondsLeft;
    const stars = currentGame.foundWords.length > 0 ? getStarRating(timeTaken, level) : 0;
    const allFound = currentGame.foundWords.length >= (currentGame.puzzle?.possibleWords?.length || 999);
    const timerRanOut = currentGame.secondsLeft === 0 && !allFound;

    const goToWordLearn = () => {
      if (!isMountedRef.current) return;
      play('level_complete');
      progressDispatch({ type: PROGRESS_ACTIONS.COMPLETE_LEVEL, payload: { level, stars, score: currentGame.score } });
      progressDispatch({ type: PROGRESS_ACTIONS.ADD_WORDS_FOUND, payload: { count: currentGame.foundWords.length } });
      navigation.replace('WordLearn', {
        level, stars, score: currentGame.score,
        wordsFound: currentGame.foundWords, timeTaken,
        possibleWords: currentGame.puzzle?.possibleWords || [],
        puzzle: currentGame.puzzle,
        timerRanOut,
        allFound,
      });
    };

    goToWordLearn();
  }, [level, timer, progressDispatch, navigation, play, speakWord]);

  // ── Spelling handlers ─────────────────────────────────────────────────────────
  function handleLetterPress(letter) {
    if (!isSpellingPhase) return;
    dispatch({ type: GAME_ACTIONS.TYPE_LETTER, payload: { letter } });
  }

  function handleBackspace() {
    if (!isSpellingPhase) return;
    dispatch({ type: GAME_ACTIONS.BACKSPACE });
  }

  function handleCheckSpelling() {
    if (!isSpellingPhase || !game.puzzle) return;
    const target = game.spellingTarget === 1 ? game.puzzle.word1 : game.puzzle.word2;
    const typed = game.spellingSlots.join('').toLowerCase();

    if (typed.length < target.length) return;

    // Call context's submitSpelling
    const isCorrect = typed === target.toLowerCase();

    if (isCorrect) {
      play('word_correct');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setSpellingPhase('correct');
      setMascotMsg(MASCOT_MESSAGES.correct_spelling);

      const points = game.spellingAttempts === 0 ? SPELL_SCORE_FIRST_TRY : SPELL_SCORE_WITH_HINT;
      dispatch({ type: GAME_ACTIONS.SPELLING_CORRECT, payload: { wordNum: game.spellingTarget, points } });

      const correctMsg = game.spellingAttempts === 0
        ? 'Hoot hoot!'
        : game.spellingAttempts === 1
          ? 'Yes!'
          : 'You did it!';

      if (game.spellingTarget === 1) {
        speakWord(`${correctMsg} ${target}!`);
        if (game.puzzle) {
          setTimeout(() => {
            if (isMountedRef.current) speakWord(game.puzzle.word2);
          }, 2000);
        }
      } else {
        speakWord(`${correctMsg} Now find the matching letters!`);
      }

      setTimeout(() => {
        if (!isMountedRef.current) return;
        setSpellingPhase('idle');
        dispatch({ type: GAME_ACTIONS.ADVANCE_PHASE });
        if (game.spellingTarget === 1) {
          setMascotMsg(MASCOT_MESSAGES.spelling_word2);
          pictureScale.value = 0;
          pictureScale.value = withDelay(200, withSpring(1, { damping: 8, stiffness: 100 }));
        } else {
          setMascotMsg('🕵️ Find the matching letters!');
        }
      }, 2400);
    } else {
      play('word_wrong');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setSpellingPhase('wrong');
      setMascotMsg(MASCOT_MESSAGES.wrong_spelling);
      dispatch({ type: GAME_ACTIONS.SPELLING_WRONG });

      const attempts = game.spellingAttempts;
      const wrongMsg = attempts === 0
        ? 'Oops! Try again!'
        : attempts === 1
          ? 'Almost! You can do it!'
          : 'So close!';

      speakWord(wrongMsg);
      setTimeout(() => {
        if (isMountedRef.current) {
          setSpellingPhase('idle');
          dispatch({ type: GAME_ACTIONS.CLEAR_SPELLING });
        }
      }, 1800);
    }
  }

  // ── Word building handlers ────────────────────────────────────────────────────
  function handleTileTap(tileId) {
    if (game.phase !== 'word_building') return;
    dispatch({ type: GAME_ACTIONS.PLACE_TILE, payload: { tileId } });
  }

  function handleSlotTap(tileId) {
    if (game.phase !== 'word_building') return;
    dispatch({ type: GAME_ACTIONS.RECALL_TILE, payload: { tileId } });
  }

  function handleSubmitWord() {
    if (game.phase !== 'word_building') return;
    submitWord();
  }

  function handleClear() {
    if (game.phase !== 'word_building') return;
    dispatch({ type: GAME_ACTIONS.CLEAR_BUILD_SLOTS });
  }

  function handleHint() {
    if (!game.puzzle) return;
    dispatch({ type: GAME_ACTIONS.USE_HINT });
    const unsolved = game.puzzle.possibleWords
      .filter(w => !game.foundWords.includes(w.toLowerCase()))
      .sort((a, b) => a.length - b.length);
    if (unsolved.length > 0) {
      const word = unsolved[0];
      setMascotMsg(`💡 Try: ${word[0].toUpperCase()}${'_'.repeat(word.length - 1)} (${word.length} letters)`);
      clearTimeout(hintTimerRef.current);
      stopSpeech();
      speakWord("Listen!");
      hintTimerRef.current = setTimeout(() => speakPhonics(word), 1200);
    }
  }

  function handleSpellingHint() {
    if (!game.puzzle) return;
    dispatch({ type: GAME_ACTIONS.USE_HINT });
    const t = (game.spellingTarget === 1 ? game.puzzle.word1 : game.puzzle.word2).toLowerCase();
    const slots = game.spellingSlots;
    const firstWrongIdx = slots.findIndex((s, i) => s !== '' && s !== t[i]);
    clearTimeout(hintTimerRef.current);
    stopSpeech();
    if (firstWrongIdx !== -1) {
      const corrected = slots.map((s, i) => i >= firstWrongIdx ? '' : s);
      dispatch({ type: GAME_ACTIONS.SET_SPELLING_SLOTS, payload: corrected });
      speakWord("Let me help!");
      hintTimerRef.current = setTimeout(() => speakPhonics(t[firstWrongIdx]), 1200);
    } else {
      const nextIdx = slots.indexOf('');
      if (nextIdx === -1) return;
      speakWord("Next sound!");
      hintTimerRef.current = setTimeout(() => speakPhonics(t[nextIdx]), 1000);
    }
  }

  function handleHearWord() {
    if (!game.puzzle) return;
    const word = game.spellingTarget === 1 ? game.puzzle.word1 : game.puzzle.word2;
    stopSpeech();
    speakWord(word);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  function handleFindTileTap(tile) {
    if (!game.puzzle) return;
    const w1 = game.puzzle.word1.toLowerCase();
    const w2 = game.puzzle.word2.toLowerCase();
    const isCommon = w1.includes(tile.letter) && w2.includes(tile.letter);
    dispatch({ type: GAME_ACTIONS.TOGGLE_TILE, payload: { tileId: tile.id } });
    if (isCommon) {
      const otherSource = tile.wordSource === 1 ? 2 : 1;
      if (!tile.selected) {
        const match = game.wordTiles.find(
          t => t.wordSource === otherSource && t.letter === tile.letter && !t.selected
        );
        if (match) dispatch({ type: GAME_ACTIONS.TOGGLE_TILE, payload: { tileId: match.id } });
      } else {
        const match = game.wordTiles.find(
          t => t.wordSource === otherSource && t.letter === tile.letter && t.selected
        );
        if (match) dispatch({ type: GAME_ACTIONS.TOGGLE_TILE, payload: { tileId: match.id } });
      }
    } else {
      setMascotMsg('❌ Nope! That letter is not in both words!');
      speakWord("Nope! Find one in both words!");
      setTimeout(() => {
        dispatch({ type: GAME_ACTIONS.CLEAR_TILE_WRONG, payload: { tileId: tile.id } });
        setMascotMsg('🕵️ Find the matching letters!');
      }, 1000);
    }
  }

  function handleCheckCommon() {
    const remaining = commonLetters.length - foundCommonCount;
    if (remaining === 0) {
      setMascotMsg('🎉 You got them all!');
      speakWord("You got them all!");
    } else if (remaining === 1) {
      setMascotMsg('🔥 One more letter!');
      speakWord("One more!");
    } else {
      setMascotMsg(`🔍 ${remaining} more to find!`);
      speakWord(`${remaining} more!`);
    }
  }

  // ── BuddyIntroOverlay callbacks ───────────────────────────────────────────────
  function handleBuddyIntroReady() {
    // Called once the overlay entrance animation finishes → speak the intro
    speakWord("Hi! Tap me for help!");
    setTimeout(() => {
      if (isMountedRef.current) setOverlayVisible(false);
    }, 3000);
  }

  function handleBuddyIntroDismissed() {
    // Called once the overlay exit animation finishes → unmount overlay, start word
    setOverlayMounted(false);
    const puzzle = introPuzzleRef.current;
    if (!puzzle || !isMountedRef.current) return;
    speakWord(puzzle.word1);
    setTimeout(() => {
      if (isMountedRef.current) speakWord(getWordSentence(puzzle.word1));
    }, 1400);
  }

  function handlePicturePress() {
    if (!game.puzzle) return;
    const word = game.spellingTarget === 1 ? game.puzzle.word1 : game.puzzle.word2;
    stopSpeech();
    speakWord(word);
    setTimeout(() => speakWord(getWordSentence(word)), 1800);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }

  function handleHome() {
    timer.pause();
    stopSpeech();
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  }

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (!game.puzzle) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={BG} style={StyleSheet.absoluteFill} />
        <View style={styles.loading}>
          <Text style={styles.loadingEmoji}>🎮</Text>
          <Text style={styles.loadingText}>Loading puzzle...</Text>
          <Text style={styles.loadingDots}>✨ ⭐ 🌟</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={BG} style={StyleSheet.absoluteFill} />
      {STAR_DATA.map((st, i) => <Twinkle key={i} {...st} />)}
      <SafeAreaView style={styles.safe}>

        {/* Header */}
        <View style={styles.header}>

          {/* Left: home button + tappable avatar pill */}
          <View style={styles.headerLeft}>
            <Pressable onPress={handleHome} style={styles.headerBtn} hitSlop={10}>
              <Ionicons name="home" size={22} color="#1565C0" />
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('Avatar')}
              hitSlop={8}
              accessibilityLabel="Change avatar"
            >
              <PlayerAvatar variant="hud" />
            </Pressable>
          </View>

          {/* Center: level badge */}
          <View style={styles.headerCenter}>
            <View style={[styles.levelBadge, { borderColor: theme.color, shadowColor: theme.color }]}>
              <Text style={styles.levelBadgeMascot}>{theme.mascot}</Text>
              <Text style={[styles.levelBadgeText, { color: theme.color }]}>LEVEL {level}</Text>
            </View>
          </View>

          {/* Right: score */}
          <Animated.View style={[styles.scoreCard, scoreGlowStyle]}>
            <Text style={styles.scoreText}>⭐ {game.score}</Text>
          </Animated.View>

        </View>

        {/* Mascot speech bubble */}
        <View style={styles.mascotRow}>
          <Text style={styles.mascotEmoji}>{theme.mascot}</Text>
          <View style={[styles.speechBubble, { borderColor: theme.color }]}>
            <Text style={styles.speechText}>{mascotMsg}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          {/* ── SPELLING PHASE ─────────────────────────────────────────────── */}
          {isSpellingPhase && (
            <Animated.View style={[styles.spellingSection, boardStyle]}>
              {/* Word indicator */}
              <View style={styles.wordIndicator}>
                <View style={[styles.wordBadge,
                  game.word1Spelled ? styles.wordBadgeDone : styles.wordBadgeActive,
                ]}>
                  <Text style={styles.wordBadgeText}>WORD 1</Text>
                </View>
                <Text style={styles.wordArrow}>→</Text>
                <View style={[styles.wordBadge,
                  game.word2Spelled ? styles.wordBadgeDone :
                  game.spellingTarget === 2 ? styles.wordBadgeActive : styles.wordBadgeInactive,
                ]}>
                  <Text style={styles.wordBadgeText}>WORD 2</Text>
                </View>
              </View>

              {/* Large picture — tap to hear */}
              <Pressable onPress={handlePicturePress} style={styles.picContainer}>
                <Animated.Text style={[styles.bigEmoji, pictureStyle]}>
                  {currentEmoji}
                </Animated.Text>
                <Text style={styles.tapHint}>👆 Tap to hear!</Text>
              </Pressable>

              {/* Spelling slots */}
              <SpellingBoard
                slots={game.spellingSlots}
                phase={spellingPhase}
                wordLength={currentWord.length}
              />

              {/* Check & Hint buttons */}
              <View style={styles.spellingActions}>
                <HintBuddy onPress={handleSpellingHint} />

                <Pressable onPress={handleHearWord} style={styles.hearBtn}>
                  <Text style={styles.hearBtnText}>🔊 HEAR IT</Text>
                </Pressable>

                <Pressable
                  onPress={handleCheckSpelling}
                  disabled={!allSlotsFilled || spellingPhase === 'correct'}
                  style={[styles.checkBtn, (!allSlotsFilled || spellingPhase === 'correct') && styles.checkBtnDisabled]}
                >
                  <Text style={[styles.checkBtnText, (!allSlotsFilled || spellingPhase === 'correct') && { color: '#94A3B8' }]}>CHECK ✅</Text>
                </Pressable>
              </View>

              {/* Alphabet panel */}
              <View style={styles.alphabetWrapper}>
                <AlphabetPanel
                  onLetterPress={handleLetterPress}
                  onBackspace={handleBackspace}
                  disabled={spellingPhase === 'correct'}
                  highlightLetter={highlightLetter}
                />
              </View>
            </Animated.View>
          )}

          {/* ── COMMON FINDING PHASE ───────────────────────────────────────── */}
          {isCommonFinding && game.puzzle && (
            <Animated.View style={[styles.buildSection, boardStyle]}>
              <View style={styles.instructionCard}>
                <Text style={styles.instructionTitle}>🕵️ Letter Detective!</Text>
                <Text style={styles.instructionText}>
                  Tap the letters that are in{'\n'}
                  <Text style={styles.instructionBold}>BOTH</Text> words! 🎯
                </Text>
              </View>

              <View style={styles.revealedWordsRow}>
                <View style={styles.revealedWordInline}>
                  <Text style={styles.revealedEmoji}>{getWordEmoji(game.puzzle.word1)}</Text>
                  <Text style={styles.revealedText}>{game.puzzle.word1.toUpperCase()}</Text>
                </View>
                <View style={styles.revealedDivider}>
                  <Text style={styles.revealedDividerText}>+</Text>
                </View>
                <View style={styles.revealedWordInline}>
                  <Text style={styles.revealedEmoji}>{getWordEmoji(game.puzzle.word2)}</Text>
                  <Text style={styles.revealedText}>{game.puzzle.word2.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.findingRows}>
                {[game.puzzle.word1, game.puzzle.word2].map((wordLabel, wi) => (
                  <View key={wi} style={styles.findingRow}>
                    <Text style={styles.findingRowEmoji}>{getWordEmoji(wordLabel)}</Text>
                    <View style={styles.findingTiles}>
                      {game.wordTiles.filter(t => t.wordSource === wi + 1).map(tile => (
                        <FindTile
                          key={tile.id}
                          tile={tile}
                          onPress={() => handleFindTileTap(tile)}
                        />
                      ))}
                    </View>
                  </View>
                ))}
              </View>

              {/* Progress dots — one star per common letter occurrence (incl. duplicates) */}
              <View style={styles.commonProgressRow}>
                {commonLetters.map((letter, i) => {
                  // How many times does this letter appear up to and including position i?
                  const occurrenceIndex = commonLetters.slice(0, i + 1).filter(l => l === letter).length;
                  const selectedCount = word1Selected.filter(l => l === letter).length;
                  const found = selectedCount >= occurrenceIndex;
                  return (
                    <View key={i} style={[styles.commonProgressDot, found && styles.commonProgressDotFound]}>
                      <Text style={styles.commonProgressDotText}>{found ? '⭐' : '○'}</Text>
                    </View>
                  );
                })}
                <Text style={styles.commonProgressLabel}>
                  {foundCommonCount}/{commonLetters.length} found
                </Text>
              </View>

              {/* Check button — tap to hear how many letters remain */}
              <Pressable onPress={handleCheckCommon} style={styles.checkCommonBtn}>
                <Text style={styles.checkCommonBtnText}>CHECK 🔍</Text>
              </Pressable>
            </Animated.View>
          )}

          {/* ── WORD BUILDING PHASE ────────────────────────────────────────── */}
          {isWordBuilding && (
            <Animated.View style={[styles.buildSection, boardStyle]}>
              {/* Timer */}
              <TimerBar
                totalSeconds={game.totalSeconds}
                secondsLeft={game.secondsLeft}
              />

              {/* Spelled words revealed */}
              <View style={styles.revealedWordsRow}>
                <View style={styles.revealedWord}>
                  <Text style={styles.revealedLabel}>WORD 1</Text>
                  <Text style={styles.revealedText}>
                    {getWordEmoji(game.puzzle.word1)} {game.puzzle.word1.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.revealedDivider} />
                <View style={styles.revealedWord}>
                  <Text style={styles.revealedLabel}>WORD 2</Text>
                  <Text style={styles.revealedText}>
                    {getWordEmoji(game.puzzle.word2)} {game.puzzle.word2.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Goal card — auto-spoken when phase loads */}
              <Animated.View style={[styles.goalCard, goalCardStyle]}>
                <View style={styles.goalTopRow}>
                  <Text style={styles.goalEmoji}>🎯</Text>
                  <View style={styles.goalTextCol}>
                    <Text style={styles.goalTitle}>
                      Find <Text style={styles.goalCount}>{game.puzzle.possibleWords.length}</Text> word{game.puzzle.possibleWords.length !== 1 ? 's' : ''}!
                    </Text>
                    <Text style={styles.goalFound}>
                      {game.foundWords.length} found so far {game.foundWords.length > 0 ? '🌟' : ''}
                    </Text>
                  </View>
                </View>
                <View style={styles.goalRuleRow}>
                  <Text style={styles.goalRuleText}>
                    💡 Use <Text style={styles.goalRuleHighlight}>any</Text> letters — you don't need them all!
                  </Text>
                </View>
              </Animated.View>

              {/* Common letter tiles */}
              <WordLetterTiles
                label="COMMON LETTERS — tap to use"
                tiles={game.wordTiles}
                onTileTap={handleTileTap}
                disabled={game.phase !== 'word_building'}
              />

              {/* Build slots */}
              <View style={styles.buildSlotsWrapper}>
                <BuildWordSlots
                  slots={game.buildSlots}
                  phase={game.phase}
                  onSlotTap={handleSlotTap}
                />
              </View>

              {/* Action buttons */}
              <View style={styles.buildActions}>
                <HintBuddy onPress={handleHint} />
                <Pressable
                  onPress={handleClear}
                  style={[styles.clearBtn, builtWordCount === 0 && styles.clearBtnDisabled]}
                  disabled={builtWordCount === 0}
                >
                  <Text style={[styles.clearBtnText, builtWordCount === 0 && { color: '#94A3B8' }]}>⌫ CLEAR</Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmitWord}
                  disabled={!canSubmitWord}
                  style={[styles.submitBtn, !canSubmitWord && styles.submitBtnDisabled]}
                >
                  <Text style={[styles.submitBtnText, !canSubmitWord && { color: '#94A3B8' }]}>CHECK ✅</Text>
                </Pressable>
              </View>

              {/* Found words */}
              {game.foundWords.length > 0 && (
                <View style={styles.foundSection}>
                  <Text style={styles.foundTitle}>WORDS YOU FOUND 🎉</Text>
                  <View style={styles.foundChips}>
                    {game.foundWords.map((w, i) => (
                      <View key={i} style={styles.foundChip}>
                        <Text style={styles.foundChipText}>
                          {getWordEmoji(w)} {w.toUpperCase()}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Intro overlay — renders on top of everything when a new puzzle loads */}
      {overlayMounted && (
        <BuddyIntroOverlay
          show={overlayVisible}
          onReady={handleBuddyIntroReady}
          onDismissed={handleBuddyIntroDismissed}
        />
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingEmoji: { fontSize: 72 },
  loadingText: { fontFamily: 'Nunito_700Bold', fontSize: 20, color: '#fff',
    textShadowColor:'rgba(0,0,0,0.2)', textShadowOffset:{width:0,height:1}, textShadowRadius:3 },
  loadingDots: { fontSize: 28, letterSpacing: 8 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.30)',
  },
  headerBtn: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#0D47A1', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerCenter: { flex: 1, alignItems: 'center' },
  levelBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFFFFF', borderWidth: 2, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.30, shadowRadius: 4, elevation: 4,
  },
  levelBadgeMascot: { fontSize: 18 },
  levelBadgeText: {
    fontFamily: 'Nunito_800ExtraBold', fontSize: 15, letterSpacing: 1,
  },
  scoreCard: {
    backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 2, borderColor: '#F59E0B',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
    shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  scoreText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: '#D97706' },

  mascotRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 4, gap: 8,
  },
  mascotEmoji: { fontSize: 36 },
  speechBubble: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.93)',
    borderWidth: 2, borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 8,
    shadowColor: '#0D47A1', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
  },
  speechText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#1E293B' },

  scroll: { paddingBottom: 4 },

  // Spelling phase
  spellingSection: { paddingHorizontal: 12, gap: 4 },
  wordIndicator: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingTop: 4,
  },
  wordBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 2 },
  wordBadgeActive: { borderColor: '#7EC8F0', backgroundColor: 'rgba(45,156,219,0.50)' },
  wordBadgeDone: { borderColor: '#86EFAC', backgroundColor: 'rgba(39,174,96,0.55)' },
  wordBadgeInactive: { borderColor: 'rgba(255,255,255,0.55)', backgroundColor: 'rgba(255,255,255,0.18)' },
  wordBadgeText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 12, color: '#fff', letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.30)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  wordArrow: { color: 'rgba(255,255,255,0.85)', fontSize: 18 },

  picContainer: {
    alignItems: 'center', paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.93)', borderRadius: 20, marginHorizontal: 0,
    shadowColor: '#0D47A1', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  bigEmoji: { fontSize: 80 },
  tapHint: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: '#64748B', marginTop: 4 },

  spellingActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 4, paddingTop: 4, alignItems: 'flex-end' },
  alphabetWrapper: { marginTop: 4 },

  // Build / common phase
  buildSection: { paddingHorizontal: 12, gap: 6 },

  instructionCard: {
    backgroundColor: 'rgba(255,255,255,0.93)', borderRadius: 16, padding: 8, alignItems: 'center', gap: 2,
    shadowColor: '#0D47A1', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 6, elevation: 3,
  },
  instructionTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 18, color: '#1565C0', textAlign: 'center' },
  instructionText: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: '#334155', textAlign: 'center', lineHeight: 20 },
  instructionBold: { fontFamily: 'Nunito_800ExtraBold', color: '#27AE60', fontSize: 16 },

  revealedWordsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.93)', borderRadius: 16, padding: 8,
    shadowColor: '#0D47A1', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 6, elevation: 3,
  },
  revealedWord: { flex: 1, alignItems: 'center', gap: 2 },
  revealedEmoji: { fontSize: 40 },
  revealedWordInline: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  revealedLabel: { fontFamily: 'Nunito_700Bold', fontSize: 10, color: '#64748B', letterSpacing: 2, textAlign: 'center' },
  revealedText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: '#1E293B', textAlign: 'center' },
  revealedDivider: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  revealedDividerText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 24, color: '#F59E0B' },

  findingRows: { gap: 10, width: '100%' },
  findingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  findingRowEmoji: { fontSize: 30 },
  findingRowLabel: { fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: '#FFFFFF', letterSpacing: 1, textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.30)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  findingTiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  findTile: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 2,
    borderColor: '#CBD5E1', backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: 'rgba(0,0,0,0.10)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 3, elevation: 2,
  },
  findTileSelected: {
    borderColor: '#15803D', borderWidth: 3,
    backgroundColor: '#22C55E',
    shadowColor: '#15803D', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.50, shadowRadius: 7, elevation: 7,
  },
  findTileLetter: { fontFamily: 'Nunito_800ExtraBold', fontSize: 20, color: '#0F172A' },
  findTileLetterSelected: { color: '#FFFFFF' },
  findTileWrong: {
    borderColor: '#B91C1C', borderWidth: 3,
    backgroundColor: '#EF4444',
    shadowColor: '#B91C1C', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.50, shadowRadius: 6, elevation: 6,
  },
  findTileLetterWrong: { color: '#FFFFFF' },

  commonProgressRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 10,
  },
  commonProgressDot: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#CBD5E1',
  },
  commonProgressDotFound: {
    backgroundColor: '#FEF9C3', borderColor: '#F59E0B',
  },
  commonProgressDotText: { fontSize: 18 },
  commonProgressLabel: {
    fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#64748B', marginLeft: 4,
  },

  // Goal card — word building phase
  goalCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 18,
    padding: 12,
    gap: 8,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  goalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  goalEmoji: { fontSize: 36 },
  goalTextCol: { flex: 1, gap: 2 },
  goalTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 20,
    color: '#1E293B',
    lineHeight: 24,
  },
  goalCount: {
    color: '#7C3AED',
    fontSize: 24,
  },
  goalFound: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: '#27AE60',
  },
  goalRuleRow: {
    backgroundColor: '#FEF9C3',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  goalRuleText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: '#78350F',
    textAlign: 'center',
  },
  goalRuleHighlight: {
    fontFamily: 'Nunito_800ExtraBold',
    color: '#E85D04',
    fontSize: 14,
  },
  buildSlotsWrapper: { alignItems: 'center' },
  buildActions: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'flex-end', overflow: 'visible' },

  foundSection: { gap: 8 },
  foundTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 12, color: '#fff', letterSpacing: 1, textAlign: 'center',
    textShadowColor:'rgba(0,0,0,0.35)', textShadowOffset:{width:0,height:1}, textShadowRadius:3 },
  foundChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  foundChip: {
    backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#27AE60',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
    shadowColor: '#27AE60', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.20, shadowRadius: 4, elevation: 3,
  },
  foundChipText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: '#166534' },

  hintBtn: {
    backgroundColor: '#F59E0B', borderWidth: 0,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#B45309', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 5, elevation: 5,
  },
  hintBtnText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: '#7C2D12', letterSpacing: 0.5 },
  clearBtn: {
    backgroundColor: '#EF4444', borderWidth: 0,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#B91C1C', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.40, shadowRadius: 5, elevation: 5,
  },
  clearBtnDisabled: { backgroundColor: '#E2E8F0', shadowOpacity: 0, elevation: 0 },
  clearBtnText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: '#FFFFFF' },
  hearBtn: {
    backgroundColor: '#0891B2', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0E7490', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.40, shadowRadius: 5, elevation: 5,
  },
  hearBtnText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: '#fff' },
  checkBtn: {
    flex: 1, backgroundColor: '#7C3AED', borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 10, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#5B21B6', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.40, shadowRadius: 6, elevation: 6,
  },
  checkBtnText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: '#fff', letterSpacing: 1 },
  checkBtnDisabled: { backgroundColor: '#E2E8F0', shadowOpacity: 0, elevation: 0 },
  submitBtn: {
    flex: 1, backgroundColor: '#7C3AED', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#5B21B6', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.40, shadowRadius: 6, elevation: 6,
  },
  submitBtnText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: '#fff', letterSpacing: 1 },
  submitBtnDisabled: { backgroundColor: '#E2E8F0', shadowOpacity: 0, elevation: 0 },
  checkCommonBtn: {
    backgroundColor: '#2D9CDB', borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 12, alignItems: 'center',
    shadowColor: '#1565C0', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.40, shadowRadius: 6, elevation: 6,
    marginTop: 4,
  },
  checkCommonBtnText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: '#fff', letterSpacing: 1 },
});
