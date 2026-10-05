import { Check, Delete, Flag, SkipForward, Table2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScoreTable } from '../components/ScoreTable';
import { Button, Card, ConfirmModal, Modal, PlayerDot, buttonClass } from '../components/ui';
import { addTurn, endGame } from '../db/db';
import { useGame, useTurns } from '../db/hooks';
import { HIGH_SCORE_CONFIRM, appendDigit, currentAndNext, parsePoints, playerColor, playerTextColor, totals } from '../engine/kwatro';
import { useWakeLock } from '../hooks/useWakeLock';
import { fmt, useT } from '../i18n';
import { Link, href, useLang, useRouter } from '../router';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function GameScreen({ id }: { id: string }) {
  const t = useT();
  const lang = useLang();
  const { navigate } = useRouter();
  const game = useGame(id);
  const turns = useTurns(id);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [peek, setPeek] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmHigh, setConfirmHigh] = useState<number | null>(null);
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const isActive = game?.status === 'active';
  useWakeLock(isActive);

  const showToast = useCallback((text: string) => {
    window.clearTimeout(toastTimer.current);
    setToast({ text, key: Date.now() });
    toastTimer.current = window.setTimeout(() => setToast(null), 1800);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const ready = game && turns;
  const { current, next, round } = ready ? currentAndNext(game.players, turns.length) : ({} as ReturnType<typeof currentAndNext>);
  const tot = ready ? totals(game.players, turns) : {};
  const points = parsePoints(value);

  const submit = useCallback(
    async (kind: 'score' | 'pass', pts: number) => {
      if (busy || !game || !current) return;
      setBusy(true);
      try {
        await addTurn(game.id, kind, pts);
        setValue('');
        showToast(kind === 'pass' ? fmt(t.game.passed, { name: current.name }) : fmt(t.game.added, { points: pts, name: current.name }));
      } finally {
        setBusy(false);
      }
    },
    [busy, game, current, showToast, t],
  );

  const confirmScore = useCallback(() => {
    if (points === null) return;
    if (points > HIGH_SCORE_CONFIRM) setConfirmHigh(points);
    else void submit('score', points);
  }, [points, submit]);

  // Physical keyboard support (desktop/tablet).
  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (peek || confirmEnd || confirmHigh !== null || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^\d$/.test(e.key)) setValue((v) => appendDigit(v, e.key));
      else if (e.key === 'Backspace') setValue((v) => v.slice(0, -1));
      else if (e.key === 'Escape') setValue('');
      else if (e.key === 'Enter') confirmScore();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isActive, peek, confirmEnd, confirmHigh, confirmScore]);

  if (game === undefined || turns === undefined) return null;
  if (game === null) {
    return (
      <Card className="mx-auto mt-8 max-w-md text-center">
        <p className="mb-4">{t.game.notFound}</p>
        <Link to={{ key: 'play', lang }} className={buttonClass('primary')}>
          {t.summary.toGames}
        </Link>
      </Card>
    );
  }
  if (!isActive) {
    return (
      <Card className="mx-auto mt-8 max-w-md text-center">
        <p className="mb-4">{t.game.notActive}</p>
        <Link to={{ key: 'summary', lang, id: game.id }} className={buttonClass('primary')}>
          {t.game.toSummary}
        </Link>
      </Card>
    );
  }

  const color = playerColor(current);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3">
      {/* Who is playing now, and who is next: the one thing that must be unmistakable. */}
      <section
        aria-live="polite"
        className="relative overflow-hidden rounded-3xl border-2 bg-surface p-4"
        style={{ borderColor: color }}
      >
        <div className="absolute inset-y-0 left-0 w-2" style={{ background: color }} aria-hidden />
        <div className="flex items-center justify-between text-xs font-bold tracking-wide text-muted uppercase">
          <span>{t.game.nowPlaying}</span>
          <span>{fmt(t.game.round, { round })}</span>
        </div>
        <div className="mt-1 flex items-center gap-3">
          <PlayerDot player={current} size={44} />
          <div className="min-w-0">
            <div className="truncate text-3xl leading-tight font-extrabold">{current.name}</div>
            <div className="tnum text-sm text-muted">{fmt(t.game.total, { points: tot[current.id] })}</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-2 text-sm">
          <span className="text-muted">{t.game.next}:</span>
          <PlayerDot player={next} size={20} />
          <span className="truncate font-semibold">{next.name}</span>
        </div>
      </section>

      {/* Entered number */}
      <div
        className="tnum flex h-16 items-center justify-center rounded-2xl bg-surface-2 text-5xl font-extrabold"
        aria-live="polite"
        aria-label={value ? `${value}` : t.game.enterScore}
      >
        {value || <span className="text-xl font-semibold text-muted">{t.game.enterScore}</span>}
      </div>

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setValue((v) => appendDigit(v, k))}
            className="tnum h-14 rounded-2xl border border-border bg-surface text-2xl font-bold transition active:scale-95 active:bg-surface-2 sm:h-16"
          >
            {k}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setValue('')}
          className="h-14 rounded-2xl text-sm font-semibold text-muted active:bg-surface-2 sm:h-16"
        >
          {t.game.clear}
        </button>
        <button
          type="button"
          onClick={() => setValue((v) => appendDigit(v, '0'))}
          className="tnum h-14 rounded-2xl border border-border bg-surface text-2xl font-bold transition active:scale-95 active:bg-surface-2 sm:h-16"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => setValue((v) => v.slice(0, -1))}
          aria-label={t.game.backspace}
          className="flex h-14 items-center justify-center rounded-2xl text-muted active:bg-surface-2 sm:h-16"
        >
          <Delete size={26} />
        </button>
      </div>

      {/* Confirm shows exactly what will be recorded: name + points. */}
      <button
        type="button"
        onClick={confirmScore}
        disabled={points === null || busy}
        className="tnum flex h-16 items-center justify-center gap-2 rounded-2xl text-xl font-extrabold transition active:scale-[0.98] disabled:opacity-40"
        style={{ background: color, color: playerTextColor(current) }}
      >
        <Check size={24} />
        {points === null ? t.game.addEmpty : fmt(t.game.add, { name: current.name, points })}
      </button>

      <div className="grid grid-cols-3 gap-2">
        <Button onClick={() => submit('pass', 0)} disabled={busy} className="flex-col gap-1 py-3 text-sm">
          <SkipForward size={20} />
          {t.game.pass}
        </Button>
        <Button onClick={() => setPeek(true)} className="flex-col gap-1 py-3 text-sm">
          <Table2 size={20} />
          {t.game.peek}
        </Button>
        <Button onClick={() => setConfirmEnd(true)} className="flex-col gap-1 py-3 text-sm">
          <Flag size={20} />
          {t.game.endGame}
        </Button>
      </div>

      {toast && (
        <div
          key={toast.key}
          role="status"
          className="pointer-events-none fixed inset-x-0 top-16 z-40 mx-auto w-fit rounded-full bg-text px-4 py-2 text-sm font-semibold text-bg shadow-lg"
        >
          {toast.text}
        </div>
      )}

      <Modal open={peek} onClose={() => setPeek(false)} title={t.table.title} wide>
        <ScoreTable players={game.players} turns={turns} />
        <div className="mt-4 flex justify-end">
          <Button variant="primary" onClick={() => setPeek(false)}>
            {t.common.close}
          </Button>
        </div>
      </Modal>

      <ConfirmModal
        open={confirmHigh !== null}
        title={fmt(t.game.highTitle, { points: confirmHigh ?? 0 })}
        body={fmt(t.game.highBody, { name: current.name })}
        confirmLabel={fmt(t.game.highConfirm, { points: confirmHigh ?? 0 })}
        cancelLabel={t.common.cancel}
        onCancel={() => setConfirmHigh(null)}
        onConfirm={() => {
          const p = confirmHigh;
          setConfirmHigh(null);
          if (p !== null) void submit('score', p);
        }}
      />

      <ConfirmModal
        open={confirmEnd}
        title={t.game.endTitle}
        body={t.game.endBody}
        confirmLabel={t.game.endConfirm}
        cancelLabel={t.common.cancel}
        onCancel={() => setConfirmEnd(false)}
        onConfirm={async () => {
          setConfirmEnd(false);
          await endGame(game.id);
          navigate(href({ key: 'summary', lang, id: game.id }), { replace: true });
        }}
      />
    </div>
  );
}
