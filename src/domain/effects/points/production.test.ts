/**
 * The infrastructure of production, apart from any component: the points of the count that production asks and the
 * checks it makes for everyone. A throwaway effect is put in the registry of the test's own pack (`give`) in place of a
 * component's file; the components that really use the points have their own tests under `components/`.
 */
import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry, UnitCounts } from '../../types';
import { standing } from '../../rules/registry';
import { adjust, bench, endOf, expectNone, expectStanding, HOME, NEAR, primary, tactical, TARGET, using, warningsOf, type Bench } from '../components/kit';
import { effectsOf } from '../registry';
import type { ComponentEffect } from '../types';
import { appliedFor } from '../entryApply';
import { unitLimitWarnings, systemProduction } from '../../replay/production';

/** A throwaway effect for a component of the bench's pack. */
const give = (table: Bench, id: string, effect: Partial<ComponentEffect>): void => {
  (effectsOf(table.pack) as Map<string, ComponentEffect>).set(id, { tier: 'passive', rule: 'test', ...effect });
};
const TECH = 'technology:aida';
const CARD = 'actionCard:war_machine1';
const over = (table: Bench, entry: Entry) => warningsOf(table, entry).find(w => w.code === 'productionOver')?.params;
const code = (name: string) => name as AnyWarningCode;

const produce = (units: UnitCounts, extra: Partial<Parameters<typeof tactical>[1]> = {}) => tactical(HOME, { production: units, ...extra });
const build = (entry: Entry, options: { faction?: string; technologies?: string[]; game?: Record<string, unknown>; ground?: Record<string, UnitCounts> } = {}) => {
  const entries = options.ground ? [adjust({ ground: options.ground }, 'strategy'), entry] : [entry];
  return bench({
    faction: options.faction ?? 'sol', expansions: ['pok'], start: { technologies: options.technologies ?? [] }, entries,
    game: { planetControl: { h1: 'me', h2: 'me' }, ...options.game },
  });
};

describe('production sources', () => {
  test('productionValue of a PDS: a PDS with a value above 0 produces, and its value is pooled', () => {
    const entry = produce({ infantry: 2 });
    const table = build(entry, { technologies: [TECH], game: { pds: { h1: 2 } } });
    give(table, TECH, { modify: { productionValue: (v, ctx) => (ctx.structure === 'pds' ? 1 : v) } });
    expectNone(warningsOf(table, entry), 'noProduction');
    expectNone(warningsOf(table, entry), 'productionOver');
    const three = produce({ infantry: 3 });
    const more = build(three, { technologies: [TECH], game: { pds: { h1: 2 } } });
    give(more, TECH, { modify: { productionValue: (v, ctx) => (ctx.structure === 'pds' ? 1 : v) } });
    expect(over(more, three)).toMatchObject({ value: 2, count: 3 });
  });

  test('productionValue of a PDS: with no component a PDS produces nothing', () => {
    const entry = produce({ infantry: 1 });
    expectStanding(warningsOf(build(entry, { game: { pds: { h1: 2 } } }), entry), 'noProduction');
  });

  test('unitProduction: the Arborec infantry has the printed 1, pooled by the units on the planet, and a component adds to it', () => {
    const entry = tactical(TARGET, { production: { infantry: 3 }, productionGround: { t1: { infantry: 3 } } });
    const table = build(entry, { faction: 'arborec', ground: { t1: { infantry: 2 } }, game: { planetControl: { t1: 'me' } } });
    expect(over(table, entry)).toMatchObject({ value: 2, count: 3 });
    const better = build(entry, { faction: 'arborec', technologies: [TECH], ground: { t1: { infantry: 2 } }, game: { planetControl: { t1: 'me' } } });
    give(better, TECH, { modify: { unitProduction: v => v + 1 } });
    expectNone(warningsOf(better, entry), 'productionOver');
  });

  test('unitProduction: another faction\'s infantry produces nothing', () => {
    const entry = tactical(TARGET, { production: { infantry: 1 } });
    expectStanding(warningsOf(build(entry, { ground: { t1: { infantry: 2 } }, game: { planetControl: { t1: 'me' } } }), entry), 'noProduction');
  });

  test('planetProduction: a planet I control that a component makes produce counts, with the structures on it in the context', () => {
    const entry = tactical(TARGET, { production: { infantry: 2 } });
    const table = build(entry, { technologies: [TECH], game: { planetControl: { t1: 'me' }, pds: { t1: 1 } } });
    const seen: unknown[] = [];
    give(table, TECH, { modify: { planetProduction: (v, ctx) => { seen.push(ctx); return ctx.structures.pds ? 1 : v; } } });
    expect(over(table, entry)).toMatchObject({ value: 1, count: 2 });
    expect(seen).toContainEqual({ planetId: 't1', systemId: TARGET, structures: { pds: 1, spacedock: 0 } });
  });

  test('planetProduction: a planet I do not control is not asked', () => {
    const entry = tactical(TARGET, { production: { infantry: 1 } });
    const table = build(entry, { technologies: [TECH] });
    give(table, TECH, { modify: { planetProduction: () => 3 } });
    expectStanding(warningsOf(table, entry), 'noProduction');
  });

  test('spaceProduction: a space area with my units can produce, one without cannot', () => {
    const entry = tactical(NEAR, { production: { destroyer: 1 } });
    const table = bench({ faction: 'sol', start: { technologies: [TECH] }, units: { [NEAR]: { cruiser: 1 } }, entries: [entry] });
    give(table, TECH, { modify: { spaceProduction: (v, ctx) => (ctx.units.cruiser ? 5 : v) } });
    expectNone(warningsOf(table, entry), 'noProduction');
    const empty = bench({ faction: 'sol', start: { technologies: [TECH] }, entries: [entry] });
    give(empty, TECH, { modify: { spaceProduction: (v, ctx) => (ctx.units.cruiser ? 5 : v) } });
    expectStanding(warningsOf(empty, entry), 'noProduction');
  });

  test('systemProduction: the pooled value of a system, for a plan\'s own check (PEM)', () => {
    const entry = produce({});
    const table = build(entry, { game: { docks: ['h1', 'h2'] } });
    const { state } = { state: endOf(table) };
    expect(systemProduction(table.game, state, HOME, table.pack)).toBe(5 + 3);
  });
});

