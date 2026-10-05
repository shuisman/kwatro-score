import { GOATCOUNTER_CODE } from './config';

// Cookie-free counting with GoatCounter. Only page paths and the "game-started" event are sent:
// never names or scores.

interface GoatCounter {
  count(vars: { path: string; title?: string; event?: boolean }): void;
  no_onload?: boolean;
  allow_local?: boolean;
}

declare global {
  interface Window {
    goatcounter?: GoatCounter;
  }
}

const queue: Parameters<GoatCounter['count']>[0][] = [];
let loaded = false;

function load() {
  if (loaded || !GOATCOUNTER_CODE || typeof document === 'undefined') return;
  loaded = true;
  window.goatcounter = { no_onload: true } as GoatCounter;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.dataset.goatcounter = `https://${GOATCOUNTER_CODE}.goatcounter.com/count`;
  s.onload = () => {
    while (queue.length) window.goatcounter?.count(queue.shift()!);
  };
  document.head.appendChild(s);
}

function send(vars: Parameters<GoatCounter['count']>[0]) {
  if (!GOATCOUNTER_CODE) return;
  load();
  if (window.goatcounter?.count) window.goatcounter.count(vars);
  else queue.push(vars);
}

/**
 * Page view; game ids are stripped so every game counts as the same page.
 * GoatCounter itself picks up `?ref=share` from the URL as the referrer.
 */
export function trackPage(pathname: string) {
  send({ path: pathname.replace(/\/(spel|game)\/[^/]+/, '/$1/:id') });
}

export function trackEvent(name: 'game-started') {
  send({ path: name, title: name, event: true });
}
