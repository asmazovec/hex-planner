import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { createGame } from '../../domain/newGame';
import { stateBeforeEntry } from '../../domain/project';
import * as old from '../../domain/tactical';
import { commitSources } from '../../domain/commitSources';
import { blockersOf } from '../../domain/movement';
import { systemPlanets } from '../../domain/replay/board';
import { pickupAllowed } from '../../domain/replay/transport';
import { productionDue } from '../../domain/replay/production';
import { autoPay } from '../../domain/payment';
import type { Entry, EntryBody, Game, UnitCounts } from '../../domain/types';
import { legacyEntry } from '../entry';
import { turnOf } from '../fromLegacy';
import { routeHintOn } from '../flight';
import { planetsIn } from '../space';
import { timelineOf } from '../../state/projection';
import { UNIT_ORDER } from '../../ui/units/unitOrder';
import * as now from './tacticalRead';
import { tacticalOf, withCustodiansPayment as withCustodians } from './tactical';

const pack = loadPack(['pok']);
const mecatol = pack.tiles['18'].planetIds[0];
const [pb] = pack.tiles['20'].planetIds;
const noPay = { planets: [], tradeGoods: 0 };

let n = 0;
const entry = (body: EntryBody, phase: Entry['phase'] = 'action', status: Entry['status'] = 'planned'): Entry => ({ ...body, id: `x${++n}`, phase, status }) as Entry;
const setup = (systemId: string, units: UnitCounts) => entry({ type: 'adjustment', label: 'setup', delta: { units: { systemId, units } } }, 'strategy', 'done');
const groundSetup = (planetId: string, units: UnitCounts) => entry({ type: 'adjustment', label: 'setup', delta: { units: { systemId: 'A', units: {} }, ground: { [planetId]: units } } }, 'strategy', 'done');
const tactical = (over: Record<string, unknown>) => ({ type: 'tactical', systemId: 'B', moves: [], landings: [], production: {}, payment: noPay, ...over }) as EntryBody;

function build(faction: string, body: Record<string, unknown>) {
  const g: Game = createGame({ expansions: ['pok'], playerCount: 3, faction }, pack);
  g.map = { A: '19', B: '20', C: '26', M: '18', H: pack.factions[faction].homeTile };
  const entries = [
    setup('A', { carrier: 1, cruiser: 1, fighter: 2, infantry: 2 }), setup('C', { destroyer: 1 }), groundSetup(pb, { infantry: 3, mech: 1 }),
    { ...entry(tactical(body)), id: 'm' },
  ];
  g.plans[0].rounds = [{ number: 1, strategyCard: null, backupCard: null, entries }];
  const line = timelineOf(g, g.plans[0], 'forecast', pack);
  const { table } = line.kernel;
  const frame = line.kernel.byTurn.get('m')!;
  const e = entries[3] as Extract<Entry, { type: 'tactical' }>;
  return { g, e, table, board: frame.before, turn: turnOf(table, e, pack), before: stateBeforeEntry(g, g.plans[0], 'm', pack), player: 'p1' };
}

const BODY = {
  moves: [{ from: 'A', units: { carrier: 1, fighter: 2, infantry: 1 }, via: ['C'], structures: { pds: 1 } }, { from: pb, units: { infantry: 2 }, pickupOf: 'A' }, { from: 'C', units: { destroyer: 1 }, pickupOf: 'A' }],
  landings: [{ planetId: pb, units: { infantry: 2 } }, { planetId: mecatol, units: { infantry: 1 } }], losses: { fighter: 1, infantry: 1 }, groundLosses: { [pb]: { infantry: 1 } },
  production: { cruiser: 1 }, shipsTo: 'A',
};

