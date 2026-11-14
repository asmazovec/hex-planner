import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { createGame } from '../testing/old/domain/newGame';
import { playersOf } from './players';
import { addPlayer, placeStartUnits, removePlayer, setPlayerFaction } from '../testing/old/domain/players';
import { project, stateBeforeEntry } from '../testing/old/domain/project';
import { seatSlots } from './mapBuilder';
import type { Entry, Game } from './types';
import { gameAs } from '../testing/old/domain/players';

const pack = loadPack(['pok', 'te']);
/** The start units that stand in space: the ground forces stand on the home planet (LRR 43.1). */
const shipsOf = (units: Record<string, number | undefined>) => Object.fromEntries(Object.entries(units).filter(([id]) => id !== 'infantry'));
const noPay = { planets: [], tradeGoods: 0 };

function started(): Game {
  let game = createGame({ expansions: ['pok', 'te'], playerCount: 3, faction: '' }, pack);
  game = setPlayerFaction(game, 0, 'sol', pack);
  game = setPlayerFaction(game, 1, 'arborec', pack);
  game = setPlayerFaction(game, 2, 'hacan', pack);
  return placeStartUnits(game, pack);
}
const rivalId = (game: Game) => game.opponents[0].id;
const slotOf = (game: Game, seat: number) => seatSlots(game.playerCount, pack, game.layout)[seat - 1];
function withEntries(game: Game, entries: Partial<Entry>[]): Game {
  const plans = game.plans.map(plan => ({ ...plan, rounds: plan.rounds.map((r, i) => (i === 0 ? { ...r, entries: entries.map((e, n) => ({ id: `e${n}`, phase: 'action', status: 'planned', ...e }) as Entry) } : r)) }));
  return { ...game, plans };
}
const planOf = (game: Game) => game.plans[0];

describe('the start of a game', () => {
  test('each opponent stands at their seat with their faction\'s start units', () => {
    const game = started();
    const [arborec, hacan] = game.opponents;
    expect(game.enemyUnits[slotOf(game, arborec.seat)][arborec.id]).toEqual(shipsOf(pack.factions.arborec.startUnits));
    expect(game.enemyUnits[slotOf(game, hacan.seat)][hacan.id]).toEqual(shipsOf(pack.factions.hacan.startUnits));
  });

  test('my own units stay out of it, and an opponent with no faction stands nowhere', () => {
    let game = createGame({ expansions: ['pok', 'te'], playerCount: 3, faction: '' }, pack);
    game = setPlayerFaction(game, 0, 'sol', pack);
    game = setPlayerFaction(game, 1, 'arborec', pack);
    game = placeStartUnits(game, pack);
    expect(Object.keys(game.enemyUnits)).toHaveLength(1);
    expect(Object.values(game.enemyUnits[slotOf(game, 2)])).toHaveLength(1);
  });

  test('their home planets are theirs', () => {
    const game = started();
    const [arborec] = game.opponents;
    for (const planet of pack.tiles[pack.factions.arborec.homeTile].planetIds) {
      expect(game.planetControl[planet]).toBe('enemy');
      expect(game.planetOwner[planet]).toBe(arborec.id);
    }
  });

  test('the home of another faction on the seat leaves its planets alone, and the units still come', () => {
    let game = createGame({ expansions: ['pok', 'te'], playerCount: 3, faction: '' }, pack);
    const seat = seatSlots(3, pack, game.layout)[1];
    game = { ...game, map: { ...game.map, [seat]: pack.factions.hacan.homeTile } };
    game = setPlayerFaction(setPlayerFaction(game, 0, 'sol', pack), 1, 'arborec', pack);
    game = placeStartUnits(game, pack);
    expect(game.enemyUnits[seat][game.opponents[0].id]).toEqual(pack.factions.arborec.startUnits);
    for (const planet of pack.tiles[pack.factions.arborec.homeTile].planetIds) expect(game.planetControl[planet]).toBeUndefined();
  });
});

describe('a game seen by an opponent', () => {
  test('they are the player, and what they hold is mine to them', () => {
    const game = started();
    const view = gameAs(game, rivalId(game));
    expect(view.faction).toBe('arborec');
    expect(view.color).toBe(game.opponents[0].color);
    const planet = pack.tiles[pack.factions.arborec.homeTile].planetIds[0];
    expect(view.planetControl[planet]).toBe('me');
    expect(view.enemyUnits[slotOf(game, game.opponents[0].seat)]?.[rivalId(game)]).toBeUndefined();
  });

  test('for me, or for someone gone, it is the game itself', () => {
    const game = started();
    expect(gameAs(game, undefined)).toBe(game);
    expect(gameAs(game, 'nobody')).toBe(game);
  });
});

