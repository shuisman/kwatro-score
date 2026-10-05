import Dexie, { type EntityTable } from 'dexie';
import { MAX_PLAYERS, MIN_PLAYERS } from '../engine/kwatro';
import { SCHEMA_VERSION, type Game, type Player, type Turn, type TurnKind } from '../engine/types';
import { uuidv7 } from './ids';

export interface KnownName {
  /** Lower-cased name, the key. */
  key: string;
  name: string;
  lastUsed: number;
}

export class KwatroDB extends Dexie {
  games!: EntityTable<Game, 'id'>;
  turns!: EntityTable<Turn, 'id'>;
  names!: EntityTable<KnownName, 'key'>;

  constructor(name = 'kwatro-score') {
    super(name);
    this.version(1).stores({
      games: 'id, status, createdAt',
      turns: 'id, gameId, [gameId+seq]',
      names: 'key, lastUsed',
    });
  }
}

export let db = new KwatroDB();

/** Test hook: swap in a fresh database. */
export function setDb(next: KwatroDB) {
  db = next;
}

export async function getActiveGame(): Promise<Game | undefined> {
  return db.games.where('status').equals('active').first();
}

/** Starts a game with players in seating order. Any game in progress is stopped first (one at a time). */
export async function startGame(names: string[]): Promise<Game> {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length < MIN_PLAYERS || clean.length > MAX_PLAYERS) {
    throw new Error(`Need ${MIN_PLAYERS}-${MAX_PLAYERS} players`);
  }
  const now = Date.now();
  const players: Player[] = clean.map((name, i) => ({ id: uuidv7(now), name, colorIndex: i }));
  const game: Game = {
    id: uuidv7(now),
    schemaVersion: SCHEMA_VERSION,
    gameType: 'kwatro',
    status: 'active',
    players,
    createdAt: now,
  };
  await db.transaction('rw', db.games, db.names, async () => {
    await db.games.where('status').equals('active').modify({ status: 'stopped', endedAt: now });
    await db.games.add(game);
    await db.names.bulkPut(clean.map((name) => ({ key: name.toLowerCase(), name, lastUsed: now })));
  });
  return game;
}

export async function addTurn(gameId: string, kind: TurnKind, points: number): Promise<Turn> {
  return db.transaction('rw', db.games, db.turns, async () => {
    const game = await db.games.get(gameId);
    if (!game || game.status !== 'active') throw new Error('Game is not active');
    const seq = await db.turns.where('gameId').equals(gameId).count();
    const player = game.players[seq % game.players.length];
    const turn: Turn = {
      id: uuidv7(),
      gameId,
      seq,
      playerId: player.id,
      kind,
      points: kind === 'pass' ? 0 : Math.max(0, Math.round(points)),
      ts: Date.now(),
    };
    await db.turns.add(turn);
    return turn;
  });
}

export async function endGame(gameId: string): Promise<void> {
  await db.games.update(gameId, { status: 'finished', endedAt: Date.now() });
}

export async function stopGame(gameId: string): Promise<void> {
  await db.games.update(gameId, { status: 'stopped', endedAt: Date.now() });
}

export async function deleteGame(gameId: string): Promise<void> {
  await db.transaction('rw', db.games, db.turns, async () => {
    await db.turns.where('gameId').equals(gameId).delete();
    await db.games.delete(gameId);
  });
}

export async function getTurns(gameId: string): Promise<Turn[]> {
  return db.turns.where('[gameId+seq]').between([gameId, Dexie.minKey], [gameId, Dexie.maxKey]).toArray();
}

export async function knownNames(): Promise<string[]> {
  const rows = await db.names.orderBy('lastUsed').reverse().toArray();
  return rows.map((r) => r.name);
}

/** Ask the browser not to evict our data (best effort, mainly helps Safari/Chrome). */
export async function requestPersistence(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // Not supported: nothing to do.
  }
}

// ---------- Export / import ----------

export const EXPORT_FORMAT = 'kwatro-score-export';

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: 1;
  exportedAt: string;
  games: Game[];
  turns: Turn[];
  names: KnownName[];
}

export async function exportData(): Promise<ExportFile> {
  const [games, turns, names] = await Promise.all([db.games.toArray(), db.turns.toArray(), db.names.toArray()]);
  return { format: EXPORT_FORMAT, version: 1, exportedAt: new Date().toISOString(), games, turns, names };
}

function isExportFile(x: unknown): x is ExportFile {
  const f = x as ExportFile;
  return (
    !!f &&
    f.format === EXPORT_FORMAT &&
    f.version === 1 &&
    Array.isArray(f.games) &&
    Array.isArray(f.turns) &&
    Array.isArray(f.names)
  );
}

/** Merges an export into the local data. Records with the same id are overwritten. Returns the number of games. */
export async function importData(raw: unknown): Promise<number> {
  if (!isExportFile(raw)) throw new Error('invalid-file');
  const games = raw.games.filter((g) => typeof g?.id === 'string' && Array.isArray(g.players));
  const turns = raw.turns.filter((t) => typeof t?.id === 'string' && typeof t.gameId === 'string');
  await db.transaction('rw', db.games, db.turns, db.names, async () => {
    const localActive = await getActiveGame();
    // Keep the "one game in progress" rule: imported active games become stopped if one is running here.
    const fixed = games.map((g) =>
      g.status === 'active' && localActive && localActive.id !== g.id ? { ...g, status: 'stopped' as const } : g,
    );
    await db.games.bulkPut(fixed);
    await db.turns.bulkPut(turns);
    await db.names.bulkPut(raw.names.filter((n) => typeof n?.key === 'string'));
  });
  return games.length;
}