describe.each(['sol', 'naalu', 'arborec'])('the readers of a tactical action, %s', faction => {
  const t = build(faction, BODY);
  const at = now.atOf(t.table, t.board, pack);

  test('after the battle, the structures that arrived, the custodians', () => {
    expect(now.afterBattle(pack, t.turn, t.board, UNIT_ORDER)).toEqual(old.afterBattle(pack, t.e, t.before, UNIT_ORDER));
    expect(now.structuresArrived(t.turn, t.board)).toEqual(old.structuresArrived(t.e, t.before));
    expect(now.custodiansLanding(t.board, t.turn, pack)).toBe(old.custodiansLanding(t.before, t.e, pack));
    expect(now.custodiansLanding(t.board, t.turn, pack)).toBe(mecatol);
  });

  test('where a flight takes from, and what it can still take', () => {
    for (const from of ['A', 'C', 'B', pb]) {
      for (const unit of ['carrier', 'infantry', 'fighter'] as const) {
        expect(now.availableFor(at, t.board, t.turn, 'A', from, unit), `${from} ${unit}`).toBe(old.availableFor(t.g, pack, t.before, t.e, 'A', from, unit));
        expect(now.pickedFrom(tacticalOf(t.turn).movement, from, unit)).toBe(old.pickedFrom(t.e.moves, from, unit));
      }
      for (const kind of ['pds', 'spacedock'] as const) {
        expect(now.structuresFor(at, t.board, t.turn, 'A', from, kind), `${from} ${kind}`).toBe(old.structuresFor(t.g, pack, t.before, t.e, 'A', from, kind));
        expect(now.structuresAt(t.board, pack, t.player, from, kind)).toBe(old.structuresAt(t.before, pack, from, kind));
        expect(now.pickedStructures(tacticalOf(t.turn).movement, from, kind)).toBe(old.pickedStructures(t.e.moves, from, kind));
      }
    }
  });

  test('ships and cargo, the commit sources, the planets of a system', () => {
    const units = { carrier: 1, fighter: 2, infantry: 1, mech: 1 } as UnitCounts;
    expect(now.splitFlightOn(t.table, t.board, pack, t.player, units)).toEqual(old.splitFlight(t.g, pack, t.before.holdings, units));
    expect(now.commitSourcesOn(t.table, t.board, pack, t.player, 'B')).toEqual(commitSources(t.g, pack, t.before, 'B'));
    expect(now.commitSourcesOn(t.table, t.board, pack, t.player, 'A')).toEqual(commitSources(t.g, pack, t.before, 'A'));
    for (const slot of ['A', 'B', 'C', 'M']) {
      expect(planetsIn(t.table, t.board, pack, slot)).toEqual(systemPlanets(t.g, slot, pack).map(p => p.id));
      expect(now.isValidSource(t.table, t.board, pack, t.player, slot)).toBe(old.isValidSource(t.g, pack, t.before, slot));
      expect(now.pickupAllowedOn(t.board, t.player, 'B', slot)).toBe(pickupAllowed(t.before, 'B', slot));
    }
    expect(now.sourceSystemsOn(t.table, t.board, pack, t.player)).toEqual(old.sourceSystems(t.g, pack, t.before));
    expect(now.tileSystemsOn(t.table, t.board, pack)).toEqual(old.tileSystems(t.g, pack));
  });

  test('the systems of an entry for the camera', () => {
    expect(now.tacticalSystems(at, t.turn)).toEqual(old.entrySystems(t.g, pack, t.e));
  });

  test('the hint of a route: speed, steps, what is left and the reach', () => {
    for (const [path, active] of [[['A', 'C'], 'B'], [['A'], 'B'], [['A', 'C', 'B'], 'B'], [['C'], 'B'], [['B'], null]] as [string[], string | null][]) {
      const hint = routeHintOn(t.table, t.board, pack, t.player, path, active, () => new Set());
      const was = old.routeHint(t.g, path, t.before, active, pack, () => blockersOf(t.g, null, undefined, pack));
      expect({ ...hint, reach: [...hint.reach].sort() }, path.join()).toEqual({ ...was, reach: [...was.reach].sort() });
    }
  });
});

describe('the edits that read the board', () => {
  const t = build('sol', { ...BODY, landings: [], moves: [{ from: 'A', units: { carrier: 1 } }], production: {}, shipsTo: undefined });
  const same = (patch: Partial<Entry>, edited: ReturnType<typeof turnOf>) =>
    expect(legacyEntry(t.table, edited)).toEqual(legacyEntry(t.table, turnOf(t.table, { ...t.e, ...patch } as Entry, pack)));

  test('the production: the price the check asks, the payment of the ready planets, by hand or not', () => {
    for (const [unit, planet, amount, manual] of [['cruiser', null, 1, false], ['carrier', null, 1, true], ['infantry', pb, 1, false]] as ['cruiser', string | null, 1, boolean][]) {
      same(old.withProduction(t.e, t.before, t.g.faction, unit, planet, amount, pack, manual, t.g), now.withProductionOn(t.table, t.board, pack, t.turn, unit, planet, amount, manual));
    }
    const cost = productionDue(t.g, t.before, { cruiser: 1 }, pack, t.e);
    expect(autoPay(t.before, cost, 'resources', pack, { faction: t.g.faction })).toEqual(now.withProductionOn(t.table, t.board, pack, t.turn, 'cruiser', null, 1, false).action.kind === 'tactical'
      ? (now.withProductionOn(t.table, t.board, pack, t.turn, 'cruiser', null, 1, false).action as { production: { payment: unknown } }).production.payment : null);
  });

  test('the custodians payment follows the landing', () => {
    const landed = build('sol', { ...BODY });
    const oldPatch = old.withCustodiansPayment(landed.e, landed.before, landed.g.faction, pack, false);
    same2(landed, oldPatch, now.withCustodiansOn(landed.table, landed.board, pack, landed.turn, false));
    const none = build('sol', { ...BODY, landings: [] });
    same2(none, old.withCustodiansPayment({ ...none.e, custodiansPayment: noPay }, none.before, none.g.faction, pack, false), now.withCustodiansOn(none.table, none.board, pack, { ...none.turn, action: { ...(none.turn.action as object), custodians: noPay } as never }, false));
    expect(withCustodians).toBeTypeOf('function');
  });

  test('the shipping of the production', () => {
    same({ shipsTo: 'C' }, now.withShipsTo(t.turn, 'C'));
    same({ shipsTo: undefined }, now.withShipsTo(now.withShipsTo(t.turn, 'C'), undefined));
  });
});

function same2(t: ReturnType<typeof build>, patch: Partial<Entry>, edited: ReturnType<typeof turnOf>) {
  expect(legacyEntry(t.table, edited)).toEqual(legacyEntry(t.table, turnOf(t.table, { ...t.e, ...patch } as Entry, pack)));
}
