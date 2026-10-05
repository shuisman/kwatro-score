import { roundTable, totals } from '../engine/kwatro';
import type { Player, Turn } from '../engine/types';
import { useT } from '../i18n';
import { PlayerDot } from './ui';

/** Rounds × players, each cell with the turn's points and the running total below it. */
export function ScoreTable({ players, turns }: { players: Player[]; turns: Turn[] }) {
  const t = useT();
  const rows = roundTable(players, turns);
  const tot = totals(players, turns);

  if (rows.length === 0) return <p className="py-6 text-center text-muted">{t.table.empty}</p>;

  return (
    <div className="max-h-[65dvh] overflow-auto rounded-xl border border-border">
      <table className="tnum w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-surface-2">
          <tr>
            <th scope="col" className="sticky left-0 bg-surface-2 px-2 py-2 text-left text-xs text-muted" title={t.table.roundLong}>
              {t.table.round}
            </th>
            {players.map((p) => (
              <th key={p.id} scope="col" className="min-w-[4.5rem] px-2 py-2 text-right font-semibold">
                <span className="inline-flex max-w-[7rem] items-center gap-1.5">
                  <PlayerDot player={p} size={16} />
                  <span className="truncate">{p.name}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.round} className="border-t border-border">
              <th scope="row" className="sticky left-0 bg-surface px-2 py-1.5 text-left text-xs font-semibold text-muted">
                {row.round}
              </th>
              {players.map((p) => {
                const cell = row.cells[p.id];
                return (
                  <td key={p.id} className="px-2 py-1.5 text-right align-top">
                    {cell ? (
                      <>
                        <div className={cell.kind === 'pass' ? 'text-muted italic' : 'font-semibold'}>
                          {cell.kind === 'pass' ? t.table.pass : cell.points}
                        </div>
                        <div className="text-xs text-muted">{row.running[p.id]}</div>
                      </>
                    ) : (
                      <span className="text-muted">·</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot className="sticky bottom-0 bg-surface-2">
          <tr className="border-t-2 border-border">
            <th scope="row" className="sticky left-0 bg-surface-2 px-2 py-2 text-left text-xs">
              {t.table.total}
            </th>
            {players.map((p) => (
              <td key={p.id} className="px-2 py-2 text-right text-base font-extrabold">
                {tot[p.id]}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
