import { Clock, Hash, List, RotateCcw, Share2, Zap } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { InstallHint } from '../components/InstallHint';
import { ScoreTable } from '../components/ScoreTable';
import { Button, Card, Modal, PlayerDot, buttonClass } from '../components/ui';
import { db } from '../db/db';
import { useGame, useTurns } from '../db/hooks';
import { highlights, playerColor, playerTextColor, ranking, type RankEntry } from '../engine/kwatro';
import { fmt, formatDate, formatDuration, useT } from '../i18n';
import { installHintSeen, markInstallHintSeen } from '../pwa';
import { Link, href, useLang, useRouter } from '../router';
import { shareResult } from '../share';

function Podium({ top }: { top: RankEntry[] }) {
  // Visual order 2 – 1 – 3; heights by place, so shared places get equal heights.
  const heights: Record<number, string> = { 1: 'h-36', 2: 'h-28', 3: 'h-20' };
  const order = [top[1], top[0], top[2]];
  return (
    <div className="grid grid-cols-3 items-end gap-2" role="list">
      {order.map((e, i) =>
        e ? (
          <div key={e.player.id} role="listitem" className="flex min-w-0 flex-col items-center">
            {e.place === 1 && <span className="mb-1 text-3xl" aria-hidden>🏆</span>}
            <PlayerDot player={e.player} size={36} />
            <div className="mt-1 w-full truncate text-center font-bold">{e.player.name}</div>
            <div className="tnum mb-2 text-muted">{e.total}</div>
            <div
              className={`flex w-full items-start justify-center rounded-t-2xl pt-2 text-3xl font-black opacity-90 ${heights[e.place] ?? 'h-16'}`}
              style={{ background: playerColor(e.player), color: playerTextColor(e.player) }}
            >
              {e.place}
            </div>
          </div>
        ) : (
          <div key={`empty-${i}`} />
        ),
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-primary">{icon}</span>
      <span className="flex-1 text-muted">{label}</span>
      <span className="tnum text-right font-bold">{value}</span>
    </div>
  );
}

export function Summary({ id }: { id: string }) {
  const t = useT();
  const lang = useLang();
  const { navigate } = useRouter();
  const game = useGame(id);
  const turns = useTurns(id);
  const [table, setTable] = useState(false);
  const [shareMsg, setShareMsg] = useState('');
  const [sharing, setSharing] = useState(false);
  const [showInstall, setShowInstall] = useState(false);

  // Active games belong on the game screen.
  useEffect(() => {
    if (game?.status === 'active') navigate(href({ key: 'game', lang, id }), { replace: true });
  }, [game, lang, id, navigate]);

  // One-time install hint, after the first finished game.
  useEffect(() => {
    if (game?.status !== 'finished' || installHintSeen()) return;
    db.games
      .where('status')
      .equals('finished')
      .count()
      .then((n) => {
        if (n >= 1) {
          setShowInstall(true);
          markInstallHintSeen();
        }
      });
  }, [game?.status]);

  if (game === undefined || turns === undefined || game?.status === 'active') return null;
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

  const ranked = ranking(game.players, turns);
  const finished = game.status === 'finished' && turns.length > 0;
  const winnersList = finished ? ranked.filter((e) => e.place === 1) : [];
  const h = highlights(game, turns);
  const top = finished ? ranked.slice(0, 3) : [];
  const others = finished ? ranked.slice(3) : ranked;

  const playAgain = `${href({ key: 'new', lang })}?from=${encodeURIComponent(game.id)}`;

  return (
    <div className="mx-auto max-w-md">
      <p className="text-sm text-muted">{formatDate(game.endedAt ?? game.createdAt, lang)}</p>
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">
        {!finished
          ? t.summary.title
          : winnersList.length > 1
            ? t.summary.sharedWin
            : fmt(t.summary.winner, { name: winnersList[0].player.name })}
      </h1>

      {!finished && (
        <Card className="mb-6 text-muted">{turns.length === 0 ? t.summary.noTurns : t.summary.stopped}</Card>
      )}

      {finished && <Podium top={top} />}

      {others.length > 0 && (
        <Card className="mt-4">
          {finished && <h2 className="mb-1 text-sm font-semibold text-muted">{t.summary.others}</h2>}
          <ol>
            {others.map((e) => (
              <li key={e.player.id} className="flex items-center gap-3 py-1.5">
                {finished && <span className="tnum w-5 text-right text-sm text-muted">{e.place}</span>}
                <PlayerDot player={e.player} size={24} />
                <span className="flex-1 truncate font-semibold">{e.player.name}</span>
                <span className="tnum font-bold">{e.total}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {turns.length > 0 && (
        <Card className="mt-4">
          <h2 className="mb-1 font-bold">{t.summary.highlights}</h2>
          {h.highestTurn && (
            <Stat
              icon={<Zap size={18} />}
              label={t.summary.highestTurn}
              value={fmt(t.summary.highestTurnValue, { name: h.highestTurn.player.name, points: h.highestTurn.points })}
            />
          )}
          <Stat icon={<Clock size={18} />} label={t.summary.duration} value={formatDuration(h.durationMs, t)} />
          <Stat icon={<Hash size={18} />} label={t.summary.rounds} value={String(h.rounds)} />
        </Card>
      )}

      <div className="mt-6 grid gap-2">
        {finished && (
          <Button
            variant="primary"
            className="py-3.5 text-lg"
            disabled={sharing}
            onClick={async () => {
              setSharing(true);
              try {
                const r = await shareResult(game, turns, lang);
                setShareMsg(r === 'shared' ? t.summary.shared : r === 'downloaded' ? t.summary.downloaded : '');
              } finally {
                setSharing(false);
              }
            }}
          >
            <Share2 size={20} />
            {t.summary.share}
          </Button>
        )}
        {shareMsg && (
          <p role="status" className="text-center text-sm text-muted">
            {shareMsg}
          </p>
        )}
        <Link to={playAgain} className={buttonClass(finished ? 'secondary' : 'primary', 'py-3.5')}>
          <RotateCcw size={18} />
          {t.summary.playAgain}
        </Link>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => setTable(true)} disabled={turns.length === 0}>
            <List size={18} />
            {t.summary.viewTable}
          </Button>
          <Link to={{ key: 'play', lang }} className={buttonClass('secondary')}>
            {t.summary.toGames}
          </Link>
        </div>
      </div>

      {showInstall && (
        <div className="mt-6">
          <InstallHint onDismiss={() => setShowInstall(false)} />
        </div>
      )}

      <Modal open={table} onClose={() => setTable(false)} title={t.table.title} wide>
        <ScoreTable players={game.players} turns={turns} />
        <div className="mt-4 flex justify-end">
          <Button variant="primary" onClick={() => setTable(false)}>
            {t.common.close}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
