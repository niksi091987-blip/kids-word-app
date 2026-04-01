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

export function useSpeech() {
  const speakWord = useCallback((word, options = {}) => {
    if (!word) return;
    Speech.stop();
    Speech.speak(word, {
      language: 'en-US',
      pitch: 1.1,       // slightly higher pitch for kids
      rate: 0.8,         // slower for clarity
      ...options,
    });
  }, []);

  const speakPhonics = useCallback((word, options = {}) => {
    if (!word) return;
    Speech.stop();
    const letters = word.toLowerCase().split('');
    const spelled = letters.map(l => LETTER_SOUNDS[l] || l).join(', ');
    // Speak the letter sounds slowly, then say the full word clearly at normal speed
    Speech.speak(spelled, {
      language: 'en-US',
      pitch: 1.1,
      rate: 0.5,
      onDone: () => {
        Speech.speak(word, {
          language: 'en-US',
          pitch: 1.1,
          rate: 0.75,
          onDone: options.onDone,
        });
      },
    });
  }, []);

  const speakLetter = useCallback((letter) => {
    if (!letter) return;
    Speech.stop();
    const sound = LETTER_SOUNDS[letter.toLowerCase()] || letter;
    Speech.speak(sound, {
      language: 'en-US',
      pitch: 1.2,
      rate: 0.7,
    });
  }, []);

  const stopSpeech = useCallback(() => {
    Speech.stop();
  }, []);

  return { speakWord, speakPhonics, speakLetter, stopSpeech };
}
