export const SCHEMA_VERSION = 1;

export type GameStatus = 'active' | 'finished' | 'stopped';

export interface Player {
  id: string;
  name: string;
  /** Index into PLAYER_COLORS, fixed by seat order at game start. */
  colorIndex: number;
}

export interface Game {
  id: string;
  schemaVersion: number;
  gameType: 'kwatro';
  status: GameStatus;
  /** Seating order, clockwise. players[0] starts. Locked once the game starts. */
  players: Player[];
  createdAt: number;
  endedAt?: number;
}

export type TurnKind = 'score' | 'pass';

/** Append-only event: one per turn. */
export interface Turn {
  id: string;
  gameId: string;
  /** 0-based position in the game; seat = seq % players.length. */
  seq: number;
  playerId: string;
  kind: TurnKind;
  points: number;
  ts: number;
}
