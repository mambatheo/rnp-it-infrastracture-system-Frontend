import { useState, useEffect } from 'react';

/**
 * Delays propagating `value` until `delay` ms have elapsed since the last change.
 * Use this to avoid firing API requests on every keystroke.
 *
 * @param {*}      value  — the raw (live) value, e.g. a search string
 * @param {number} delay  — milliseconds to wait (default 400ms)
 * @returns the debounced value
 */
export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer); // cancel if value changes before delay elapses
  }, [value, delay]);

  return debounced;
}
