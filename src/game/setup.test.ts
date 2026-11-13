/** Setup by the rule (LRR "Setup"): each test names what the rules give a player and checks the board holds it. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { createGame } from '../domain/newGame';
import { setPlayerFaction } from '../domain/players';
import { seatSlots } from '../domain/mapBuilder';
import { tableOf } from './fromLegacy';
import { initialBoard, setup } from './setup';
import type { Table } from './types';

const pack = loadPack(['pok', 'te']);

function tableFor(factions: string[], expansions: ('pok' | 'te')[] = ['pok', 'te']): Table {
  let game = createGame({ expansions, playerCount: factions.length, faction: '' }, pack);
  factions.forEach((faction, i) => { game = setPlayerFaction(game, i, faction, pack); });
  return tableOf(game);
}

const homeOf = (faction: string) => pack.tiles[pack.factions[faction].homeTile].planetIds;
const holds = (board: ReturnType<typeof initialBoard>, player: string, id: string) => board.players[player].cards[id];

describe('Sol at seat 1', () => {
  const table = tableFor(['sol', 'hacan', 'arborec']);
  const board = initialBoard(table, pack);
  const slot = seatSlots(3, pack, table.layout)[0];
  const [planet] = homeOf('sol');

  test('the starting fleet is in the space area of the home system, the infantry on the home planet', () => {
    expect(board.systems[slot].ships.p1).toEqual({ carrier: 2, destroyer: 1, fighter: 3 });
    expect(board.planets[planet].ground.p1).toEqual({ infantry: 5 });
  });

  test('the player controls the home planet, ready, and the faction sheet space dock stands on it', () => {
    expect(board.planets[planet]).toMatchObject({ owner: 'p1', exhausted: false, structures: { spacedock: 1 } });
  });

  test('starting technologies of the sheet are held, ready', () => {
    expect(holds(board, 'p1', 'technology:amd')).toEqual({ state: 'ready', count: 1 });
    expect(holds(board, 'p1', 'technology:nm')).toEqual({ state: 'ready', count: 1 });
  });

  test('command tokens 3, 3 and 2; no commodities and no trade goods (20.2, 21.2)', () => {
    expect(board.players.p1).toMatchObject({ pools: { tactic: 3, fleet: 3, strategy: 2 }, tradeGoods: 0, commodities: 0, vp: 0 });
  });

  test('the agent is unlocked, the commander and hero are locked (51.4); both with Prophecy of Kings', () => {
    const leaders = Object.entries(board.players.p1.cards).filter(([id]) => id.startsWith('leader:'));
    expect(leaders.map(([, h]) => h.state).sort()).toEqual(['locked', 'locked', 'ready']);
  });

  test('every player holds the generic promissory notes of their own colour and their faction notes', () => {
    const notes = Object.keys(board.players.p2.cards).filter(id => id.startsWith('promissory:'));
    expect(notes.every(id => id.endsWith('@p2'))).toBe(true);
    expect(notes.length).toBeGreaterThanOrEqual(5);
    expect(notes.some(id => id.endsWith('_an@p2'))).toBe(true);
  });

  test('without Prophecy of Kings there are no leaders', () => {
    const base = initialBoard({ ...table, expansions: ['te'] }, pack);
    expect(Object.keys(base.players.p1.cards).filter(id => id.startsWith('leader:'))).toEqual([]);
  });
});

describe('what the player chooses', () => {
  test('Winnu chooses a starting technology (setup choice)', () => {
    const table = tableFor(['winnu', 'sol', 'hacan']);
    table.players[0].setup = { technologies: ['technology:det'] };
    const board = initialBoard(table, pack);
    expect(holds(board, 'p1', 'technology:det')).toEqual({ state: 'ready', count: 1 });
  });

  test('the starting structures stand on the chosen home planet, the first one otherwise', () => {
    const faction = Object.keys(pack.factions).find(f => homeOf(f).length > 1 && pack.factions[f].startStructures);
    expect(faction).toBeDefined();
    const table = tableFor([faction!, 'sol', 'arborec']);
    const [first, second] = homeOf(faction!);
    const dock = (board: ReturnType<typeof initialBoard>, planet: string) => board.planets[planet].structures.spacedock ?? 0;
    expect(dock(initialBoard(table, pack), first)).toBe(pack.factions[faction!].startStructures?.spacedock ?? 0);
    table.players[0].setup = { structurePlanet: second };
    const chosen = initialBoard(table, pack);
    expect(dock(chosen, second)).toBe(pack.factions[faction!].startStructures?.spacedock ?? 0);
    expect(dock(chosen, first)).toBe(0);
    // Every home planet is the player's either way.
    expect(homeOf(faction!).every(p => chosen.planets[p].owner === 'p1')).toBe(true);
  });
});

describe('factions with something special', () => {
  test('Mahact purges its own Alliance note at setup (Hubris)', () => {
    const board = initialBoard(tableFor(['mahact', 'sol', 'hacan']), pack);
    expect(Object.keys(board.players.p1.cards).filter(id => id.endsWith('_an@p1'))).toEqual([]);
    expect(Object.keys(board.players.p2.cards).some(id => id.endsWith('_an@p2'))).toBe(true);
  });

  test('a faction whose home lies off the map starts in that system, and holds the planets of the home tile', () => {
    const faction = Object.keys(pack.factions).find(f => pack.factions[f].gateTile)!;
    const def = pack.factions[faction];
    const board = initialBoard(tableFor([faction, 'sol', 'arborec']), pack);
    expect(Object.keys(board.systems[def.homeTile].ships.p1).length).toBeGreaterThan(0);
    expect(homeOf(faction).every(p => board.planets[p].owner === 'p1')).toBe(true);
  });

  test('a player with no faction yet has tokens and the generic notes (69), and nothing of a sheet', () => {
    const board = initialBoard(tableFor(['sol', '', 'hacan']), pack);
    expect(board.players.p2.pools).toEqual({ tactic: 3, fleet: 3, strategy: 2 });
    expect(Object.keys(board.players.p2.cards).every(id => id.startsWith('promissory:') && id.endsWith('@p2'))).toBe(true);
    expect(Object.keys(board.planets).some(p => board.planets[p].owner === 'p2')).toBe(false);
  });
});

describe('setup is a list of events that carry their cause', () => {
  test('every event of setup says it comes from the setup step', () => {
    const events = setup(tableFor(['sol', 'hacan', 'arborec']), pack);
    expect(events.length).toBeGreaterThan(30);
    expect(events.every(e => e.cause?.step === 'round')).toBe(true);
  });
});
