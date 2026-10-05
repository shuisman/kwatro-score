import { ArrowRight, BookOpen, Play, Smartphone, UserX, WifiOff } from 'lucide-react';
import { KwatroCard } from '../components/KwatroCard';
import { Card, PlayerDot, buttonClass, useMounted } from '../components/ui';
import { currentAndNext } from '../engine/kwatro';
import { useActiveGame, useTurnCount } from '../db/hooks';
import { fmt, useT } from '../i18n';
import { Link, useLang } from '../router';

function ContinueCard() {
  const t = useT();
  const lang = useLang();
  const game = useActiveGame();
  const turnCount = useTurnCount(game?.id);
  if (!game || turnCount === undefined) return null;
  const { current, round } = currentAndNext(game.players, turnCount);
  return (
    <Card className="mt-6 flex items-center gap-3">
      <PlayerDot player={current} size={40} />
      <div className="min-w-0 flex-1">
        <div className="font-bold">{t.home.continueTitle}</div>
        <div className="truncate text-sm text-muted">
          {fmt(t.home.roundOf, { round })} · {game.players.map((p) => p.name).join(', ')}
        </div>
      </div>
      <Link to={{ key: 'game', lang, id: game.id }} className={buttonClass('primary', 'shrink-0')}>
        <Play size={16} />
        {t.home.continue}
      </Link>
    </Card>
  );
}

const FEATURE_ICONS = [WifiOff, UserX, Smartphone];

export function Home() {
  const t = useT();
  const lang = useLang();
  const mounted = useMounted();
  return (
    <div className="mx-auto max-w-3xl">
      <section className="grid items-center gap-8 py-4 md:grid-cols-[1fr_auto] md:py-12">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-balance md:text-5xl">{t.home.title}</h1>
          <p className="mt-4 text-lg text-muted text-pretty">{t.home.lead}</p>
          <Link
            to={{ key: 'new', lang }}
            className={buttonClass('primary', 'mt-8 w-full px-8 py-4 text-lg sm:w-auto')}
          >
            <Play size={20} />
            {t.home.start}
          </Link>
          {mounted && <ContinueCard />}
        </div>
        <div className="hidden -rotate-3 gap-2 md:flex" aria-hidden>
          <KwatroCard color="red" shape="circle" number={1} size={78} />
          <KwatroCard color="blue" shape="square" number={2} size={78} className="translate-y-3" />
          <KwatroCard color="green" shape="triangle" number={3} size={78} />
          <KwatroCard color="yellow" shape="cross" number={4} size={78} className="translate-y-3" />
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {t.home.features.map((f, i) => {
          const Icon = FEATURE_ICONS[i];
          return (
            <Card key={f.title}>
              <Icon size={22} className="mb-2 text-primary" />
              <h2 className="font-bold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted">{f.text}</p>
            </Card>
          );
        })}
      </section>

      <Link
        to={{ key: 'rules', lang }}
        className="mt-6 flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition hover:bg-surface-2"
      >
        <BookOpen className="shrink-0 text-primary" />
        <div className="flex-1">
          <div className="font-bold">{t.home.rulesCta}</div>
          <div className="text-sm text-muted">{t.home.rulesCtaText}</div>
        </div>
        <ArrowRight className="shrink-0 text-muted" />
      </Link>
    </div>
  );
}
