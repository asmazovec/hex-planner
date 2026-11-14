/**
 * The kernel and the old start must agree for every faction of the pack: the old `initialState` for me, and
 * `placeStartUnits` with `Game.start` for a rival. Two differences are known and normalised below, both in the old code:
 * a rival of an off-map-home faction (Creuss) has its units at its seat slot, while the kernel (like the old code for me)
 * puts them in the home system under the tile's own id; and the old rival keeps ground forces in space off its own tile.
 */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { createGame } from '../testing/old/domain/newGame';
import { placeStartUnits, setPlayerFaction } from '../testing/old/domain/players';
import { initialState } from '../testing/old/domain/replay/state';
import type { Game, UnitCounts } from '../domain/types';
import { legacyPlayer, tableOf } from '../testing/old/game/fromLegacy';
import { initialBoard } from './setup';
import type { Board, PlayerId, Table } from './types';

const pack = loadPack(['pok', 'te']);
const FACTIONS = Object.keys(pack.factions);

function gameOf(mine: string, rival: string): Game {
  let game = createGame({ expansions: ['pok', 'te'], playerCount: 3, faction: '' }, pack);
  game = setPlayerFaction(game, 0, mine, pack);
  game = setPlayerFaction(game, 1, rival, pack);
  return placeStartUnits(game, pack);
}

const nonEmpty = (units: UnitCounts): UnitCounts => Object.fromEntries(Object.entries(units).filter(([, n]) => (n ?? 0) > 0));
const shipsOf = (board: Board, player: PlayerId): Record<string, UnitCounts> => Object.fromEntries(
  Object.entries(board.systems).map(([slot, s]) => [slot, nonEmpty(s.ships[player] ?? {})]).filter(([, u]) => Object.keys(u as object).length > 0),
);
const groundOf = (board: Board, player: PlayerId): Record<string, UnitCounts> => Object.fromEntries(
  Object.entries(board.planets).map(([id, p]) => [id, nonEmpty(p.ground[player] ?? {})]).filter(([, u]) => Object.keys(u as object).length > 0),
);
const controlOf = (board: Board, player: PlayerId): string[] =>
  Object.keys(board.planets).filter(id => board.planets[id].owner === player).sort();
const cardsOf = (board: Board, player: PlayerId, prefix: string, unlockedOnly = false): string[] =>
  Object.entries(board.players[player].cards).filter(([id, h]) => id.startsWith(prefix) && (!unlockedOnly || h.state !== 'locked')).map(([id]) => id).sort();
const fromAddress = (table: Table, player: PlayerId, ids: string[]): string[] =>
  ids.map(id => id.replace(`@${player}`, `@${legacyPlayer(table, player)}`)).sort();

function expectHoldings(board: Board, table: Table, player: PlayerId, start: Game['start']['me']): void {
  expect(cardsOf(board, player, 'technology:')).toEqual([...(start.technologies ?? [])].sort());
  expect(cardsOf(board, player, 'leader:', true)).toEqual(Object.keys(start.leaders ?? {}).sort());
  expect(fromAddress(table, player, cardsOf(board, player, 'promissory:'))).toEqual([...(start.promissory ?? [])].sort());
}

describe('the kernel start equals the old start', () => {
  test.each(FACTIONS)('%s: as me', faction => {
    const game = gameOf(faction, faction === 'sol' ? 'hacan' : 'sol');
    const table = tableOf(game);
    const board = initialBoard(table, pack);
    const old = initialState(game, pack);
    expect(shipsOf(board, 'p1')).toEqual(Object.fromEntries(Object.entries(old.systems).map(([k, v]) => [k, nonEmpty(v)]).filter(([, u]) => Object.keys(u as object).length > 0)));
    expect(groundOf(board, 'p1')).toEqual(Object.fromEntries(Object.entries(old.ground).map(([k, v]) => [k, nonEmpty(v)]).filter(([, u]) => Object.keys(u as object).length > 0)));
    expect(controlOf(board, 'p1')).toEqual(Object.keys(old.control).filter(id => old.control[id] === 'me').sort());
    const docks = Object.keys(board.planets).filter(id => board.planets[id].structures.spacedock).sort();
    expect(docks).toEqual([...old.docks].sort());
    const pds = Object.fromEntries(Object.keys(board.planets).filter(id => board.planets[id].structures.pds).map(id => [id, board.planets[id].structures.pds]));
    expect(pds).toEqual(Object.fromEntries(Object.entries(old.pds).filter(([, n]) => n > 0)));
    expect(board.players.p1).toMatchObject({ pools: { tactic: old.tactic, fleet: old.fleet, strategy: old.strategy }, tradeGoods: old.tradeGoods, commodities: old.commodities, vp: old.vp });
    expectHoldings(board, table, 'p1', game.start.me);
  });

  test.each(FACTIONS)('%s: as a rival', faction => {
    const game = gameOf(faction === 'sol' ? 'hacan' : 'sol', faction);
    const rival = game.opponents[0];
    const table = tableOf(game);
    const board = initialBoard(table, pack);
    const def = pack.factions[faction];
    const mine = (slot: string) => (def.gateTile !== undefined && slot !== def.homeTile && game.enemyUnits[slot]?.[rival.id] ? def.homeTile : slot);
    const space = Object.fromEntries(Object.entries(game.enemyUnits).map(([slot, by]) => [mine(slot), nonEmpty(by[rival.id] ?? {})]).filter(([, u]) => Object.keys(u as object).length > 0));
    expect(shipsOf(board, 'p2')).toEqual(space);
    const ground = Object.fromEntries(Object.entries(game.enemyGround).map(([id, by]) => [id, nonEmpty(by[rival.id] ?? {})]).filter(([, u]) => Object.keys(u as object).length > 0));
    expect(groundOf(board, 'p2')).toEqual(ground);
    expect(controlOf(board, 'p2')).toEqual(Object.keys(game.planetOwner).filter(id => game.planetOwner[id] === rival.id).sort());
    expect(Object.keys(board.planets).filter(id => board.planets[id].owner === 'p2' && board.planets[id].structures.spacedock).sort())
      .toEqual(game.docks.filter(id => game.planetOwner[id] === rival.id).sort());
    expectHoldings(board, table, 'p2', game.start.opponents[rival.id]);
  });
});
