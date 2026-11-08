import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { rotateLanes } from './lanes';
import { defaultLayout, layoutChoices, seatSlots, slotsFor, templateFor } from './mapBuilder';
import { createGame } from './newGame';
import { routeDistances } from './project';
import { RETIRED_SEVEN_HOMES, withoutRetiredLayout } from './retiredLayouts';
import type { DataPack, Game, MapLayout } from './types';

// The maps of the Prophecy of Kings rulebook: page 9 (five, seven and eight players) and page 12, the Map Appendix
// (alternate hyperlanes for seven and eight players, the Large Galaxy for six).
const pok = loadPack(['pok']);
const base = loadPack([]);

const template = (players: number, layout: MapLayout) => templateFor(players, layout, pok)!;
const lanesOf = (players: number, layout: MapLayout) =>
  template(players, layout).slots.filter(slot => slot.fixed && pok.tiles[slot.fixed.split('@')[0]]?.kind === 'hyperlane');
const sides = (players: number, layout: MapLayout) => lanesOf(players, layout).map(slot => slot.fixed!.split('@')[0]).sort();
/** The lines a slot's lane draws, turned as it lies. */
const lines = (fixed: string): [number, number][] => {
  const [id, turns] = fixed.split('@');
  return rotateLanes(pok.tiles[id].lanes!, Number(turns ?? 0));
};

describe('slots and homes counted on the diagrams', () => {
  // Slots: every hex of the diagram, Mecatol Rex included. Free: what the deal and the speaker fill.
  test.each([
    [5, 'hyperlanes', 37, 5 * (3 + 2)],
    [6, 'large', 61, 6 * (6 + 3)],
    [7, 'hyperlanes', 61, 7 * (4 + 2) + 5],
    [7, 'alternate', 49, 7 * (3 + 2)],
    [8, 'standard', 61, 8 * (4 + 2) + 4],
    [8, 'alternate', 55, 8 * (3 + 2)],
  ] as const)('%i players, %s: %i slots, the free ones take the deal', (players, layout, slots, dealt) => {
    const t = template(players, layout);
    expect(t.slots).toHaveLength(slots);
    expect(t.homes).toHaveLength(players);
    expect(new Set(t.homes).size).toBe(players);
    const free = t.slots.filter(slot => !slot.fixed && !t.homes!.includes(`${slot.q},${slot.r}`));
    expect(free).toHaveLength(dealt);
    expect(t.slots.find(slot => slot.q === 0 && slot.r === 0)?.fixed).toBe('18');
  });

  test('homes go seat 1 at the top, then clockwise', () => {
    expect(seatSlots(6, pok, 'large')).toEqual(['0,-4', '4,-4', '4,0', '0,4', '-4,4', '-4,0']);
    expect(seatSlots(7, pok, 'hyperlanes')).toEqual(['0,-4', '3,-4', '4,-2', '3,1', '-3,4', '-4,2', '-3,-1']);
    expect(seatSlots(7, pok, 'alternate')).toEqual(['0,-4', '3,-3', '3,0', '0,4', '-3,4', '-4,2', '-3,-1']);
    expect(seatSlots(8, pok, 'standard')).toEqual(['0,-4', '3,-4', '4,-2', '3,1', '0,4', '-3,4', '-4,2', '-3,-1']);
    expect(seatSlots(8, pok, 'alternate')).toEqual(seatSlots(8, pok, 'standard'));
  });

  test('the eight-player alternate map is the same turned by half a circle', () => {
    const keys = new Set(template(8, 'alternate').slots.map(s => `${s.q},${s.r}`));
    for (const key of keys) {
      const [q, r] = key.split(',').map(Number);
      expect(keys.has(`${-q},${-r}`)).toBe(true);
    }
  });
});

describe('hyperlanes as the rulebook lists them', () => {
  test('five and seven players: 83A, 84A, 85A, 86A, 87A and 88A', () => {
    expect(sides(5, 'hyperlanes')).toEqual(['83A', '84A', '85A', '86A', '87A', '88A']);
    expect(sides(7, 'hyperlanes')).toEqual(['83A', '84A', '85A', '86A', '87A', '88A']);
  });

  test('seven players alternate: 83B, 84B, 85B, 86B, 88B and 90B', () => {
    expect(sides(7, 'alternate')).toEqual(['83B', '84B', '85B', '86B', '88B', '90B']);
  });

  test('eight players alternate: 83B, 85B, 87A, 88A, 89B and 90B', () => {
    expect(sides(8, 'alternate')).toEqual(['83B', '85B', '87A', '88A', '89B', '90B']);
  });

  test('the Large Galaxy and the eight-player map have none', () => {
    expect(lanesOf(6, 'large')).toEqual([]);
    expect(lanesOf(8, 'standard')).toEqual([]);
  });

  test('the seven-player formation is the five-player one, one ring further out, with the same lines', () => {
    const five = Object.fromEntries(lanesOf(5, 'hyperlanes').map(s => [`${s.q},${s.r + 1}`, lines(s.fixed!)]));
    const seven = Object.fromEntries(lanesOf(7, 'hyperlanes').map(s => [`${s.q},${s.r}`, lines(s.fixed!)]));
    expect(seven).toEqual(five);
  });

  test('the drawn lines of the alternate maps', () => {
    const drawn = (players: number) => Object.fromEntries(lanesOf(players, 'alternate').map(s => [`${s.q},${s.r}`, lines(s.fixed!)]));
    // A straight line with an arc at each end, a straight line with one arc, and three lines meeting at one edge.
    expect(drawn(7)).toEqual({
      '1,-3': [[0, 2], [0, 3], [3, 5]], '0,-1': [[0, 2], [0, 3], [3, 5]], '-3,1': [[1, 5], [2, 4], [2, 5]],
      '0,1': [[0, 3], [0, 4], [1, 3]], '1,2': [[0, 3], [0, 4], [1, 3]], '-1,1': [[0, 3], [0, 4]],
    });
    expect(drawn(8)).toEqual({
      '0,-1': [[0, 3], [1, 3], [3, 5]], '0,1': [[0, 2], [0, 3], [0, 4]], '-1,1': [[0, 3], [0, 4]], '1,-1': [[0, 3], [1, 3]],
      '-3,1': [[1, 5], [2, 4], [2, 5]], '3,-1': [[1, 5], [2, 4], [2, 5]],
    });
  });
});

