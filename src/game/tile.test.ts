/** What a tile draws of a board, pinned to what the old per-player state gave: the same stacks and the same numbers. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { createGame } from '../testing/old/domain/newGame';
import { shownPlanetValues as shownOld } from '../testing/old/domain/payment';
import { stacksOf } from '../testing/old/domain/stacks';
import { systemPlanets } from '../testing/old/domain/project';
import { boardOf, legacyState, tableOf } from '../testing/old/game/fromLegacy';
import { seatSlots } from '../domain/mapBuilder';
import { seatCount, shownPlanetValues, tileStacks } from './tile';
import { legacyKey } from '../testing/old/game/keys';

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
      // The kernel names the owner of a stack by player id, the old stacks by the old id.
      const named = <S extends { owner: string }>(stacks: S[]): S[] => stacks.map(s => ({ ...s, owner: legacyKey(table, s.owner) }));
      expect(byKey(named(now.space)), slot).toEqual(byKey(old.space));
      expect(byKey(named(now.ground)), slot).toEqual(byKey(old.ground));
    }
  });

  test('a stack is named by the player it belongs to, the viewer too', () => {
    const ids = table.players.map(p => p.id);
    const owners = new Set(seatSlots(6, pack, game.layout).flatMap(slot => {
      const stacks = tileStacks(table, board, table.viewer, slot, systemPlanets(game, slot, pack));
      return [...stacks.space, ...stacks.ground].map(stack => stack.owner);
    }));
    expect(owners.has(table.viewer)).toBe(true);
    for (const owner of owners) expect(ids).toContain(owner);
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
