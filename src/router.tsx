import { createContext, useCallback, useContext, useEffect, useMemo, useState, type AnchorHTMLAttributes, type ReactNode } from 'react';

export type Lang = 'nl' | 'en';
export const LANGS: Lang[] = ['nl', 'en'];

export type Route =
  | { key: 'root' }
  | { key: 'home'; lang: Lang }
  | { key: 'play'; lang: Lang }
  | { key: 'new'; lang: Lang }
  | { key: 'game'; lang: Lang; id: string }
  | { key: 'summary'; lang: Lang; id: string }
  | { key: 'rules'; lang: Lang }
  | { key: 'about'; lang: Lang }
  | { key: 'notfound'; lang: Lang };

export type RouteKey = Route['key'];

export const BASE = import.meta.env.BASE_URL; // '/kwatro-score/'

const SLUGS = {
  nl: { play: 'spelen', new: 'nieuw', game: 'spel', summary: 'uitslag', rules: 'kwatro', about: 'over' },
  en: { play: 'play', new: 'new', game: 'game', summary: 'summary', rules: 'kwatro', about: 'about' },
} as const;

/** Parses a full pathname (including the base path). */
export function parseRoute(pathname: string): Route {
  let p = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname.replace(/^\//, '');
  p = p.replace(/index\.html$/, '').replace(/\/+$/, '');
  const parts = p ? p.split('/').map(decodeURIComponent) : [];
  if (parts.length === 0) return { key: 'root' };
  const lang = parts[0] as Lang;
  if (!LANGS.includes(lang)) return { key: 'notfound', lang: 'nl' };
  const s = SLUGS[lang];
  const [, a, b, c, d] = parts;
  if (!a) return { key: 'home', lang };
  if (a === s.rules && !b) return { key: 'rules', lang };
  if (a === s.about && !b) return { key: 'about', lang };
  if (a === s.play) {
    if (!b) return { key: 'play', lang };
    if (b === s.new && !c) return { key: 'new', lang };
    if (b === s.game && c && !d) return { key: 'game', lang, id: c };
    if (b === s.game && c && d === s.summary && parts.length === 5) return { key: 'summary', lang, id: c };
  }
  return { key: 'notfound', lang };
}

/** Builds the full href (with base path and trailing slash) for a route. */
export function href(route: Route): string {
  if (route.key === 'root') return BASE;
  const { lang } = route;
  const s = SLUGS[lang];
  const tail = (() => {
    switch (route.key) {
      case 'home':
      case 'notfound':
        return '';
      case 'play':
        return `${s.play}/`;
      case 'new':
        return `${s.play}/${s.new}/`;
      case 'game':
        return `${s.play}/${s.game}/${encodeURIComponent(route.id)}/`;
      case 'summary':
        return `${s.play}/${s.game}/${encodeURIComponent(route.id)}/${s.summary}/`;
      case 'rules':
        return `${s.rules}/`;
      case 'about':
        return `${s.about}/`;
    }
  })();
  return `${BASE}${lang}/${tail}`;
}

/** Same page in the other language. */
export function switchLang(route: Route, lang: Lang): Route {
  if (route.key === 'root') return { key: 'home', lang };
  return { ...route, lang };
}

/** Static routes that are prerendered at build time. */
export function staticRoutes(): Route[] {
  return LANGS.flatMap((lang) => [
    { key: 'home', lang },
    { key: 'play', lang },
    { key: 'new', lang },
    { key: 'rules', lang },
    { key: 'about', lang },
  ] as Route[]);
}

interface RouterValue {
  route: Route;
  navigate: (to: string, opts?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterValue | null>(null);

export function RouterProvider({ initialPath, children }: { initialPath: string; children: ReactNode }) {
  const [path, setPath] = useState(initialPath);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    if (opts?.replace) window.history.replaceState(null, '', to);
    else window.history.pushState(null, '', to);
    setPath(new URL(to, window.location.href).pathname);
    window.scrollTo(0, 0);
  }, []);

  const value = useMemo(() => ({ route: parseRoute(path), navigate }), [path, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterValue {
  const v = useContext(RouterContext);
  if (!v) throw new Error('useRouter outside RouterProvider');
  return v;
}

export function useLang(): Lang {
  const { route } = useRouter();
  return route.key === 'root' ? 'nl' : route.lang;
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: Route | string };

/** Client-side link; falls back to a normal anchor for modified clicks. */
export function Link({ to, onClick, ...rest }: LinkProps) {
  const { navigate } = useRouter();
  const target = typeof to === 'string' ? to : href(to);
  return (
    <a
      {...rest}
      href={target}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(target);
      }}
    />
  );
}
