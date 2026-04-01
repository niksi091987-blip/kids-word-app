import { useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
import { useProgress } from '../context/ProgressContext';

// Sound assets — Metro resolves require() statically at build time.
// All files must exist or the bundler will throw.
const SOUND_MAP = {
  tile_tap: require('../../assets/sounds/tile_tap.wav'),
  word_correct: require('../../assets/sounds/word_correct.wav'),
  word_wrong: require('../../assets/sounds/word_wrong.wav'),
  level_complete: require('../../assets/sounds/level_complete.wav'),
  star_earned: require('../../assets/sounds/star_earned.wav'),
  timer_tick: require('../../assets/sounds/timer_tick.wav'),
};

export function useSound() {
  const { state: progressState } = useProgress();
  const soundsRef = useRef({});

  // Preload all sounds once
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });

        const entries = Object.entries(SOUND_MAP);
        for (const [key, src] of entries) {
          try {
            const { sound } = await Audio.Sound.createAsync(src, { shouldPlay: false });
            if (!cancelled) {
              soundsRef.current[key] = sound;
            }
          } catch {
            // asset load failed — skip
          }
        }
      } catch {
        // Audio setup failed
      }
    }

    load();

    return () => {
      cancelled = true;
      Object.values(soundsRef.current).forEach((s) => {
        try { s.unloadAsync(); } catch {}
      });
      soundsRef.current = {};
    };
  }, []);

  const play = useCallback(async (key) => {
    if (!progressState.soundEnabled) return;
    const sound = soundsRef.current[key];
    if (!sound) return;
    try {
      await sound.setPositionAsync(0);
      await sound.playAsync();
    } catch {
      // playback failed
    }
  }, [progressState.soundEnabled]);

  return { play };
}
