import type { Game, Player, Turn } from './types';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
/** Scores above this ask for an extra confirmation (likely a typo). */
export const HIGH_SCORE_CONFIRM = 200;
/** Keypad accepts at most this many digits. */
export const MAX_DIGITS = 4;

/** Okabe–Ito palette: distinguishable with common colour-vision deficiencies. */
export const PLAYER_COLORS = [
  '#D55E00', // vermillion
  '#0072B2', // blue
  '#009E73', // bluish green
  '#E69F00', // orange
  '#CC79A7', // reddish purple
  '#56B4E9', // sky blue
  '#B8A400', // olive yellow (darkened F0E442 for contrast)
  '#7A7A7A', // grey
] as const;

export function playerColor(p: Pick<Player, 'colorIndex'>): string {
  return PLAYER_COLORS[p.colorIndex % PLAYER_COLORS.length];
}

/** Readable text colour on top of a player's colour (dark on the light ones). */
export function playerTextColor(p: Pick<Player, 'colorIndex'>): string {
  const hex = playerColor(p).slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Pick whichever of white / near-black gives the higher contrast ratio.
  return (luminance + 0.05) / 0.05 > 1.05 / (luminance + 0.05) ? '#1d1a16' : '#ffffff';
}

function sortedTurns(turns: readonly Turn[]): Turn[] {
  return [...turns].sort((a, b) => a.seq - b.seq);
}

export function totals(players: readonly Player[], turns: readonly Turn[]): Record<string, number> {
  const t: Record<string, number> = {};
  for (const p of players) t[p.id] = 0;
  for (const turn of turns) t[turn.playerId] = (t[turn.playerId] ?? 0) + turn.points;
  return t;
}

/** Turns are strictly clockwise from players[0], so the seat follows from the turn count. */
export function currentPlayerIndex(playerCount: number, turnCount: number): number {
  if (playerCount <= 0) return 0;
  return turnCount % playerCount;
}

export function currentAndNext(players: readonly Player[], turnCount: number) {
  const i = currentPlayerIndex(players.length, turnCount);
  return {
    current: players[i],
    next: players[(i + 1) % players.length],
    round: Math.floor(turnCount / Math.max(players.length, 1)) + 1,
  };
}

export interface RoundRow {
  round: number;
  /** Per player id: the turn in this round, if played. */
  cells: Record<string, Turn | undefined>;
  /** Running total per player id after this round (only for players who played in it or before). */
  running: Record<string, number>;
}

export function roundTable(players: readonly Player[], turns: readonly Turn[]): RoundRow[] {
  const n = players.length;
  if (n === 0) return [];
  const rows: RoundRow[] = [];
  const running: Record<string, number> = {};
  for (const p of players) running[p.id] = 0;
  for (const turn of sortedTurns(turns)) {
    const r = Math.floor(turn.seq / n);
    if (!rows[r]) rows[r] = { round: r + 1, cells: {}, running: {} };
    rows[r].cells[turn.playerId] = turn;
    running[turn.playerId] = (running[turn.playerId] ?? 0) + turn.points;
    rows[r].running = { ...running };
  }
  return rows.filter(Boolean);
}

export interface RankEntry {
  player: Player;
  total: number;
  /** Standard competition ranking: ties share a place (1, 1, 3). */
  place: number;
}

export function ranking(players: readonly Player[], turns: readonly Turn[]): RankEntry[] {
  const t = totals(players, turns);
  // Stable: equal totals keep seat order.
  const sorted = players
    .map((player, seat) => ({ player, total: t[player.id] ?? 0, seat }))
    .sort((a, b) => b.total - a.total || a.seat - b.seat);
  return sorted.map((e) => ({
    player: e.player,
    total: e.total,
    place: sorted.findIndex((x) => x.total === e.total) + 1,
  }));
}

export function winners(players: readonly Player[], turns: readonly Turn[]): Player[] {
  if (turns.length === 0) return [];
  return ranking(players, turns)
    .filter((e) => e.place === 1)
    .map((e) => e.player);
}

export interface Highlights {
  highestTurn: { player: Player; points: number } | null;
  durationMs: number;
  rounds: number;
}

export function highlights(game: Game, turns: readonly Turn[]): Highlights {
  let best: Turn | null = null;
  for (const t of sortedTurns(turns)) {
    if (t.kind === 'score' && (!best || t.points > best.points)) best = t;
  }
  const player = best ? game.players.find((p) => p.id === best.playerId) : undefined;
  const lastTs = turns.reduce((m, t) => Math.max(m, t.ts), game.createdAt);
  const end = game.endedAt ?? lastTs;
  return {
    highestTurn: best && player ? { player, points: best.points } : null,
    durationMs: Math.max(0, end - game.createdAt),
    rounds: game.players.length ? Math.ceil(turns.length / game.players.length) : 0,
  };
}

/** Validate keypad input: digits only, no leading zeros, bounded length. */
export function appendDigit(value: string, digit: string): string {
  if (!/^\d$/.test(digit)) return value;
  if (value === '0') return digit;
  if (value.length >= MAX_DIGITS) return value;
  return value + digit;
}

export function parsePoints(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}
