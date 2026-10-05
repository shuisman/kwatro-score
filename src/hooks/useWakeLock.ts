import { useEffect } from 'react';

/** Keeps the screen on while mounted (where supported). Re-acquires after the tab becomes visible again. */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        if (document.visibilityState === 'visible' && (!lock || lock.released)) {
          lock = await navigator.wakeLock.request('screen');
          if (cancelled) await lock.release();
        }
      } catch {
        // Denied (e.g. low battery): the screen may turn off; not critical.
      }
    };
    void acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', acquire);
      void lock?.release().catch(() => {});
    };
  }, [enabled]);
}