describe('an opponent\'s action in my plan', () => {
  test('moves their ships, and mine stay', () => {
    const base = started();
    const id = rivalId(base);
    const home = slotOf(base, base.opponents[0].seat);
    const units = { fighter: 1 };
    const game = withEntries(base, [{ type: 'tactical', owner: id, systemId: '0,0', moves: [{ from: home, units }], landings: [], production: {}, payment: noPay }]);
    const { state, warningsByEntry } = project(game, planOf(game), 'forecast', pack);
    expect(state.rivals?.[id].systems['0,0']?.fighter).toBe(1);
    expect(state.tactic).toBe(3);
    expect(state.rivals?.[id].tactic).toBe(2);
    expect(state.rivals?.[id].tokensOnMap).toContain('0,0');
    expect(state.tokensOnMap).not.toContain('0,0');
    expect(warningsByEntry.e0).toBeDefined();
  });

  test('is checked against their numbers: taking more than they have warns', () => {
    const base = started();
    const home = slotOf(base, base.opponents[0].seat);
    const game = withEntries(base, [{ type: 'tactical', owner: rivalId(base), systemId: '0,0', moves: [{ from: home, units: { dreadnought: 9 } }], landings: [], production: {}, payment: noPay }]);
    expect(project(game, planOf(game), 'forecast', pack).warningsByEntry.e0.map(w => w.code)).toContain('unitsMissing');
  });

  test('a landing takes the planet for them on my map', () => {
    const base = started();
    const id = rivalId(base);
    // The pack has Thunder's Edge, so its Mecatol Rex stands in the active system.
    const planet = 'mrte';
    const game = withEntries(base, [{ type: 'tactical', owner: id, systemId: '0,0', moves: [{ from: slotOf(base, base.opponents[0].seat), units: { infantry: 1 } }], landings: [{ planetId: planet, units: { infantry: 1 } }], production: {}, payment: noPay }]);
    const { state } = project(game, planOf(game), 'forecast', pack);
    expect(state.control[planet]).toBe('enemy');
    expect(state.rivalHolds?.[planet]).toBe(id);
  });

  test('the state before it is theirs', () => {
    const base = started();
    const id = rivalId(base);
    const game = withEntries(base, [
      { type: 'adjustment', label: '', delta: { tactic: -1 } },
      { type: 'tactical', owner: id, systemId: '0,0', moves: [], landings: [], production: {}, payment: noPay },
    ]);
    expect(stateBeforeEntry(game, planOf(game), 'e1', pack).tactic).toBe(3);
    expect(stateBeforeEntry(game, planOf(game), 'e1', pack).systems[slotOf(game, game.opponents[0].seat)]).toEqual(shipsOf(pack.factions.arborec.startUnits));
  });

  test('marked as planned it is out of the fact', () => {
    const base = started();
    const id = rivalId(base);
    const game = withEntries(base, [{ type: 'tactical', owner: id, systemId: '0,0', moves: [], landings: [], production: {}, payment: noPay }]);
    expect(project(game, planOf(game), 'now', pack).state.rivals?.[id].tokensOnMap).toEqual([]);
  });

  test('goes when the opponent leaves the game', () => {
    const base = addPlayer(started(), pack);
    const game = withEntries(base, [
      { type: 'pass', owner: rivalId(base) },
      { type: 'pass' },
    ]);
    const after = removePlayer(game, 1, pack);
    expect(after.plans[0].rounds[0].entries.map(e => e.id)).toEqual(['e1']);
    expect(playersOf(after)).toHaveLength(3);
  });
});

describe('the start of a game: where the units stand (LRR 43.1)', () => {
  test('a rival starts with ground forces on the home planet and a space dock there', () => {
    const game = started();
    const [arborec] = game.opponents;
    const [planet] = pack.tiles[pack.factions.arborec.homeTile].planetIds;
    const { infantry, ...ships } = pack.factions.arborec.startUnits;
    expect(game.enemyUnits[slotOf(game, arborec.seat)][arborec.id]).toEqual(ships);
    expect(game.enemyGround[planet][arborec.id]).toEqual({ infantry });
    expect(game.docks).toContain(planet);
  });

  test('so does my own board, and no ground force is left in space', () => {
    const game = started();
    const state = project(game, game.plans[0], 'forecast', pack).state;
    const [planet] = pack.tiles[pack.factions.sol.homeTile].planetIds;
    expect(state.ground[planet]).toEqual({ infantry: pack.factions.sol.startUnits.infantry });
    expect(Object.values(state.systems).flatMap(units => Object.keys(units))).not.toContain('infantry');
    const rival = state.rivals![rivalId(game)];
    expect(rival.docks).toContain(pack.tiles[pack.factions.arborec.homeTile].planetIds[0]);
  });
});
