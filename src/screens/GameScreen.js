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

import { useGame, GAME_ACTIONS } from '../context/GameContext';
import { useProgress, PROGRESS_ACTIONS } from '../context/ProgressContext';
import { useTimer } from '../hooks/useTimer';
import { useSound } from '../hooks/useSound';
import { useSpeech } from '../hooks/useSpeech';
import { generatePuzzle, getStarRating, getSpellingHint } from '../utils/gameLogic';
import { getTimerSeconds, SPELL_SCORE_FIRST_TRY, SPELL_SCORE_WITH_HINT } from '../constants/config';
import { getWordEmoji, getWordSentence } from '../data/wordEmojis';

import AlphabetPanel from '../components/AlphabetPanel';
import SpellingBoard from '../components/SpellingBoard';
import WordLetterTiles from '../components/WordLetterTiles';
import BuildWordSlots from '../components/BuildWordSlots';
import TimerBar from '../components/TimerBar';
import FoundWordsList from '../components/FoundWordsList';
import GameButton from '../components/GameButton';

// ── Theme ──────────────────────────────────────────────────────────────────────
const BG = ['#0D0B1E', '#1A1035', '#251848'];

const LEVEL_THEMES = [
  { mascot: '🐱', name: 'Kitty',   color: '#FF006E' },
  { mascot: '🐶', name: 'Puppy',   color: '#00D4FF' },
  { mascot: '🐰', name: 'Bunny',   color: '#39FF14' },
  { mascot: '🦊', name: 'Foxy',    color: '#FFD700' },
  { mascot: '🐸', name: 'Froggy',  color: '#BF5AF2' },
  { mascot: '🦉', name: 'Owly',    color: '#00FFDD' },
  { mascot: '🐧', name: 'Penny',   color: '#00D4FF' },
  { mascot: '🦋', name: 'Flutter', color: '#FF006E' },
  { mascot: '🐬', name: 'Splash',  color: '#00D4FF' },
  { mascot: '🦄', name: 'Sparkle', color: '#BF5AF2' },
];

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

