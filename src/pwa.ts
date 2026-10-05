import { useSyncExternalStore } from 'react';
import { BASE } from './router';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaState {
  updateReady: boolean;
  installEvent: BeforeInstallPromptEvent | null;
  installed: boolean;
}

let state: PwaState = { updateReady: false, installEvent: null, installed: false };
const listeners = new Set<() => void>();
let waitingWorker: ServiceWorker | null = null;

function set(patch: Partial<PwaState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

const SERVER_STATE: PwaState = { updateReady: false, installEvent: null, installed: false };

export function usePwa(): PwaState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => SERVER_STATE,
  );
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export async function promptInstall(): Promise<boolean> {
  const e = state.installEvent;
  if (!e) return false;
  await e.prompt();
  const { outcome } = await e.userChoice;
  set({ installEvent: null, installed: outcome === 'accepted' });
  return outcome === 'accepted';
}

export function applyUpdate() {
  if (!waitingWorker) return window.location.reload();
  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
}

export function initPwa() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    set({ installEvent: e as BeforeInstallPromptEvent });
  });
  window.addEventListener('appinstalled', () => set({ installed: true, installEvent: null }));

  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  navigator.serviceWorker
    .register(`${BASE}sw.js`, { scope: BASE })
    .then((reg) => {
      const track = (w: ServiceWorker | null) => {
        if (!w) return;
        w.addEventListener('statechange', () => {
          // Only an *update* if a previous worker already controls the page.
          if (w.state === 'installed' && navigator.serviceWorker.controller) {
            waitingWorker = w;
            set({ updateReady: true });
          }
        });
      };
      if (reg.waiting && navigator.serviceWorker.controller) {
        waitingWorker = reg.waiting;
        set({ updateReady: true });
      }
      reg.addEventListener('updatefound', () => track(reg.installing));
      // Check for updates when the app comes back to the foreground.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    })
    .catch(() => {
      // Offline support unavailable; the app still works online.
    });
}

// ---- One-time install hint after the first finished game ----

const HINT_KEY = 'kwatro.installHintShown';

export function installHintSeen(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return true;
  }
}

export function markInstallHintSeen() {
  try {
    localStorage.setItem(HINT_KEY, '1');
  } catch {
    // ignore
  }
}
