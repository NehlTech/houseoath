import { useEffect, useRef, useCallback } from 'react';

const IDLE_MS = 30 * 60 * 1000;  // 30 minutes until logout
const WARN_MS = 28 * 60 * 1000;  // show warning 2 minutes before logout

export function useInactivityTimer(
  active: boolean,
  onWarn: (secondsLeft: number) => void,
  onLogout: () => void,
) {
  const logoutTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const warnTimer    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tickInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const reset = useCallback(() => {
    clearTimeout(logoutTimer.current);
    clearTimeout(warnTimer.current);
    clearInterval(tickInterval.current);
    // Dismiss any visible warning when the user becomes active again
    onWarn(0);

    if (!active) return;

    warnTimer.current = setTimeout(() => {
      let secsLeft = 120;
      onWarn(secsLeft);
      tickInterval.current = setInterval(() => {
        secsLeft -= 1;
        onWarn(secsLeft);
        if (secsLeft <= 0) clearInterval(tickInterval.current);
      }, 1000);
    }, WARN_MS);

    logoutTimer.current = setTimeout(() => {
      clearInterval(tickInterval.current);
      onLogout();
    }, IDLE_MS);
  }, [active, onWarn, onLogout]);

  useEffect(() => {
    if (!active) return;
    const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const;
    EVENTS.forEach(ev => window.addEventListener(ev, reset, { passive: true }));
    reset();
    return () => {
      EVENTS.forEach(ev => window.removeEventListener(ev, reset));
      clearTimeout(logoutTimer.current);
      clearTimeout(warnTimer.current);
      clearInterval(tickInterval.current);
    };
  }, [active, reset]);
}
