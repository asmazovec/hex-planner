/** What a tile draws of a board, pinned to what the old per-player state gave: the same stacks and the same numbers. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { createGame } from '../domain/newGame';
import { shownPlanetValues as shownOld } from '../domain/payment';
import { stacksOf } from '../domain/stacks';
import { systemPlanets } from '../domain/project';
import { boardOf, legacyState, tableOf } from './fromLegacy';
import { seatSlots } from '../domain/mapBuilder';
import { ownerKey, playerOfOwner, seatCount, shownPlanetValues, tileStacks } from './tile';

const pack = loadPack(['pok']);
const game = createGame({ expansions: ['pok'], playerCount: 6, faction: 'sol' }, pack);
const table = tableOf(game);
const board = boardOf(game, pack);
const state = legacyState(table, board, pack, table.viewer);

describe('tileStacks', () => {
  test('every home system stands as the old stacks have it, for each player', () => {
    for (const slot of seatSlots(6, pack, game.layout)) {
      const planets = systemPlanets(game, slot, pack);
      const old = stacksOf(game, state, slot, planets, pack);
      const now = tileStacks(table, board, table.viewer, slot, planets);
      const byKey = (stacks: { kind: string; owner: string; count: number; planet?: number }[]) => stacks.map(s => `${s.owner}|${s.kind}|${s.planet ?? '-'}|${s.count}`).sort();
      expect(byKey(now.space), slot).toEqual(byKey(old.space));
      expect(byKey(now.ground), slot).toEqual(byKey(old.ground));
    }
  });

  test('the viewer is `me`, the others are named by the id a saved game has for them, and back', () => {
    const others = table.players.filter(p => p.id !== table.viewer);
    expect(ownerKey(table, table.viewer, table.viewer)).toBe('me');
    for (const other of others) {
      const key = ownerKey(table, table.viewer, other.id);
      expect(key).toBe(other.legacyId);
      expect(playerOfOwner(table, table.viewer, key)).toBe(other.id);
    }
    // Seen by an opponent, the real viewer is no `me`: the name stays apart.
    const [rival] = others;
    expect(ownerKey(table, rival.id, table.viewer)).toBe(table.viewer);
    expect(seatCount(table)).toBe(6);
  });
});

describe('shownPlanetValues', () => {
  test('the printed numbers of a free planet, and what the old state shows of mine', () => {
    for (const id of Object.keys(board.planets)) {
      const mine = board.planets[id].owner === table.viewer;
      expect(shownPlanetValues(table, board, pack, table.viewer, id), id).toEqual(shownOld(pack, state, id, game.faction));
      expect(mine || shownPlanetValues(table, board, pack, table.viewer, id).changed === false).toBe(true);
    }
  });
});
