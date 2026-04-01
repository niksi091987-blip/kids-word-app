import { useRef, useCallback, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { GAME_ACTIONS } from '../context/GameContext';

/**
 * Countdown timer that integrates with GameContext.
 * Ticks once per second, dispatches TIMER_TICK to the game reducer.
 * Returns { start, pause, resume, reset, isRunning }.
 */
export function useTimer() {
  const { state, dispatch } = useGame();
  const intervalRef = useRef(null);
  const isRunningRef = useRef(false);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isRunningRef.current = false;
  }, []);

  const start = useCallback(() => {
    stop();
    isRunningRef.current = true;
    intervalRef.current = setInterval(() => {
      dispatch({ type: GAME_ACTIONS.TIMER_TICK });
    }, 1000);
  }, [stop, dispatch]);

  const pause = useCallback(() => {
    stop();
  }, [stop]);

  const resume = useCallback(() => {
    if (!isRunningRef.current) {
      start();
    }
  }, [start]);

  const reset = useCallback(() => {
    stop();
  }, [stop]);

  // Auto-stop when secondsLeft hits 0
  useEffect(() => {
    if (state.secondsLeft === 0 && isRunningRef.current) {
      stop();
    }
  }, [state.secondsLeft, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    start,
    pause,
    resume,
    reset,
    isRunning: isRunningRef.current,
  };
}
