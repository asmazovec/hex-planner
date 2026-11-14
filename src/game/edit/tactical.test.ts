import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { createGame } from '../../testing/old/domain/newGame';
import type { UnitCounts } from '../../domain/types';
import type { Entry, EntryBody, Game } from '../../testing/old/domain/types';
import * as old from '../../domain/tactical';
import * as oldOld from '../../testing/old/domain/tactical';
import { heldCards } from '../../domain/strategy';
import { plannedCard as oldPlanned } from '../../testing/old/domain/strategy';
import { newEntryBody, tacticalBody, tacticalOwner as oldOwner } from '../../testing/old/domain/newEntry';
import { factsOf } from '../turnFacts';
import { planOf, tableOf, turnOf } from '../../testing/old/game/fromLegacy';
import { mapSource } from '../space';
import { initialBoard } from '../setup';
import * as now from './tactical';
import { newTurn, plannedCard, tacticalOwner } from './new';

const pack = loadPack(['pok']);
const g: Game = createGame({ expansions: ['pok'], playerCount: 3, faction: 'sol' }, pack);
g.map = { A: '19', B: '20', C: '26', H: pack.factions.sol.homeTile };
const table = tableOf(g);
const at = { map: mapSource(table, initialBoard(table, pack)), pack };
const [pa] = pack.tiles['19'].planetIds;
const [pb] = pack.tiles['20'].planetIds;
const noPay = { planets: [], tradeGoods: 0 };

type Tac = Extract<Entry, { type: 'tactical' }>;
const base = (over: Record<string, unknown> = {}): Tac => ({
  id: 't', phase: 'action', status: 'planned', type: 'tactical', systemId: 'B',
  moves: [{ from: 'A', units: { carrier: 1, fighter: 2 }, via: ['C'] }, { from: pa, units: { infantry: 2 } }, { from: 'C', units: { cruiser: 1 }, pickupOf: 'A' }],
  landings: [{ planetId: pb, units: { infantry: 2, mech: 1 } }], production: { cruiser: 1 }, payment: noPay, ...over,
}) as never;

const turnFor = (e: Tac) => turnOf(table, e, pack);
type T = ReturnType<typeof turnOf>;
/** What the entry is after the old patch, and what the turn is after the new edit, both through the bridge. */
const same = (e: Tac, patch: Partial<Entry>, edited: T) =>
  expect(factsOf(table, edited)).toEqual(factsOf(table, turnOf(table, { ...e, ...patch } as Entry, pack)));
const sameMoves = (e: Tac, moves: unknown, edited: T) => same(e, { moves } as never, edited);

describe('reading the flights', () => {
  const e = base();
  const a = now.tacticalOf(turnFor(e));
  test('sources, groups, via, arrows, empty sources, losses', () => {
    expect(now.sourcesOf(at, a)).toEqual(old.sourcesOf(g, pack, e));
    for (const source of ['A', 'B', 'C']) {
      expect(now.groupOf(at, a.movement, source).length).toBe(old.groupOf(g, pack, e.moves, source).length);
      expect(now.viaOf(a, source)).toEqual(old.viaOf(e, source));
    }
    expect(now.arrowsOf(at, a)).toEqual(old.arrowsOf(g, pack, e));
    const bare = base({ moves: [{ from: 'A', units: {} }], losses: { fighter: 1 }, groundLosses: { [pb]: { infantry: 1 } } });
    expect(now.emptySources(at, now.tacticalOf(turnFor(bare)))).toEqual(oldOld.emptySources(g, pack, bare));
    expect(now.lossesOf(turnFor(bare))).toEqual(old.lossesOf(bare));
    expect(now.isUntouched(turnFor(bare))).toBe(oldOld.isUntouched(bare));
    const none = base({ moves: [], landings: [], production: {} });
    expect(now.isUntouched(turnFor(none))).toBe(oldOld.isUntouched(none));
  });
});

