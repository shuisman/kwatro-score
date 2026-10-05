import { useLiveQuery } from 'dexie-react-hooks';
import type { Game, Turn } from '../engine/types';
import { db, getActiveGame, getTurns, knownNames } from './db';

/** `undefined` while loading, `null` when not found. */
export function useGame(id: string): Game | null | undefined {
  return useLiveQuery(async () => (await db.games.get(id)) ?? null, [id]);
}

export function useTurns(gameId: string): Turn[] | undefined {
  return useLiveQuery(() => getTurns(gameId), [gameId]);
}

export function useActiveGame(): Game | null | undefined {
  return useLiveQuery(async () => (await getActiveGame()) ?? null, []);
}

export function useTurnCount(gameId: string | undefined): number | undefined {
  return useLiveQuery(() => (gameId ? db.turns.where('gameId').equals(gameId).count() : 0), [gameId]);
}

export function useAllGames(): Game[] | undefined {
  return useLiveQuery(() => db.games.orderBy('createdAt').reverse().toArray(), []);
}

export function useAllTurns(): Turn[] | undefined {
  return useLiveQuery(() => db.turns.toArray(), []);
}

export function useKnownNames(): string[] | undefined {
  return useLiveQuery(() => knownNames(), []);
}
