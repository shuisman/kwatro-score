import { useLang, type Lang } from '../router';
import { en } from './en';
import { nl, type Dict } from './nl';

export const dicts: Record<Lang, Dict> = { nl, en };

export function useT(): Dict {
  return dicts[useLang()];
}

/** Replaces {placeholders} in a template. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

const LANG_KEY = 'kwatro.lang';

export function storeLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Storage unavailable: the language just isn't remembered.
  }
}

/** Stored choice first, then the browser language (nl/nl-BE → nl), otherwise English. */
export function preferredLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === 'nl' || stored === 'en') return stored;
  } catch {
    // ignore
  }
  const langs = typeof navigator !== 'undefined' ? (navigator.languages ?? [navigator.language]) : [];
  return langs.some((l) => l?.toLowerCase().startsWith('nl')) ? 'nl' : 'en';
}

export function formatDate(ts: number, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'nl' ? 'nl-NL' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(ts);
}

export function formatDuration(ms: number, t: Dict): string {
  const totalMin = Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? fmt(t.summary.hoursMinutes, { h, m }) : fmt(t.summary.minutes, { n: totalMin });
}
