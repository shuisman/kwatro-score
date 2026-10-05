import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  KwatroDB,
  addTurn,
  db,
  deleteGame,
  exportData,
  getActiveGame,
  getTurns,
  importData,
  knownNames,
  setDb,
  startGame,
} from './db';

let n = 0;
beforeEach(async () => {
  setDb(new KwatroDB(`test-${n++}`));
  await db.open();
});

describe('db', () => {
  it('starts a game and assigns turns clockwise', async () => {
    const g = await startGame(['Anna', 'Bram']);
    await addTurn(g.id, 'score', 12);
    await addTurn(g.id, 'pass', 99);
    await addTurn(g.id, 'score', 7);
    const turns = await getTurns(g.id);
    expect(turns.map((t) => [t.seq, t.playerId, t.points])).toEqual([
      [0, g.players[0].id, 12],
      [1, g.players[1].id, 0],
      [2, g.players[0].id, 7],
    ]);
  });

  it('keeps only one game in progress', async () => {
    const first = await startGame(['A', 'B']);
    const second = await startGame(['C', 'D']);
    expect((await getActiveGame())?.id).toBe(second.id);
    expect((await db.games.get(first.id))?.status).toBe('stopped');
  });

  it('rejects too few players', async () => {
    await expect(startGame(['Solo'])).rejects.toThrow();
  });

  it('remembers names, most recent first', async () => {
    await startGame(['Anna', 'Bram']);
    await new Promise((r) => setTimeout(r, 5));
    await startGame(['Cas', 'anna']);
    const names = await knownNames();
    expect(names[0].toLowerCase()).toMatch(/cas|anna/);
    expect(names).toHaveLength(3);
  });

  it('round-trips export and import', async () => {
    const g = await startGame(['Anna', 'Bram']);
    await addTurn(g.id, 'score', 30);
    const file = JSON.parse(JSON.stringify(await exportData()));
    await deleteGame(g.id);
    expect(await db.games.count()).toBe(0);
    expect(await importData(file)).toBe(1);
    expect((await getTurns(g.id))[0].points).toBe(30);
  });

  it('refuses foreign files', async () => {
    await expect(importData({ hello: 'world' })).rejects.toThrow('invalid-file');
  });
});