describe('the cost and the total of a production', () => {
  test('productionTotal: a play effect with modify changes the total for the entry that names it, once however often it is named', () => {
    const entry = using(produce({ infantry: 9 }), CARD);
    const table = build(entry, { game: { docks: ['h1'] } });
    give(table, CARD, { tier: 'play', modify: { productionTotal: v => v + 4 } });
    expectNone(warningsOf(table, entry), 'productionOver');
    const ten = { ...produce({ infantry: 10 }), uses: [CARD, CARD] } as Entry;
    const tenTable = build(ten, { game: { docks: ['h1'] } });
    give(tenTable, CARD, { tier: 'play', modify: { productionTotal: v => v + 4 } });
    expect(over(tenTable, ten)).toMatchObject({ value: 9, count: 10 });
  });

  test('a play effect\'s modify does not hold for an entry that does not name it', () => {
    const entry = produce({ infantry: 9 });
    const table = build(entry, { game: { docks: ['h1'] } });
    give(table, CARD, { tier: 'play', modify: { productionTotal: v => v + 4 } });
    expectStanding(warningsOf(table, entry), 'productionOver');
  });

  test('unitCost of a play effect: Harrugh Gefhara\'s 0 makes the production free for its entry only', () => {
    const entry = using(produce({ cruiser: 2 }), TECH);
    const table = build(entry, { game: { docks: ['h1'] } });
    give(table, TECH, { tier: 'play', modify: { unitCost: () => 0 } });
    expectNone(warningsOf(table, entry), 'shortResources');
    const plain = produce({ cruiser: 2 });
    const other = build(plain, { game: { docks: ['h1'] } });
    give(other, TECH, { tier: 'play', modify: { unitCost: () => 0 } });
    expectStanding(warningsOf(other, plain), 'shortResources');
  });

  test('productionCost: reduces the combined cost once, only when a unit used PRODUCTION', () => {
    const entry = produce({ cruiser: 1 }, { payment: { planets: ['h2'], tradeGoods: 0 } });
    const table = build(entry, { technologies: [TECH], game: { docks: ['h1'] } });
    give(table, TECH, { modify: { productionCost: v => v - 1 } });
    expectNone(warningsOf(table, entry), 'shortResources');
    const none = tactical(HOME, { production: { infantry: 2 }, payment: { planets: [], tradeGoods: 0 } });
    const without = build(none, { technologies: [TECH] });
    give(without, TECH, { modify: { productionCost: v => v - 1 } });
    expect(warningsOf(without, none).find(w => w.code === 'shortResources')?.params).toMatchObject({ needed: 1, paid: 0 });
  });

  test('unitCost asks the laws in play: a law that changes a cost is counted by the production', () => {
    const law = { ...adjust({}, 'strategy'), gains: ['agenda:conscription'] } as Entry;
    const entry = produce({ infantry: 2 }, { payment: { planets: ['h2'], tradeGoods: 0 } });
    const table = bench({ faction: 'sol', entries: [law, entry], game: { docks: ['h1'] } });
    give(table, 'agenda:conscription', { modify: { unitCost: v => Math.max(v, 1) } });
    expect(warningsOf(table, entry).find(w => w.code === 'shortResources')?.params).toMatchObject({ needed: 2, paid: 1 });
  });

  test('appliedFor with no entry is the passive count', () => {
    const table = bench({ faction: 'sol', start: { technologies: [TECH] } });
    give(table, TECH, { modify: { productionCost: v => v - 1 } });
    const holder = { holdings: { technologies: [TECH], relics: [], promissory: [], hand: [], leaders: {}, exhausted: [] } } as never;
    expect(appliedFor(table.pack, holder, undefined, 'productionCost', 5, { faction: 'sol', wormholes: [], holdings: (holder as { holdings: never }).holdings, pack: table.pack }).value).toBe(4);
  });
});

