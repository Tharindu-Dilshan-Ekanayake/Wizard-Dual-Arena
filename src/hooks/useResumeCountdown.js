import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore.js';

const COUNT_FROM = 3;
const STEP_MS = 800;

/**
 * Drives the "3-2-1" resume countdown whenever the pointer (re-)locks --
 * both the very first lock at match start and every resume-from-pause.
 * Gameplay (WASD/AI/casting) stays frozen (`controlsActive=false`) for the
 * whole countdown so it can't be skipped by acting fast, and cancels
 * cleanly if the pointer unlocks again (Esc) mid-countdown.
 */
export function useResumeCountdown() {
  const pointerLocked = useGameStore((s) => s.pointerLocked);
  const setControlsActive = useGameStore((s) => s.setControlsActive);
  const setCountdown = useGameStore((s) => s.setCountdown);
  const timers = useRef([]);

  useEffect(() => {
    function clearTimers() {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    }

    if (!pointerLocked) {
      clearTimers();
      setControlsActive(false);
      setCountdown(null);
      return;
    }

    // Locked: run the countdown, then flip controls on.
    let n = COUNT_FROM;
    setCountdown(n);
    const tick = () => {
      n -= 1;
      if (n <= 0) {
        setCountdown(null);
        setControlsActive(true);
        return;
      }
      setCountdown(n);
      timers.current.push(setTimeout(tick, STEP_MS));
    };
    timers.current.push(setTimeout(tick, STEP_MS));

    return clearTimers;
  }, [pointerLocked, setControlsActive, setCountdown]);
}
