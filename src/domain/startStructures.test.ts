import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { parseMapString } from './mapString';
import { createGame } from '../testing/old/domain/newGame';
import { placeStartUnits, removePlayer, setPlayerFaction } from '../testing/old/domain/players';
import { project } from '../testing/old/domain/project';
import { seatSlots } from './mapBuilder';
import { homeSlot } from './strategy';
import type { UnitCounts } from './types';
import type { Game } from '../testing/old/domain/types';
import type { GameState } from '../testing/old/domain/types';

const pack = loadPack(['pok', 'te']);
const FACTIONS = Object.keys(pack.factions);
const MAP_STRING = '66 22 61 19 72 24 110 79 48 106 117 33 41 71 28 44 46 30 58 63 115 55 76 49 16 74 78 14 37 68 12 102 80 4 34 113';

const stateOf = (game: Game): GameState => project(game, game.plans[0], 'forecast', pack).state;
const firstHome = (faction: string): string => pack.tiles[pack.factions[faction].homeTile].planetIds[0];
const pdsOf = (state: GameState): Record<string, number> => Object.fromEntries(Object.entries(state.pds).filter(([, n]) => n > 0));
const docksOf = (faction: string) => (pack.factions[faction].startStructures?.spacedock ?? 0) > 0 ? [firstHome(faction)] : [];
const pdsExpected = (faction: string) => { const n = pack.factions[faction].startStructures?.pds ?? 0; return n > 0 ? { [firstHome(faction)]: n } : {}; };

/** A three-player game with me as `mine` and the rival at seat 2 as `rival`, started. */
function game3(mine: string, rival: string): Game {
  let game = createGame({ expansions: ['pok', 'te'], playerCount: 3, faction: '' }, pack);
  game = setPlayerFaction(game, 0, mine, pack);
  game = setPlayerFaction(game, 1, rival, pack);
  return placeStartUnits(game, pack);
}

function game4(mine: string, rival: string): Game {
  let game = createGame({ expansions: ['pok', 'te'], playerCount: 4, faction: '' }, pack);
  game = setPlayerFaction(game, 0, mine, pack);
  game = setPlayerFaction(game, 1, rival, pack);
  return placeStartUnits(game, pack);
}

describe('the start of a game holds what the faction sheet says (units and structures)', () => {
  // Hole this closes: the builder dropped structures from the starting fleet and the app invented one dock by a fixed
  // rule, so no test ever compared a new game with the sheet. Each faction is checked, for me and as a rival.
  test.each(FACTIONS)('%s: for me', faction => {
    const game = createGame({ expansions: ['pok', 'te'], playerCount: 3, faction }, pack);
    const state = stateOf(game);
    const def = pack.factions[faction];
    const ships: UnitCounts = Object.fromEntries(Object.entries(def.startUnits).filter(([id]) => !pack.units[id as keyof typeof pack.units]?.ground));
    const ground: UnitCounts = Object.fromEntries(Object.entries(def.startUnits).filter(([id]) => pack.units[id as keyof typeof pack.units]?.ground));
    expect(state.systems[homeSlot(game, pack)!]).toEqual(ships);
    expect(state.ground[firstHome(faction)] ?? {}).toEqual(ground);
    expect(state.docks).toEqual(docksOf(faction));
    expect(pdsOf(state)).toEqual(pdsExpected(faction));
  });

  test.each(FACTIONS.filter(id => id !== 'sol'))('%s: as a rival', faction => {
    const game = game3('sol', faction);
    const [rival] = game.opponents;
    const slot = seatSlots(game.playerCount, pack, game.layout)[rival.seat - 1];
    const state = project(game, game.plans[0], 'forecast', pack).state.rivals![rival.id];
    const def = pack.factions[faction];
    // The gate of Creuss stands on the map while its home is off it: the start units then wait in the seat's own slot.
    const ships = game.enemyUnits[slot][rival.id];
    expect(ships).toEqual(Object.fromEntries(Object.entries(def.startUnits).filter(([id]) => !pack.units[id as keyof typeof pack.units]?.ground)));
    expect(game.docks.filter(id => pack.tiles[def.homeTile].planetIds.includes(id))).toEqual(docksOf(faction));
    expect(Object.fromEntries(Object.entries(game.pds).filter(([id]) => pack.tiles[def.homeTile].planetIds.includes(id)))).toEqual(pdsExpected(faction));
    expect(state.docks).toEqual(expect.arrayContaining(docksOf(faction)));
    expect(pdsOf(state)).toMatchObject(pdsExpected(faction));
  });
});

describe('starting structures follow the faction and the seat', () => {
  test('Ral Nel, Sardakk and Argent start with their PDS and dock, Jol-Nar with two PDS, Sol with a dock only', () => {
    for (const [faction, pds] of [['ralnel', 2], ['sardakk', 1], ['argent', 1], ['jolnar', 2], ['sol', 0]] as const) {
      const game = createGame({ expansions: ['pok', 'te'], playerCount: 6, faction }, pack);
      expect(game.docks).toEqual([firstHome(faction)]);
      expect(game.pds).toEqual(pds > 0 ? { [firstHome(faction)]: pds } : {});
    }
  });

  test('changing my faction takes the old start structures away and brings the new ones', () => {
    let game = createGame({ expansions: ['pok', 'te'], playerCount: 6, faction: 'ralnel' }, pack);
    game = setPlayerFaction(game, 0, 'sol', pack);
    expect(game.pds).toEqual({});
    expect(game.docks).toEqual([firstHome('sol')]);
    game = setPlayerFaction(game, 0, 'xxcha', pack);
    expect(game.pds).toEqual({ [firstHome('xxcha')]: 1 });
    expect(game.docks).toEqual([firstHome('xxcha')]);
  });

  test('a faction without a dock on its sheet gets none (a made-up sheet: the packs have no such faction)', () => {
    const bare = structuredClone(pack);
    bare.factions.sol = { ...bare.factions.sol, startStructures: { pds: 1 } };
    const game = createGame({ expansions: ['pok', 'te'], playerCount: 6, faction: 'sol' }, bare);
    expect(game.docks).toEqual([]);
    expect(game.pds).toEqual({ jord: 1 });
    const rival = placeStartUnits(setPlayerFaction(createGame({ expansions: ['pok', 'te'], playerCount: 3, faction: 'ralnel' }, bare), 1, 'sol', bare), bare);
    expect(rival.docks).not.toContain('jord');
    expect(rival.pds.jord).toBe(1);
  });

  test('my home tile off the map: the start PDS stand on the first planet of the tile at my seat, like the dock', () => {
    const game = createGame({ expansions: ['pok', 'te'], playerCount: 6, faction: 'ralnel' }, pack);
    game.map = parseMapString(MAP_STRING, 6, pack).map;
    const argent = pack.tiles['58'].planetIds;
    const state = stateOf(game);
    expect(state.docks).toEqual([argent[0]]);
    expect(pdsOf(state)).toEqual({ [argent[0]]: 2 });
  });

  test('removing a rival takes their start structures with them', () => {
    const game = game4('sol', 'ralnel');
    expect(Object.keys(game.pds)).toEqual([firstHome('ralnel')]);
    const after = removePlayer(game, 1, pack);
    expect(after.pds).toEqual({});
    expect(after.docks).toEqual([firstHome('sol')]);
  });
});