describe('the checks of production', () => {
  test('dockInfantry: infantry from docks that may not produce them are warned of, ships and mechs are not', () => {
    const entry = produce({ infantry: 2 });
    const table = build(entry, { technologies: [TECH], game: { docks: ['h1'] } });
    give(table, TECH, { modify: { dockInfantry: () => 0 } });
    expectStanding(warningsOf(table, entry), code('dockInfantry'));
    const ships = produce({ cruiser: 1, mech: 1 });
    const other = build(ships, { technologies: [TECH], game: { docks: ['h1'] } });
    give(other, TECH, { modify: { dockInfantry: () => 0 } });
    expectNone(warningsOf(other, ships), code('dockInfantry'));
  });

  test('dockInfantry: another producer in the system may build them', () => {
    const entry = produce({ infantry: 2 });
    const table = build(entry, { technologies: [TECH], game: { docks: ['h1'], pds: { h2: 1 } } });
    give(table, TECH, { modify: { dockInfantry: () => 0, productionValue: (v, ctx) => (ctx.structure === 'pds' ? 1 : v) } });
    expectNone(warningsOf(table, entry), code('dockInfantry'));
  });

  test('warSunLocked: every war sun produced is warned of; nothing is produced, nothing is warned', () => {
    const entry = produce({ warsun: 1 }, { payment: { planets: ['h1', 'h2'], tradeGoods: 9 } });
    expectStanding(warningsOf(build(entry, { game: { docks: ['h1'] } }), entry), code('warSunLocked'));
    const none = produce({ cruiser: 1 });
    expectNone(warningsOf(build(none, { game: { docks: ['h1'] } }), none), code('warSunLocked'));
  });

  test('productionNotAllowed: units entered on Construction\'s primary are warned of and limited by the Production of their system', () => {
    const entry = primary(4, { structures: [{ kind: 'spacedock', planetId: 'h2' }], production: { systemId: HOME, units: { fighter: 4 } } });
    const table = build(entry);
    const warnings = warningsOf(table, entry);
    expectStanding(warnings, code('productionNotAllowed'));
    expect(warnings.find(w => w.code === 'productionOver')?.params).toMatchObject({ value: 3, count: 4 });
  });

  test('productionNotAllowed: a Construction primary without units is not warned of', () => {
    const entry = primary(4, { structures: [{ kind: 'spacedock', planetId: 'h2' }] });
    expectNone(warningsOf(build(entry), entry), code('productionNotAllowed'));
  });

  test('unitLimitWarnings: the pieces of the game for units a step puts on the board', () => {
    const entry = produce({});
    const table = build(entry, { game: {} });
    const state = structuredClone(endOf(table)); // the kernel's state is read-only; this helper writes to its input
    state.systems[HOME] = { cruiser: 8 };
    expect(unitLimitWarnings(state, { cruiser: 1 }, table.pack).map(w => w.code)).toEqual(['reinforcementsOut']);
    expect(unitLimitWarnings(state, { cruiser: 1, infantry: 99, fighter: 99 }, table.pack)).toHaveLength(1);
    expect(unitLimitWarnings(state, {}, table.pack)).toEqual([]);
  });
});

describe('structures and docks', () => {
  test('dockFighters: a dock keeps 3 fighters, and a component changes the number', () => {
    const entry = tactical(HOME, { moves: [{ from: NEAR, units: { cruiser: 1 } }] });
    const table = bench({ faction: 'sol', start: { technologies: [TECH] }, units: { [HOME]: { fighter: 12 }, [NEAR]: { cruiser: 1 } }, entries: [entry], game: { docks: ['h1'] } });
    expect(warningsOf(table, entry).find(w => w.code === 'capacitySystem')?.params).toMatchObject({ load: 9 });
    give(table, TECH, { modify: { dockFighters: () => 12 } });
    expectNone(warningsOf(table, entry), 'capacitySystem');
  });

  test('a component entry\'s production is checked, placed and paid like a card\'s', () => {
    const play = { ...adjust({}, 'action'), type: 'component', componentId: TECH, note: '', effects: { production: { systemId: HOME, units: { cruiser: 1 } }, payment: { planets: [], tradeGoods: 0 } } } as unknown as Entry;
    const table = bench({ faction: 'sol', entries: [play], game: { docks: ['h1'] } });
    const warnings = warningsOf(table, play);
    expect(standing(warnings).map(w => w.code)).toContain('shortResources');
    expect(endOf(table).systems[HOME]).toEqual({ cruiser: 1 });
    expectNone(warnings, 'noProduction');
  });

  test('a structure missing when placed from the space area names its planet', () => {
    const entry = tactical(TARGET, { landings: [{ planetId: 't1', units: {}, structures: { pds: 1 } }] });
    const table = bench({ faction: 'sol', entries: [entry], game: { planetControl: { t1: 'me' } } });
    expect(warningsOf(table, entry).find(w => w.code === 'unitsMissing')?.params).toMatchObject({ unit: 'pds', planetId: 't1' });
  });
});

