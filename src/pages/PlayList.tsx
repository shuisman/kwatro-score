import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card, ConfirmModal, PlayerDot, buttonClass } from '../components/ui';
import { deleteGame } from '../db/db';
import { useAllGames, useAllTurns } from '../db/hooks';
import { currentAndNext, totals, winners } from '../engine/kwatro';
import type { Game, Turn } from '../engine/types';
import { fmt, formatDate, useT } from '../i18n';
import { Link, useLang } from '../router';

function StatusBadge({ status }: { status: Game['status'] }) {
  const t = useT();
  const styles = {
    active: 'bg-primary text-primary-fg',
    finished: 'bg-surface-2 text-text',
    stopped: 'bg-surface-2 text-muted',
  };
  const label = { active: t.play.inProgress, finished: t.play.finished, stopped: t.play.stopped }[status];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${styles[status]}`}>{label}</span>;
}

function GameRow({ game, turns, onDelete }: { game: Game; turns: Turn[]; onDelete: () => void }) {
  const t = useT();
  const lang = useLang();
  const tot = totals(game.players, turns);
  const won = game.status === 'finished' ? winners(game.players, turns) : [];
  const to =
    game.status === 'active' ? { key: 'game' as const, lang, id: game.id } : { key: 'summary' as const, lang, id: game.id };

  return (
    <Card className="flex items-center gap-3">
      <Link to={to} className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <StatusBadge status={game.status} />
          <span className="text-sm text-muted">{formatDate(game.createdAt, lang)}</span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {game.players.map((p) => (
            <span key={p.id} className={`inline-flex items-center gap-1.5 ${won.some((w) => w.id === p.id) ? 'font-bold' : ''}`}>
              <PlayerDot player={p} size={16} />
              {p.name} <span className="tnum text-muted">{tot[p.id]}</span>
              {won.some((w) => w.id === p.id) && <span aria-label={t.play.winner}>🏆</span>}
            </span>
          ))}
        </div>
      </Link>
      {game.status === 'active' ? (
        <Link to={to} className={buttonClass('primary', 'shrink-0 text-sm')}>
          {t.play.continue}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onDelete}
          aria-label={t.common.delete}
          className="shrink-0 rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-danger"
        >
          <Trash2 size={18} />
        </button>
      )}
    </Card>
  );
}

export function PlayList() {
  const t = useT();
  const lang = useLang();
  const games = useAllGames();
  const allTurns = useAllTurns();
  const [toDelete, setToDelete] = useState<Game | null>(null);

  const turnsByGame = useMemo(() => {
    const m = new Map<string, Turn[]>();
    for (const turn of allTurns ?? []) {
      const list = m.get(turn.gameId) ?? [];
      list.push(turn);
      m.set(turn.gameId, list);
    }
    return m;
  }, [allTurns]);

  if (!games || !allTurns) return null;
  const active = games.find((g) => g.status === 'active');
  const rest = games.filter((g) => g.status !== 'active');

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight">{t.play.title}</h1>
        <Link to={{ key: 'new', lang }} className={buttonClass('primary')}>
          <Plus size={18} />
          {t.play.newGame}
        </Link>
      </div>

      {games.length === 0 && <Card className="py-10 text-center text-muted">{t.play.empty}</Card>}

      {active && (
        <div className="mb-8">
          <GameRow game={active} turns={turnsByGame.get(active.id) ?? []} onDelete={() => {}} />
          <p className="mt-2 text-sm text-muted">
            {fmt(t.home.roundOf, { round: currentAndNext(active.players, turnsByGame.get(active.id)?.length ?? 0).round })}
          </p>
        </div>
      )}

      {rest.length > 0 && (
        <>
          <h2 className="mb-3 text-lg font-bold">{t.play.history}</h2>
          <div className="grid gap-3">
            {rest.map((g) => (
              <GameRow key={g.id} game={g} turns={turnsByGame.get(g.id) ?? []} onDelete={() => setToDelete(g)} />
            ))}
          </div>
        </>
      )}

      <ConfirmModal
        open={!!toDelete}
        title={t.play.deleteTitle}
        body={t.play.deleteBody}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        danger
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) await deleteGame(toDelete.id);
          setToDelete(null);
        }}
      />
    </div>
  );
}
