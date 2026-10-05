import { describe, expect, it } from 'vitest';
import {
  appendDigit,
  currentAndNext,
  highlights,
  parsePoints,
  ranking,
  roundTable,
  totals,
  winners,
} from './kwatro';
import type { Game, Player, Turn } from './types';

const players: Player[] = [
  { id: 'a', name: 'Anna', colorIndex: 0 },
  { id: 'b', name: 'Bram', colorIndex: 1 },
  { id: 'c', name: 'Cas', colorIndex: 2 },
];

let seq = 0;
function turn(playerId: string, points: number, kind: Turn['kind'] = 'score', ts = 1000 + seq * 10): Turn {
  const t: Turn = { id: `t${seq}`, gameId: 'g', seq, playerId, kind, points, ts };
  seq++;
  return t;
}

function game(extra: Partial<Game> = {}): Game {
  return { id: 'g', schemaVersion: 1, gameType: 'kwatro', status: 'active', players, createdAt: 1000, ...extra };
}

describe('turn order', () => {
  it('goes clockwise from the top of the list', () => {
    expect(currentAndNext(players, 0)).toMatchObject({ current: players[0], next: players[1], round: 1 });
    expect(currentAndNext(players, 2)).toMatchObject({ current: players[2], next: players[0], round: 1 });
    expect(currentAndNext(players, 3)).toMatchObject({ current: players[0], next: players[1], round: 2 });
  });
});

describe('totals and ranking', () => {
  it('sums points per player; passes add 0', () => {
    seq = 0;
    const turns = [turn('a', 6), turn('b', 0, 'pass'), turn('c', 34), turn('a', 208)];
    expect(totals(players, turns)).toEqual({ a: 214, b: 0, c: 34 });
  });

  it('shares places on ties (1, 1, 3)', () => {
    seq = 0;
    const turns = [turn('a', 10), turn('b', 10), turn('c', 5)];
    const r = ranking(players, turns);
    expect(r.map((e) => [e.player.id, e.place])).toEqual([
      ['a', 1],
      ['b', 1],
      ['c', 3],
    ]);
    expect(winners(players, turns).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('has no winner without turns', () => {
    expect(winners(players, [])).toEqual([]);
  });
});

describe('round table', () => {
  it('groups turns per round with running totals', () => {
    seq = 0;
    const turns = [turn('a', 6), turn('b', 6), turn('c', 0, 'pass'), turn('a', 34)];
    const rows = roundTable(players, turns);
    expect(rows).toHaveLength(2);
    expect(rows[0].cells.c?.kind).toBe('pass');
    expect(rows[1].running.a).toBe(40);
    expect(rows[1].cells.b).toBeUndefined();
  });
});

describe('highlights', () => {
  it('finds highest turn, duration and rounds', () => {
    seq = 0;
    const turns = [turn('a', 6), turn('b', 52), turn('c', 0, 'pass'), turn('a', 12)];
    const h = highlights(game({ endedAt: 61_000 }), turns);
    expect(h.highestTurn).toEqual({ player: players[1], points: 52 });
    expect(h.durationMs).toBe(60_000);
    expect(h.rounds).toBe(2);
  });
});

describe('keypad input', () => {
  it('appends digits, drops leading zero, caps length', () => {
    expect(appendDigit('', '5')).toBe('5');
    expect(appendDigit('0', '7')).toBe('7');
    expect(appendDigit('1234', '5')).toBe('1234');
    expect(appendDigit('12', 'x')).toBe('12');
    expect(parsePoints('')).toBeNull();
    expect(parsePoints('052')).toBe(52);
  });
});