describe('moving through the seven-player formation', () => {
  const seven = (): Game => {
    const game = createGame({ expansions: ['pok'], playerCount: 7, faction: 'sol' }, pok);
    const map = { ...game.map };
    for (const slot of slotsFor(7, pok, 'hyperlanes')) map[`${slot.q},${slot.r}`] ??= '25';
    return { ...game, map };
  };

  test('the arc of 86A joins the two systems beside it in one step', () => {
    expect(routeDistances(seven(), '1,1', pok).get('-1,2')).toBe(1);
  });

  test('83A, 85A and 84A carry a ship across the bottom of the map in one step', () => {
    const steps = routeDistances(seven(), '2,2', pok);
    expect(steps.get('-2,4')).toBe(1);
    expect(steps.has('0,4')).toBe(false);
  });
});

describe('the default layout is the rules one', () => {
  test.each([[3, 'standard'], [4, 'standard'], [5, 'hyperlanes'], [6, 'standard'], [7, 'hyperlanes'], [8, 'standard']] as const)(
    '%i players: %s', (players, layout) => {
      expect(defaultLayout(players, pok)).toBe(layout);
      expect(createGame({ expansions: ['pok'], playerCount: players, faction: 'sol' }, pok).layout).toBe(layout);
    },
  );

  test('without Prophecy of Kings five players have no hyperlanes', () => {
    expect(defaultLayout(5, base)).toBe('standard');
  });

  test('each player count offers the layouts of the rules', () => {
    expect([3, 4, 5, 6, 7, 8].map(layoutChoices)).toEqual([
      ['standard', 'hyperlanes'], ['standard', 'hyperlanes'], ['standard', 'hyperlanes'],
      ['standard', 'large'], ['hyperlanes', 'alternate'], ['standard', 'alternate'],
    ]);
    for (const [players, choices] of [3, 4, 5, 6, 7, 8].map(n => [n, layoutChoices(n)] as const)) {
      for (const layout of choices) expect(templateFor(players, layout, pok)).toBeDefined();
    }
  });
});

describe('the retired seven-player map without hyperlanes', () => {
  /** A seven-player game as the app saved it before: four full rings, Milty's homes. */
  const retired = (pack: DataPack = pok): Game => {
    const game = createGame({ expansions: ['pok'], playerCount: 7, faction: 'sol' }, pack);
    const factions = ['sol', 'hacan', 'arborec', 'jolnar', 'naalu', 'xxcha', 'yin'];
    const map: Game['map'] = { '0,0': '18' };
    RETIRED_SEVEN_HOMES.forEach((slot, i) => { map[slot] = pack.factions[factions[i]].homeTile; });
    return {
      ...game, layout: 'standard', map: { ...map, '1,0': '25', '3,-4': '26', '1,3': '27' },
      opponents: factions.slice(1).map((faction, i) => ({ id: `o${i + 2}`, faction, vp: 0, seat: i + 2, color: i + 2 })),
      enemyUnits: { '3,-3': { o2: { carrier: 1 } } },
    };
  };

  test('moves to the rulebook map: homes to the new seats with their units, lanes over what stood under them', () => {
    const game = retired();
    const next = withoutRetiredLayout(game, pok);
    expect(next.layout).toBe('hyperlanes');
    const homes = seatSlots(7, pok, 'hyperlanes');
    homes.forEach((slot, i) => expect(next.map[slot]).toBe(game.map[RETIRED_SEVEN_HOMES[i]]));
    // Hacan's home went from 3,-3 to 3,-4, with its carrier; the tile there took the old home slot.
    expect(next.enemyUnits).toEqual({ '3,-4': { o2: { carrier: 1 } } });
    expect(next.map['3,-3']).toBe('26');
    expect(next.map['1,0']).toBe('25');
    // 1,3 lies under 83A now.
    expect(next.map['1,3']).toBe('83A@0');
    expect(next.map['0,4']).toBe('85A@0');
    expect(Object.values(next.map)).not.toContain('27');
  });

  test('a plan follows the home that moved', () => {
    const game = retired();
    const plan = game.plans[0];
    const entry = { id: 'e1', phase: 'action' as const, status: 'planned' as const, type: 'tactical' as const, systemId: '3,0', moves: [{ from: '3,-3', units: { carrier: 1 } }], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 } };
    const withPlan = { ...game, plans: [{ ...plan, rounds: [{ number: 1, strategyCard: null, backupCard: null, entries: [entry] }] }] };
    const moved = withoutRetiredLayout(withPlan, pok).plans[0].rounds[0].entries[0];
    expect(moved).toMatchObject({ systemId: '4,-2', moves: [{ from: '3,-4' }] });
  });

  test('other games are left alone', () => {
    const eight = createGame({ expansions: ['pok'], playerCount: 8, faction: 'sol' }, pok);
    expect(withoutRetiredLayout(eight, pok)).toBe(eight);
    const seven = createGame({ expansions: ['pok'], playerCount: 7, faction: 'sol' }, pok);
    expect(withoutRetiredLayout(seven, pok)).toBe(seven);
  });
});
