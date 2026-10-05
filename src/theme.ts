import { useCallback, useEffect, useState } from 'react';

export type ThemePref = 'system' | 'light' | 'dark';
const KEY = 'kwatro.theme';

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    // ignore
  }
  return 'system';
}

function systemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function apply(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'system' && systemDark());
  document.documentElement.classList.toggle('dark', dark);
}

/** Theme preference. Before mount (and on the server) it reports 'system' to keep hydration stable. */
export function useTheme() {
  const [pref, setPrefState] = useState<ThemePref>('system');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const p = readPref();
    setPrefState(p);
    setIsDark(document.documentElement.classList.contains('dark'));
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (readPref() === 'system') {
        apply('system');
        setIsDark(systemDark());
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const setPref = useCallback((p: ThemePref) => {
    try {
      localStorage.setItem(KEY, p);
    } catch {
      // ignore
    }
    apply(p);
    setPrefState(p);
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  /** Quick toggle in the header: flips between light and dark explicitly. */
  const toggle = useCallback(() => setPref(isDark ? 'light' : 'dark'), [isDark, setPref]);

  return { pref, isDark, setPref, toggle };
}