// ── Component ─────────────────────────────────────────────────────────────────
export default function GameScreen({ route, navigation }) {
  const { level = 1, puzzle: replayPuzzle = null } = route.params ?? {};
  const { state: game, dispatch, submitSpelling, submitWord } = useGame();
  const { state: progress, dispatch: progressDispatch } = useProgress();
  const timer = useTimer();
  const { play } = useSound();
  const { speakWord, speakPhonics, speakLetter, stopSpeech } = useSpeech();

  const timerStarted = useRef(false);
  const completionHandled = useRef(false);
  const puzzleStarted = useRef(false);
  const gameRef = useRef(game);
  const countdownSpoken = useRef(new Set());
  const isMountedRef = useRef(true);
  const [mascotMsg, setMascotMsg] = useState(MASCOT_MESSAGES.spelling_word1);
  const [spellingPhase, setSpellingPhase] = useState('idle'); // 'idle' | 'wrong' | 'correct'

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

  // Floating background stars
  const bg1Y = useSharedValue(0);
  const bg2Y = useSharedValue(0);
  const bg3Y = useSharedValue(0);

  useEffect(() => {
    bg1Y.value = withRepeat(withSequence(
      withTiming(-12, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
    ), -1, true);
    bg2Y.value = withRepeat(withSequence(
      withTiming(-8, { duration: 3600, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: 3600, easing: Easing.inOut(Easing.ease) }),
    ), -1, true);
    bg3Y.value = withRepeat(withSequence(
      withTiming(-15, { duration: 4200, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: 4200, easing: Easing.inOut(Easing.ease) }),
    ), -1, true);
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

  const bg1Style = useAnimatedStyle(() => ({ transform: [{ translateY: bg1Y.value }] }));
  const bg2Style = useAnimatedStyle(() => ({ transform: [{ translateY: bg2Y.value }] }));
  const bg3Style = useAnimatedStyle(() => ({ transform: [{ translateY: bg3Y.value }] }));
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

  // ── Mount: generate puzzle ────────────────────────────────────────────────────
  useEffect(() => {
    completionHandled.current = false;
    timerStarted.current = false;
    puzzleStarted.current = false;
    dispatch({ type: GAME_ACTIONS.RESET });

    const t = setTimeout(() => {
      if (!isMountedRef.current) return;
      const puzzle = replayPuzzle || generatePuzzle(level);
      const timerSeconds = getTimerSeconds(level);
      dispatch({ type: GAME_ACTIONS.START_PUZZLE, payload: { puzzle, timerSeconds } });
      puzzleStarted.current = true;

      pictureScale.value = withDelay(200, withSpring(1, { damping: 8, stiffness: 100 }));
      boardOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));

      // Speak the first word on load
      setTimeout(() => {
        if (isMountedRef.current && puzzle) { speakWord(puzzle.word1); setTimeout(() => { if (isMountedRef.current) speakWord(getWordSentence(puzzle.word1)); }, 1800); }
      }, 800);
    }, 100);

    return () => { clearTimeout(t); timer.reset(); };
  }, [level]);

  // ── Start timer on word_building phase ───────────────────────────────────────
  useEffect(() => {
    if (game.phase === 'common_finding') {
      setMascotMsg(MASCOT_MESSAGES.common_finding);
    }
    if (game.phase === 'word_building' && !timerStarted.current) {
      timerStarted.current = true;
      countdownSpoken.current = new Set();
      timer.start();
      setMascotMsg(MASCOT_MESSAGES.word_building);
    }
  }, [game.phase]);

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
      // Speak word fully, then return to building after a short pause
      if (word) {
        setTimeout(() => {
          speakWord(word, {
            onDone: () => {
              setTimeout(() => {
                if (!completionHandled.current && isMountedRef.current)
                  dispatch({ type: GAME_ACTIONS.SET_PHASE, payload: 'word_building' });
              }, 350);
            },
          });
        }, 150);
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

    const currentGame = gameRef.current;
    const timeTaken = (currentGame.totalSeconds || getTimerSeconds(level)) - currentGame.secondsLeft;
    const stars = currentGame.foundWords.length > 0 ? getStarRating(timeTaken, level) : 0;
    const allFound = currentGame.foundWords.length >= (currentGame.puzzle?.possibleWords?.length || 999);
    const timerRanOut = currentGame.secondsLeft === 0 && !allFound;

    const goToResult = () => {
      if (!isMountedRef.current) return;
      play('level_complete');
      progressDispatch({ type: PROGRESS_ACTIONS.COMPLETE_LEVEL, payload: { level, stars, score: currentGame.score } });
      progressDispatch({ type: PROGRESS_ACTIONS.ADD_WORDS_FOUND, payload: { count: currentGame.foundWords.length } });
      navigation.replace('Result', {
        level, stars, score: currentGame.score,
        wordsFound: currentGame.foundWords, timeTaken,
        possibleWords: currentGame.puzzle?.possibleWords || [],
        puzzle: currentGame.puzzle,
      });
    };

    if (allFound) {
      speakWord('Amazing! You found all the words! You did great!', {
        onDone: () => setTimeout(goToResult, 500),
      });
    } else if (timerRanOut) {
      speakWord('Time is up! Great try! See how many words you found!', {
        onDone: () => setTimeout(goToResult, 500),
      });
    } else {
      setTimeout(goToResult, 2000);
    }
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
        ? 'Perfect! Well done!'
        : game.spellingAttempts === 1
          ? 'Great job! You got it!'
          : 'Good try! You did it!';

      // Chain: correctMsg → target word → advance phase
      speakWord(correctMsg, {
        onDone: () => {
          setTimeout(() => {
            speakWord(target, {
              onDone: () => {
                setTimeout(() => {
                  if (!isMountedRef.current) return;
                  setSpellingPhase('idle');
                  dispatch({ type: GAME_ACTIONS.ADVANCE_PHASE });

                  if (game.spellingTarget === 1) {
                    setMascotMsg(MASCOT_MESSAGES.spelling_word2);
                    if (game.puzzle) {
                      setTimeout(() => {
                        speakWord(game.puzzle.word2, {
                          onDone: () => {
                            setTimeout(() => speakWord(getWordSentence(game.puzzle.word2)), 400);
                          },
                        });
                      }, 300);
                    }
                  } else if (game.spellingTarget === 1) {
                    // Bounce in the new word 2 emoji
                    pictureScale.value = 0;
                    pictureScale.value = withDelay(200, withSpring(1, { damping: 8, stiffness: 100 }));
                  } else {
                    // Both words done — introduce common letter hunt
                    setMascotMsg('🕵️ Find the matching letters!');
                    setTimeout(() => {
                      speakWord('Amazing! You spelled both words! Now be a letter detective!', {
                        onDone: () => {
                          setTimeout(() => {
                            speakWord('Can you find the letters that are hiding in BOTH words? Tap them!');
                          }, 300);
                        },
                      });
                    }, 400);
                  }
                }, 400);
              },
            });
          }, 300);
        },
      });
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
          ? 'Not quite! You can do it!'
          : 'Keep trying! You are almost there!';

      // Speak wrong message, then reset after it finishes
      speakWord(wrongMsg, {
        onDone: () => {
          setTimeout(() => {
            if (isMountedRef.current) {
              setSpellingPhase('idle');
              dispatch({ type: GAME_ACTIONS.CLEAR_SPELLING });
            }
          }, 400);
        },
      });
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
      setTimeout(() => speakPhonics(unsolved[0]), 100);
      setMascotMsg(`💡 Try: ${unsolved[0][0].toUpperCase()}${'_'.repeat(unsolved[0].length - 1)} (${unsolved[0].length} letters)`);
    }
  }

  function handlePicturePress() {
    if (!game.puzzle) return;
    const word = game.spellingTarget === 1 ? game.puzzle.word1 : game.puzzle.word2;
    speakWord(word);
    setTimeout(() => speakWord(getWordSentence(word)), 1800);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }

  function handleHome() {
    timer.pause();
    stopSpeech();
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  }

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

  const uniqueCommonLetters = game.puzzle ? [...new Set(game.puzzle.commonLetters)] : [];
  const selectedLetters = game.wordTiles.filter(t => t.selected).map(t => t.letter);
  const allCommonLettersFound = uniqueCommonLetters.length > 0 &&
    uniqueCommonLetters.every(letter => selectedLetters.includes(letter));

  const highlightLetter = game.spellingHintActive && game.puzzle
    ? (game.spellingTarget === 1 ? game.puzzle.word1[0] : game.puzzle.word2[0])
    : null;

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (!game.puzzle) {
    return (
      <LinearGradient colors={BG} style={styles.gradient}>
        <View style={styles.loading}>
          <Text style={styles.loadingEmoji}>🎮</Text>
          <Text style={styles.loadingText}>Loading puzzle...</Text>
          <Text style={styles.loadingDots}>✨ ⭐ 🌟</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={BG} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        {/* Floating background decorations */}
        <Animated.Text style={[styles.bgStar, styles.bgStar1, bg1Style]}>⭐</Animated.Text>
        <Animated.Text style={[styles.bgStar, styles.bgStar2, bg2Style]}>✨</Animated.Text>
        <Animated.Text style={[styles.bgStar, styles.bgStar3, bg3Style]}>🌟</Animated.Text>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleHome} style={styles.headerBtn} hitSlop={12}>
            <Ionicons name="home" size={24} color="#00D4FF" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.levelText, { color: theme.color }]}>
              {theme.mascot} LEVEL {level}
            </Text>
          </View>
          <Animated.View style={[styles.scoreCard, scoreGlowStyle, {
            shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8, shadowRadius: 8, elevation: 8,
          }]}>
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
                <Pressable
                  onPress={() => {
                    dispatch({ type: GAME_ACTIONS.USE_HINT });
                    if (!game.puzzle) return;
                    const t = (game.spellingTarget === 1 ? game.puzzle.word1 : game.puzzle.word2).toLowerCase();
                    const slots = game.spellingSlots;

                    // Find first wrong letter
                    const firstWrongIdx = slots.findIndex((s, i) => s !== '' && s !== t[i]);

                    if (firstWrongIdx !== -1) {
                      // Remove wrong letters immediately (visual update)
                      const corrected = slots.map((s, i) => i >= firstWrongIdx ? '' : s);
                      dispatch({ type: GAME_ACTIONS.SET_SPELLING_SLOTS, payload: corrected });
                      // Speak correction fully, then hint correct letter via onDone
                      const wrongLetter = slots[firstWrongIdx].toUpperCase();
                      speakWord(`Oh! ${wrongLetter} is not correct. Let me fix it.`, {
                        onDone: () => {
                          setTimeout(() => {
                            speakPhonics(t[firstWrongIdx]);
                            setTimeout(() => speakWord(`This spot needs the sound ${t[firstWrongIdx]}`), 1200);
                          }, 400);
                        },
                      });
                    } else {
                      // All typed letters are correct — hint the next one
                      const nextIdx = slots.indexOf('');
                      if (nextIdx === -1) return; // all filled and correct
                      speakPhonics(t[nextIdx]);
                      setTimeout(() => speakWord(`Next sound is ${t[nextIdx]}`), 1200);
                    }
                  }}
                  style={styles.hintBtn}
                >
                  <Text style={styles.hintBtnText}>💡 HINT</Text>
                </Pressable>

                <Pressable
                  onPress={handleCheckSpelling}
                  disabled={!allSlotsFilled}
                  style={[styles.checkBtn, !allSlotsFilled && styles.checkBtnDisabled]}
                >
                  <Text style={styles.checkBtnText}>CHECK ✅</Text>
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
                <View style={styles.revealedWord}>
                  <Text style={styles.revealedEmoji}>{getWordEmoji(game.puzzle.word1)}</Text>
                  <Text style={styles.revealedText}>{game.puzzle.word1.toUpperCase()}</Text>
                </View>
                <View style={styles.revealedDivider}>
                  <Text style={styles.revealedDividerText}>+</Text>
                </View>
                <View style={styles.revealedWord}>
                  <Text style={styles.revealedEmoji}>{getWordEmoji(game.puzzle.word2)}</Text>
                  <Text style={styles.revealedText}>{game.puzzle.word2.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.findingRows}>
                {[game.puzzle.word1, game.puzzle.word2].map((wordLabel, wi) => (
                  <View key={wi} style={styles.findingRow}>
                    <Text style={styles.findingRowLabel}>{getWordEmoji(wordLabel)}</Text>
                    <View style={styles.findingTiles}>
                      {game.wordTiles.filter(t => t.wordSource === wi + 1).map(tile => (
                        <Pressable
                          key={tile.id}
                          onPress={() => {
                            const w1 = game.puzzle.word1.toLowerCase();
                            const w2 = game.puzzle.word2.toLowerCase();
                            const isCommon = w1.includes(tile.letter) && w2.includes(tile.letter);
                            dispatch({ type: GAME_ACTIONS.TOGGLE_TILE, payload: { tileId: tile.id } });
                            if (!isCommon) {
                              setMascotMsg('❌ Nope! That letter is not in both words!');
                              speakWord('Oops! That letter is not in both words. Try another one!');
                              setTimeout(() => {
                                dispatch({ type: GAME_ACTIONS.CLEAR_TILE_WRONG, payload: { tileId: tile.id } });
                                setMascotMsg('🕵️ Find the matching letters!');
                              }, 1000);
                            }
                          }}
                          style={[
                            styles.findTile,
                            tile.selected && styles.findTileSelected,
                            tile.wrong && styles.findTileWrong,
                          ]}
                        >
                          <Text style={[
                            styles.findTileLetter,
                            tile.selected && styles.findTileLetterSelected,
                            tile.wrong && styles.findTileLetterWrong,
                          ]}>
                            {tile.letter.toUpperCase()}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={() => {
                  if (!allCommonLettersFound) {
                    const missing = uniqueCommonLetters
                      .filter(letter => !selectedLetters.includes(letter))
                      .map(l => l.toUpperCase())
                      .join(', ');
                    setMascotMsg(`🔍 Keep looking! Find the letter${missing.length > 1 ? 's' : ''}: ${missing}`);
                    speakWord(`Keep looking! You still need to find some matching letters. Can you find them in both words?`);
                    return;
                  }
                  dispatch({ type: GAME_ACTIONS.START_BUILDING });
                }}
                style={styles.startBuildBtn}
              >
                <Text style={styles.startBuildBtnText}>🚀 Let's Build Words!</Text>
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

              {/* Instruction */}
              <View style={styles.instructionCard}>
                <Text style={styles.instructionText}>
                  🔤 Tap the common letters to build new words!
                </Text>
              </View>

              {/* Common letter tiles */}
              <WordLetterTiles
                label="COMMON LETTERS"
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
                <Pressable onPress={handleHint} style={styles.hintBtn}>
                  <Text style={styles.hintBtnText}>💡 HINT</Text>
                </Pressable>
                <Pressable
                  onPress={handleClear}
                  style={styles.clearBtn}
                  disabled={builtWordCount === 0}
                >
                  <Text style={styles.clearBtnText}>⌫ CLEAR</Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmitWord}
                  disabled={!canSubmitWord}
                  style={[styles.submitBtn, !canSubmitWord && styles.submitBtnDisabled]}
                >
                  <Text style={styles.submitBtnText}>CHECK ✅</Text>
                </Pressable>
              </View>

              {/* Found words */}
              <View style={styles.foundSection}>
                <Text style={styles.foundTitle}>
                  WORDS FOUND: {game.foundWords.length}/{game.puzzle?.possibleWords?.length || 0}
                </Text>
                {game.foundWords.length > 0 && (
                  <View style={styles.foundChips}>
                    {game.foundWords.map((w, i) => (
                      <View key={i} style={styles.foundChip}>
                        <Text style={styles.foundChipText}>
                          {getWordEmoji(w)} {w.toUpperCase()}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },

  // Loading
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingEmoji: { fontSize: 72 },
  loadingText: { fontFamily: 'Nunito_700Bold', fontSize: 20, color: '#FFFFFF' },
  loadingDots: { fontSize: 28, letterSpacing: 8 },

  // Background stars
  bgStar: { position: 'absolute', zIndex: 0, opacity: 0.12, fontSize: 28 },
  bgStar1: { top: 80, left: 20 },
  bgStar2: { top: 160, right: 24 },
  bgStar3: { top: 260, left: 60 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(13,11,30,0.7)',
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,212,255,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.30)',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  levelText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    letterSpacing: 1,
  },
  scoreCard: {
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  scoreText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
    color: '#FFD700',
  },

  // Mascot
  mascotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  mascotEmoji: { fontSize: 36 },
  speechBubble: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  speechText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },

  scroll: { paddingBottom: 16 },

  // ── Spelling phase ────────────────────────────────────────────────────────────
  spellingSection: { paddingHorizontal: 12, gap: 8 },

  wordIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  wordBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 2,
  },
  wordBadgeActive: { borderColor: '#00D4FF', backgroundColor: 'rgba(0,212,255,0.2)' },
  wordBadgeDone: { borderColor: '#39FF14', backgroundColor: 'rgba(57,255,20,0.2)' },
  wordBadgeInactive: { borderColor: 'rgba(255,255,255,0.20)', backgroundColor: 'rgba(255,255,255,0.05)' },
  wordBadgeText: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: '#FFFFFF', letterSpacing: 1 },
  wordArrow: { color: 'rgba(255,255,255,0.40)', fontSize: 18 },

  picContainer: { alignItems: 'center', paddingVertical: 8 },
  bigEmoji: { fontSize: 100 },
  tapHint: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 4,
  },

  spellingActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 4,
    paddingTop: 4,
  },

  alphabetWrapper: { marginTop: 4 },

  // ── Word building phase ───────────────────────────────────────────────────────
  buildSection: { paddingHorizontal: 12, gap: 12 },

  instructionCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  instructionTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 18,
    color: '#FFD700',
    textAlign: 'center',
  },
  instructionText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 20,
  },
  instructionBold: {
    fontFamily: 'Nunito_800ExtraBold',
    color: '#39FF14',
    fontSize: 16,
  },

  revealedWordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 12,
  },
  revealedWord: { flex: 1, alignItems: 'center', gap: 2 },
  revealedEmoji: { fontSize: 28 },
  revealedLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.40)',
    letterSpacing: 2,
  },
  revealedText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  revealedDivider: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  revealedDividerText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 24,
    color: '#FFD700',
  },

  findingRows: { gap: 10, width: '100%' },
  findingRow: { gap: 6 },
  findingRowLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.40)',
    letterSpacing: 2,
  },
  findingTiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  findTile: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  findTileSelected: {
    borderColor: '#39FF14',
    backgroundColor: 'rgba(57,255,20,0.20)',
  },
  findTileLetter: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    color: 'rgba(255,255,255,0.60)',
  },
  findTileLetterSelected: { color: '#39FF14' },
  findTileWrong: {
    borderColor: '#FF006E',
    backgroundColor: 'rgba(255,0,110,0.20)',
  },
  findTileLetterWrong: { color: '#FF006E' },
  startBuildBtn: {
    backgroundColor: '#39FF14',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 10,
  },
  startBuildBtnDisabled: { opacity: 0.35 },
  startBuildBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 18,
    color: '#0D0B1E',
    letterSpacing: 2,
  },

  wordTilesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },

  buildSlotsWrapper: { alignItems: 'center' },

  buildActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },

  foundSection: { gap: 8 },
  foundTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.50)',
    letterSpacing: 1,
    textAlign: 'center',
  },
  foundChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  foundChip: {
    backgroundColor: 'rgba(57,255,20,0.15)',
    borderWidth: 1,
    borderColor: '#39FF14',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  foundChipText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: '#39FF14',
  },

  // Shared buttons
  hintBtn: {
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: '#FFD700',
    letterSpacing: 0.5,
  },
  clearBtn: {
    backgroundColor: 'rgba(255,0,110,0.15)',
    borderWidth: 2,
    borderColor: '#FF006E',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: '#FF006E',
  },
  checkBtn: {
    flex: 1,
    backgroundColor: 'rgba(57,255,20,0.20)',
    borderWidth: 2,
    borderColor: '#39FF14',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  checkBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 15,
    color: '#39FF14',
    letterSpacing: 1,
  },
  checkBtnDisabled: {
    opacity: 0.35,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtn: {
    flex: 1,
    backgroundColor: 'rgba(57,255,20,0.20)',
    borderWidth: 2,
    borderColor: '#39FF14',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  submitBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
    color: '#39FF14',
    letterSpacing: 1,
  },
  submitBtnDisabled: {
    opacity: 0.35,
    shadowOpacity: 0,
    elevation: 0,
  },
});
