/**
 * The board a saved game begins with (`startBoard`) against the old `boardOf` of the game it reads as, for every faction
 * of the pack as the viewer and as another player, drafts and started games, and each kind of hand placement.
 */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { setLeader, setStartHolding } from '../testing/old/domain/holdings';
import { createGame } from '../testing/old/domain/newGame';
import { addPlayer, placeStartUnits, setPlayerFaction } from '../testing/old/domain/players';
import type { Game } from '../domain/types';
import { gameOf, savedOf } from '../testing/legacySave';
import { normalState } from '../testing/old/game/compare';
import { boardOf, legacyState, tableOf } from '../testing/old/game/fromLegacy';
import { startBoard } from '../game/setup';

const pack = loadPack(['pok', 'te']);
const FACTIONS = Object.keys(pack.factions);

function seated(mine: string, rival: string, started: boolean, count = 3): Game {
  let n = 0;
  let game = createGame({ expansions: ['pok', 'te'], playerCount: count, faction: '' }, pack, prefix => `${prefix}-${n++}`);
  game = setPlayerFaction(game, 0, mine, pack);
  game = setPlayerFaction(game, 1, rival, pack);
  if (count > 2) game = setPlayerFaction(game, 2, mine === 'sol' || rival === 'sol' ? 'hacan' : 'sol', pack);
  return started ? placeStartUnits(game, pack) : game;
}

/** The two boards agree for every player: the saved game's own and the old one of the game it is read as. */
function same(game: Game): void {
  const saved = savedOf(game);
  const old = gameOf(saved);
  const oldTable = tableOf(old);
  const oldBoard = boardOf(old, pack);
  const board = startBoard(saved, pack);
  for (const player of saved.table.players) {
    expect(normalState(legacyState(saved.table, board, pack, player.id)), player.id).toEqual(normalState(legacyState(oldTable, oldBoard, pack, player.id)));
  }
  expect(board.common.fracture.open).toBe(oldBoard.common.fracture.open);
  expect(board.common.thundersEdge).toEqual(oldBoard.common.thundersEdge);
}

describe('every faction, viewer and other player, drafts and started games', () => {
  test.each(FACTIONS)('%s as the viewer', faction => {
    same(seated(faction, faction === 'sol' ? 'hacan' : 'sol', false));
    same(seated(faction, faction === 'sol' ? 'hacan' : 'sol', true));
  });
  test.each(FACTIONS)('%s as another player', faction => {
    same(seated(faction === 'sol' ? 'hacan' : 'sol', faction, false));
    same(seated(faction === 'sol' ? 'hacan' : 'sol', faction, true));
  });
});

describe('hand placements', () => {
  const started = (): Game => seated('sol', 'creuss', true);
  const opp = (g: Game): string => g.opponents[0].id;

  test('units, ground forces, planets, docks and PDS of the others and of me', () => {
    const g = started();
    same({
      ...g,
      enemyUnits: { ...g.enemyUnits, '1,-2': { [opp(g)]: { cruiser: 2, fighter: 3 } }, '-1,2': { [opp(g)]: { destroyer: 1 }, [g.opponents[1].id]: { carrier: 1 } } },
      enemyGround: { ...g.enemyGround, '25': { [opp(g)]: { infantry: 3 } } },
      planetControl: { ...g.planetControl, '30': 'enemy', '31': 'me', '32': 'enemy' }, planetOwner: { ...g.planetOwner, '30': opp(g), '32': g.opponents[1].id },
      docks: [...g.docks, '30', '31'], pds: { ...g.pds, '30': 2, '31': 1 },
    });
  });

  test('start holdings, leaders, breakthrough and points', () => {
    let g = seated('mahact', 'jolnar', true);
    g = setStartHolding(g, 'me', 'technology:cruiser_ii', true);
    g = setStartHolding(g, g.opponents[0].id, 'technology:neural_motivator', true);
    g = setStartHolding(g, 'me', 'actionCard:sabotage', true);
    g = setStartHolding(g, 'me', 'actionCard:sabotage', true);
    g = setStartHolding(g, g.opponents[0].id, 'relic:the_crown_of_emphidia', true);
    g = { ...g, vp: 3, opponents: g.opponents.map((o, i) => ({ ...o, vp: i + 1 })) };
    same(g);
    const leaders = Object.keys(gameOf(savedOf(g)).start.me.leaders ?? {});
    for (const id of leaders) same(setLeader(g, 'me', id, 'exhausted'));
    for (const id of leaders) same(setLeader(g, g.opponents[0].id, id, 'purged'));
  });

  test('an off-map home (Creuss, Crimson) present and absent from the map, as the viewer and as another player', () => {
    for (const faction of ['creuss', 'crimson']) {
      if (!pack.factions[faction]) continue;
      const def = pack.factions[faction];
      for (const [mine, rival] of [[faction, 'sol'], ['sol', faction]]) {
        const g = seated(mine, rival, false);
        same(g);
        same(placeStartUnits(g, pack));
        // The gate (or home) tile leaves the map: another tile stands at the seat. A game begins after the map is set, so only a draft or a game started on that map is read.
        const gone = Object.fromEntries(Object.entries(g.map).map(([slot, tile]) => [slot, [def.homeTile, def.gateTile].includes(tile.split('@')[0]) ? '25' : tile]));
        same({ ...g, map: gone });
        same(placeStartUnits({ ...g, map: gone }, pack));
      }
    }
  });

  test('the expedition and Thunder\'s Edge system, and the Fracture open', () => {
    const g = started();
    same({ ...g, expedition: { slices: { a: 'me', b: 'other', c: null }, thundersEdgeSystem: '0,0' } });
    same({ ...g, expedition: { ...g.expedition, thundersEdgeSystem: '3,-3' } });
    same({ ...g, fracture: { active: true, ingress: ['0,3'], seat: 2, tiles: { '9,9': '1000' } } });
  });

  test('a player more, six players, a draft with a player added', () => {
    same(seated('sol', 'hacan', true, 6));
    same(addPlayer(seated('sol', 'hacan', false), pack));
  });
});
