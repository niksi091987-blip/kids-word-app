import { useCallback } from 'react';
import * as Speech from 'expo-speech';

// Phonics: map letters to their phonetic sounds for kids
const LETTER_SOUNDS = {
  a: 'ah', b: 'buh', c: 'kuh', d: 'duh', e: 'eh', f: 'fuh',
  g: 'guh', h: 'huh', i: 'ih', j: 'juh', k: 'kuh', l: 'luh',
  m: 'muh', n: 'nuh', o: 'oh', p: 'puh', q: 'kwuh', r: 'ruh',
  s: 'suh', t: 'tuh', u: 'uh', v: 'vuh', w: 'wuh', x: 'ex',
  y: 'yuh', z: 'zuh',
};

// Natural conversational voice — not too slow, warm and expressive
const VOICE_DEFAULT = {
  language: 'en-US',
  pitch: 1.08,
  rate: 0.92,
};

export function useSpeech() {
  // Queue a word/phrase — does NOT stop current speech so chained calls play in order.
  // Call stopSpeech() first only when you need to interrupt immediately.
  const speakWord = useCallback((word, options = {}) => {
    if (!word) return;
    const { onDone, ...rest } = options;
    Speech.speak(word, {
      ...VOICE_DEFAULT,
      onDone,
      ...rest,
    });
  }, []);

  // Queue phonics spelling — does NOT stop current speech.
  const speakPhonics = useCallback((word, options = {}) => {
    if (!word) return;
    const letters = word.toLowerCase().split('');
    const spelled = letters.map(l => LETTER_SOUNDS[l] || l).join(', ');
    Speech.speak(spelled, {
      language: 'en-US',
      pitch: 1.1,
      rate: 0.55,
      onDone: () => {
        Speech.speak(word, {
          ...VOICE_DEFAULT,
          onDone: options.onDone,
        });
      },
    });
  }, []);

  const speakLetter = useCallback((letter) => {
    if (!letter) return;
    const sound = LETTER_SOUNDS[letter.toLowerCase()] || letter;
    Speech.speak(sound, {
      language: 'en-US',
      pitch: 1.15,
      rate: 0.78,
    });
  }, []);

  // Stops all current and queued speech — call before speakWord when you need
  // to interrupt (e.g. user taps picture, user taps hint button).
  const stopSpeech = useCallback(() => {
    Speech.stop();
  }, []);

  return { speakWord, speakPhonics, speakLetter, stopSpeech };
}
