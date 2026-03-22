import { useEffect, useRef, useCallback } from 'react';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

const ACTIVITY_EVENTS = [
  'mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click',
];

/**
 * useIdleTimeout
 * Logs the user out after 15 minutes of inactivity.
 * Any activity resets the countdown.
 */
export function useIdleTimeout({ onLogout }) {
  const logoutTimer = useRef(null);

  const resetTimer = useCallback(() => {
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    logoutTimer.current = setTimeout(() => {
      onLogout?.();
    }, IDLE_TIMEOUT_MS);
  }, [onLogout]);

  useEffect(() => {
    if (!onLogout) return; // not logged in — do nothing
    resetTimer();
    ACTIVITY_EVENTS.forEach(evt =>
      document.addEventListener(evt, resetTimer, { passive: true })
    );
    return () => {
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
      ACTIVITY_EVENTS.forEach(evt =>
        document.removeEventListener(evt, resetTimer)
      );
    };
  }, [resetTimer, onLogout]);
}

export default useIdleTimeout;