describe('editing the route', () => {
  const e = base();
  test('withRoute: a new way, a new source, a shorter way drops the pickups', () => {
    for (const [source, via] of [['A', ['C']], ['A', []], ['C', ['A']], ['H', []]] as [string, string[]][]) {
      sameMoves(e, old.withRoute(g, pack, e.moves, source, via), now.withRoute(at, turnFor(e), source, via));
    }
  });
  test('withoutSource and withoutEmptySources', () => {
    sameMoves(e, old.withoutSource(g, pack, e.moves, 'A'), now.withoutSource(at, turnFor(e), 'A'));
    const loose = base({ moves: [{ from: 'A', units: {} }, { from: 'H', units: { cruiser: 1 } }, { from: 'C', units: {}, pickupOf: 'A' }] });
    sameMoves(loose, old.withoutEmptySources(g, pack, loose.moves), now.withoutEmptySources(at, turnFor(loose)));
  });
  test('withUnitCount: set, add a pickup, take away, planet of the source', () => {
    const cases = [['A', 'A', 'carrier', 3], ['A', 'A', 'fighter', 0], ['A', 'A', 'cruiser', 1], ['A', pa, 'infantry', 4], ['A', 'C', 'fighter', 2], ['A', pb, 'infantry', 1], ['H', 'H', 'carrier', 1]] as [string, string, 'carrier', number][];
    for (const [source, from, unit, count] of cases) {
      sameMoves(e, oldOld.withUnitCount(g, pack, e.moves, source, from, unit, count), now.withUnitCount(at, turnFor(e), source, from, unit, count));
    }
  });
  test('withStructureCount', () => {
    const cases = [['A', 'A', 'pds', 1], ['A', pa, 'spacedock', 1], ['A', 'C', 'pds', 2], ['A', 'A', 'pds', 0]] as [string, string, 'pds', number][];
    for (const [source, from, kind, count] of cases) {
      sameMoves(e, oldOld.withStructureCount(g, pack, e.moves, source, from, kind, count), now.withStructureCount(at, turnFor(e), source, from, kind, count));
    }
  });
});

describe('editing the landings and the battle', () => {
  const e = base();
  test('landings', () => {
    const cases = [[pb, 'infantry', 5], [pb, 'mech', 0], [pa, 'infantry', 1], [pb, 'infantry', 0]] as [string, 'infantry', number][];
    for (const [planet, unit, count] of cases) same(e, oldOld.withLanding(e, planet, unit, count), now.withLanding(turnFor(e), planet, unit, count));
    same(e, oldOld.withLandingFrom(e, pb, pa, 'infantry', 2), now.withLandingFrom(turnFor(e), pb, pa, 'infantry', 2));
    same(e, oldOld.withLandedStructure(e, pb, 'pds', 1), now.withLandedStructure(turnFor(e), pb, 'pds', 1));
    const from = base({ landings: [{ planetId: pb, units: { infantry: 2 }, from: pa }] });
    same(from, oldOld.withLandingFrom(from, pb, pa, 'infantry', 0), now.withLandingFrom(turnFor(from), pb, pa, 'infantry', 0));
    expect(now.landedFrom(now.tacticalOf(turnFor(from)), pb, pa, 'infantry')).toBe(oldOld.landedFrom(from, pb, pa, 'infantry'));
  });
  test('losses: in space, on a planet, a lander lost and given back', () => {
    const steps: [string | null, 'fighter', number][] = [[null, 'fighter', -1], [pb, 'fighter', -1], [pb, 'fighter', 1], [null, 'fighter', 1]];
    for (const [planet, unit, amount] of steps) same(e, old.withLoss(e, unit, planet, amount), now.withLoss(turnFor(e), unit, planet, amount));
    // A lander of the landing falls: it leaves the landing, counts as lost, and comes back.
    let entry = e;
    let turn = turnFor(e);
    const run = [[pb, 'infantry', -1], [pb, 'infantry', -1], [null, 'infantry', 1], [null, 'mech', 1], [pb, 'mech', -1], [pa, 'infantry', -2], [pa, 'infantry', 2]] as [string | null, 'infantry', number][];
    for (const [planet, unit, amount] of run) {
      entry = { ...entry, ...old.withLoss(entry, unit, planet, amount) } as typeof e;
      turn = now.withLoss(turn, unit, planet, amount);
      expect(factsOf(table, turn), `${planet} ${unit} ${amount}`).toEqual(factsOf(table, turnFor(entry)));
    }
  });
  test('fleet removals', () => {
    same(e, oldOld.withFleetRemoval(e, 'cruiser', 2), now.withFleetRemoval(turnFor(e), 'cruiser', 2));
    const some = base({ fleetRemovals: { cruiser: 1 } });
    same(some, oldOld.withFleetRemoval(some, 'cruiser', -1), now.withFleetRemoval(turnFor(some), 'cruiser', -1));
  });
});

