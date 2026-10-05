import { BookOpen, House, Info, Moon, Sun, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';
import { storeLang, useT } from '../i18n';
import { Link, href, switchLang, useLang, useRouter, type Route } from '../router';
import { useTheme } from '../theme';
import { Logo } from './Logo';
import { useMounted } from './ui';
import { UpdateBanner } from './UpdateBanner';

type Section = 'home' | 'play' | 'rules' | 'about';

function sectionOf(route: Route): Section | null {
  switch (route.key) {
    case 'home':
      return 'home';
    case 'play':
    case 'new':
    case 'game':
    case 'summary':
      return 'play';
    case 'rules':
      return 'rules';
    case 'about':
      return 'about';
    default:
      return null;
  }
}

const ICONS = { home: House, play: Trophy, rules: BookOpen, about: Info } as const;

function useNavItems() {
  const t = useT();
  const lang = useLang();
  return (['home', 'play', 'rules', 'about'] as Section[]).map((s) => ({
    section: s,
    label: t.nav[s],
    to: { key: s, lang } as Route,
    Icon: ICONS[s],
  }));
}

function LangSwitch() {
  const { route } = useRouter();
  const lang = useLang();
  const t = useT();
  const other = lang === 'nl' ? 'en' : 'nl';
  return (
    <Link
      to={href(switchLang(route, other))}
      onClick={() => storeLang(other)}
      hrefLang={other}
      lang={other}
      className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-text"
      aria-label={t.switchLang}
    >
      {other.toUpperCase()}
    </Link>
  );
}

function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  const mounted = useMounted();
  const t = useT();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t.theme.toggle}
      title={t.theme.toggle}
      className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-text"
    >
      {/* Icon only after mount: the server can't know the theme. */}
      {mounted ? isDark ? <Sun size={18} /> : <Moon size={18} /> : <span className="block size-[18px]" />}
    </button>
  );
}

export function Layout({ children, immersive = false }: { children: ReactNode; immersive?: boolean }) {
  const { route } = useRouter();
  const items = useNavItems();
  const active = sectionOf(route);
  const lang = useLang();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <Link to={{ key: 'home', lang }} className="shrink-0" aria-label="Kwatro Score home">
            <Logo />
          </Link>
          {/* Desktop/tablet: menu at the top. */}
          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
            {items.map(({ section, label, to }) => (
              <Link
                key={section}
                to={to}
                aria-current={active === section ? 'page' : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  active === section ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface-2 hover:text-text'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <LangSwitch />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <UpdateBanner />

      <main className={`mx-auto w-full max-w-5xl flex-1 px-4 ${immersive ? 'pt-3 pb-24' : 'pt-6 pb-28'} md:pb-10`}>
        {children}
      </main>

      {/* Mobile: tab bar at the bottom, in thumb reach. */}
      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 backdrop-blur md:hidden"
        aria-label="Main"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {items.map(({ section, label, to, Icon }) => (
            <li key={section}>
              <Link
                to={to}
                aria-current={active === section ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
                  active === section ? 'text-primary' : 'text-muted'
                }`}
              >
                <Icon size={22} strokeWidth={active === section ? 2.5 : 2} />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