describe('editing the production and its payment', () => {
  const e = base();
  const price = (units: UnitCounts): number => Object.entries(units).reduce((sum, [u, n]) => sum + (n ?? 0) * (pack.units[u as 'cruiser']?.cost ?? 0), 0);
  const pay = (cost: number) => ({ planets: [pa], tradeGoods: cost });
  test('withProduction: ships, ground forces by planet, the payment follows the price', () => {
    // The old function asks the replay for the price; the same price and payment are given to the twin here.
    const oldWith = (entry: Tac, unit: 'cruiser', planet: string | null, amount: 1 | -1, manual: boolean) => {
      const production = old.withCount(entry.production, unit, (entry.production[unit] ?? 0) + amount);
      const cost = price(production);
      const seed = !manual && cost !== price(entry.production);
      const { [planet ?? '']: onPlanet = {}, ...others } = entry.productionGround ?? {};
      const units = old.withCount(onPlanet, unit, (onPlanet[unit] ?? 0) + amount);
      const ground = Object.keys(units).length > 0 ? { ...others, [planet ?? '']: units } : others;
      return { production, ...(planet === null || !old.isGround(pack, unit) ? {} : { productionGround: Object.keys(ground).length > 0 ? ground : undefined }), ...(seed ? { payment: pay(cost) } : {}) };
    };
    const cases = [['cruiser', null, 1, false], ['cruiser', null, -1, false], ['infantry', pb, 1, false], ['infantry', pb, 1, true], ['infantry', pa, -1, false], ['carrier', null, 1, true]] as ['cruiser', string | null, 1 | -1, boolean][];
    for (const [unit, planet, amount, manual] of cases) {
      same(e, oldWith(e, unit, planet, amount, manual), now.withProduction(turnFor(e), unit, planet, amount, u => old.isGround(pack, u), price, pay, manual));
    }
  });
  test('the payment by hand and the custodians', () => {
    const paid = { planets: [pb], tradeGoods: 1 };
    same(e, { payment: paid }, now.withProductionPayment(turnFor(e), paid));
    same(e, { custodiansPayment: paid }, now.withCustodiansPayment(turnFor(e), true, false, () => paid));
    const had = base({ custodiansPayment: paid });
    same(had, { custodiansPayment: undefined }, now.withCustodiansPayment(turnFor(had), false, false, () => paid));
    same(had, {}, now.withCustodiansPayment(turnFor(had), true, false, () => noPay));
    same(e, {}, now.withCustodiansPayment(turnFor(e), true, true, () => paid));
  });
  test('a turn that is not tactical comes back as it is', () => {
    const pass = turnOf(table, { id: 'p', phase: 'action', status: 'planned', type: 'pass' } as Entry, pack);
    expect(now.withLanding(pass, pb, 'infantry', 1)).toBe(pass);
  });
});

describe('new turns', () => {
  const round = g.plans[0].rounds[0];
  const kernelRound = planOf(table, g.plans[0], pack)[0];
  const body = (b: EntryBody, id: string, owner?: string) => ({ ...b, id, status: 'planned', phase: 'action', ...(b.type === 'adjustment' ? {} : { acts: [] }), ...(owner ? { owner } : {}) });
  test('a tactical action, free from a card', () => {
    const turn = newTurn('tactical', { id: 'n', player: 'p1', viewer: 'p1', round: kernelRound }, { system: 'B' });
    expect(factsOf(table, turn)).toEqual(body(tacticalBody('B'), 'n'));
    const free = newTurn('tactical', { id: 'n', player: 'p1', viewer: 'p1', round: kernelRound }, { system: 'B', byCard: 'w' });
    expect(factsOf(table, free)).toEqual({ ...body(tacticalBody('B', 'w'), 'n'), fromCard: undefined });
  });
  test('the other kinds, mine and a rival', () => {
    const rival = table.players[1];
    const key = rival.legacyId ?? rival.id;
    for (const kind of ['strategic', 'component', 'pass', 'adjustment'] as const) {
      expect(factsOf(table, newTurn(kind, { id: 'n', player: 'p1', viewer: 'p1', round: kernelRound })), kind).toEqual(body(newEntryBody(kind, round, 3), 'n'));
      expect(factsOf(table, newTurn(kind, { id: 'n', player: rival.id, viewer: 'p1', round: kernelRound })), kind).toEqual(body(newEntryBody(kind, round, 3, key), 'n', key));
    }
  });
  test('the planned card skips the cards already played; the owner of a free action is the owner of the card', () => {
    const cards = { ...round, strategyCard: 1, backupCard: 2, entries: [{ id: 'k', phase: 'action', status: 'planned', type: 'strategic', card: 1 } as Entry] };
    const gg = { ...g, plans: [{ ...g.plans[0], rounds: [cards] }] } as Game;
    const kr = planOf(tableOf(gg), gg.plans[0], pack)[0];
    expect(plannedCard(kr, 'p1')).toBe(oldPlanned(cards, 3));
    expect(heldCards(cards, 3).length).toBeGreaterThan(0);
    expect(tacticalOwner(kr, 'k', 'p2')).toBe('p1');
    expect(tacticalOwner(kr, undefined, 'p2')).toBe('p2');
    expect(oldOwner(cards, undefined, 'x')).toBe('x');
  });
});
