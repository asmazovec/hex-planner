import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { createGame } from '../../testing/old/domain/newGame';
import { stateBeforeEntry } from '../../testing/old/domain/project';
import * as old from '../../domain/tactical';
import * as oldOld from '../../testing/old/domain/tactical';
import { blockersOf } from '../../testing/old/domain/movement';
import { systemPlanets } from '../../domain/replay/board';
import { pickupAllowed } from '../../domain/replay/transport';
import { autoPay } from '../../testing/old/domain/payment';
import type { UnitCounts } from '../../domain/types';
import type { Entry, EntryBody, Game } from '../../testing/old/domain/types';
import { holderOf, inForceOf } from '../../domain/effects/registry';
import { factsOf } from '../turnFacts';
import { turnOf } from '../../testing/old/game/fromLegacy';
import { routeHintOn } from '../flight';
import { planetsIn } from '../space';
import { timelineOf } from '../../testing/projection';
import { UNIT_ORDER } from '../../ui/units/unitOrder';
import * as now from './tacticalRead';
import { warningsByTurn } from '../rowWarnings';
import { withDeltaSystem } from './turn';
import { tacticalOf, withCustodiansPayment as withCustodians } from './tactical';
import { productionDue } from '../../testing/old/domain/replay/production';

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
    expect(now.afterBattle(pack, t.turn, t.board, UNIT_ORDER)).toEqual(oldOld.afterBattle(pack, t.e, t.before, UNIT_ORDER));
    expect(now.structuresArrived(t.turn, t.board)).toEqual(oldOld.structuresArrived(t.e, t.before));
    expect(now.custodiansLanding(t.board, t.turn, pack)).toBe(oldOld.custodiansLanding(t.before, t.e, pack));
    expect(now.custodiansLanding(t.board, t.turn, pack)).toBe(mecatol);
  });

  test('where a flight takes from, and what it can still take', () => {
    for (const from of ['A', 'C', 'B', pb]) {
      for (const unit of ['carrier', 'infantry', 'fighter'] as const) {
        expect(now.availableFor(at, t.board, t.turn, 'A', from, unit), `${from} ${unit}`).toBe(oldOld.availableFor(t.g, pack, t.before, t.e, 'A', from, unit));
        expect(now.pickedFrom(tacticalOf(t.turn).movement, from, unit)).toBe(oldOld.pickedFrom(t.e.moves, from, unit));
      }
      for (const kind of ['pds', 'spacedock'] as const) {
        expect(now.structuresFor(at, t.board, t.turn, 'A', from, kind), `${from} ${kind}`).toBe(oldOld.structuresFor(t.g, pack, t.before, t.e, 'A', from, kind));
        expect(now.structuresAt(t.board, pack, t.player, from, kind)).toBe(oldOld.structuresAt(t.before, pack, from, kind));
        expect(now.pickedStructures(tacticalOf(t.turn).movement, from, kind)).toBe(oldOld.pickedStructures(t.e.moves, from, kind));
      }
    }
  });

  test('ships and cargo, the commit sources, the planets of a system', () => {
    const units = { carrier: 1, fighter: 2, infantry: 1, mech: 1 } as UnitCounts;
    expect(now.splitFlightOn(t.table, t.board, pack, t.player, units)).toEqual(oldOld.splitFlight(t.g, pack, t.before.holdings, units));
    expect(now.commitSourcesOn(t.table, t.board, pack, t.player, 'B')).toEqual([{ planetId: 'vefutii', units: { infantry: 3, mech: 1 } }]);
    expect(now.commitSourcesOn(t.table, t.board, pack, t.player, 'A')).toEqual([]);
    for (const slot of ['A', 'B', 'C', 'M']) {
      expect(planetsIn(t.table, t.board, pack, slot)).toEqual(systemPlanets(t.g, slot, pack).map(p => p.id));
      expect(now.isValidSource(t.table, t.board, pack, t.player, slot)).toBe(oldOld.isValidSource(t.g, pack, t.before, slot));
      expect(now.pickupAllowedOn(t.board, t.player, 'B', slot)).toBe(pickupAllowed(t.before, 'B', slot));
    }
    expect(now.sourceSystemsOn(t.table, t.board, pack, t.player)).toEqual(oldOld.sourceSystems(t.g, pack, t.before));
    expect(now.tileSystemsOn(t.table, t.board, pack)).toEqual(oldOld.tileSystems(t.g, pack));
  });

  test('the systems of an entry for the camera', () => {
    expect(now.tacticalSystems(at, t.turn)).toEqual(old.entrySystems(t.g, pack, t.e));
  });

  test('the hint of a route: speed, steps, what is left and the reach', () => {
    for (const [path, active] of [[['A', 'C'], 'B'], [['A'], 'B'], [['A', 'C', 'B'], 'B'], [['C'], 'B'], [['B'], null]] as [string[], string | null][]) {
      const hint = routeHintOn(t.table, t.board, pack, t.player, path, active, () => new Set());
      const was = oldOld.routeHint(t.g, path, t.before, active, pack, () => blockersOf(t.g, null, undefined, pack));
      expect({ ...hint, reach: [...hint.reach].sort() }, path.join()).toEqual({ ...was, reach: [...was.reach].sort() });
    }
  });
});

describe('the edits that read the board', () => {
  const t = build('sol', { ...BODY, landings: [], moves: [{ from: 'A', units: { carrier: 1 } }], production: {}, shipsTo: undefined });
  const same = (patch: Partial<Entry>, edited: ReturnType<typeof turnOf>) =>
    expect(factsOf(t.table, edited)).toEqual(factsOf(t.table, turnOf(t.table, { ...t.e, ...patch } as Entry, pack)));

  test('the production: the price the check asks, the payment of the ready planets, by hand or not', () => {
    for (const [unit, planet, amount, manual] of [['cruiser', null, 1, false], ['carrier', null, 1, true], ['infantry', pb, 1, false]] as ['cruiser', string | null, 1, boolean][]) {
      same(oldOld.withProduction(t.e, t.before, t.g.faction, unit, planet, amount, pack, manual, t.g), now.withProductionOn(t.table, t.board, pack, t.turn, unit, planet, amount, manual));
    }
    const cost = productionDue(t.g, t.before, { cruiser: 1 }, pack, t.e);
    expect(autoPay(t.before, cost, 'resources', pack, { faction: t.g.faction })).toEqual(now.withProductionOn(t.table, t.board, pack, t.turn, 'cruiser', null, 1, false).action.kind === 'tactical'
      ? (now.withProductionOn(t.table, t.board, pack, t.turn, 'cruiser', null, 1, false).action as { production: { payment: unknown } }).production.payment : null);
  });

  test('the custodians payment follows the landing', () => {
    const landed = build('sol', { ...BODY });
    const oldPatch = oldOld.withCustodiansPayment(landed.e, landed.before, landed.g.faction, pack, false);
    same2(landed, oldPatch, now.withCustodiansOn(landed.table, landed.board, pack, landed.turn, false));
    const none = build('sol', { ...BODY, landings: [] });
    same2(none, oldOld.withCustodiansPayment({ ...none.e, custodiansPayment: noPay }, none.before, none.g.faction, pack, false), now.withCustodiansOn(none.table, none.board, pack, { ...none.turn, action: { ...(none.turn.action as object), custodians: noPay } as never }, false));
    expect(withCustodians).toBeTypeOf('function');
  });

  test('the shipping of the production', () => {
    same({ shipsTo: 'C' }, now.withShipsTo(t.turn, 'C'));
    same({ shipsTo: undefined }, now.withShipsTo(now.withShipsTo(t.turn, 'C'), undefined));
  });
});

function same2(t: ReturnType<typeof build>, patch: Partial<Entry>, edited: ReturnType<typeof turnOf>) {
  expect(factsOf(t.table, edited)).toEqual(factsOf(t.table, turnOf(t.table, { ...t.e, ...patch } as Entry, pack)));
}

describe('the losses, the custodians and the places of a turn', () => {
  const t = build('sol', BODY);
  test('the losses of the acting player as the entry keeps them', () => {
    expect(now.spaceLossesOf(t.turn)).toEqual(t.e.losses);
    expect(now.groundLossesOf(t.turn)).toEqual(t.e.groundLosses);
    expect(now.groundLossesOf(build('sol', {}).turn)).toEqual({});
  });
  test('the custodians by hand, the places of the flights, the free landing', () => {
    expect(tacticalOf(now.withCustodiansSet(t.turn, noPay)).custodians).toEqual(noPay);
    expect(now.movesOf(tacticalOf(t.turn)).map(m => [m.from, m.pickupOf])).toEqual(t.e.moves.map(m => [m.from, m.pickupOf]));
    expect(now.custodiansFreeOn(t.table, t.board, pack, t.player)).toBe(inForceOf(pack, holderOf(t.g, t.before), e => e.permit?.some(w => w.code === 'custodians') ?? false).length > 0);
  });
});

describe('the flight of a source as the steps read it', () => {
  test.each(['sol', 'naalu'])('%s: ships, cargo and the pickups of each source', faction => {
    const t = build(faction, BODY);
    for (const source of ['A', 'C', 'B']) {
      expect(now.flightLineOf(t.table, t.board, pack, t.turn, source), source).toEqual(oldOld.flightOf(t.g, pack, t.before.holdings, t.e, source));
    }
  });
});

describe('the screens of the plan read the kernel', () => {
  test.each(['sol', 'naalu'])('%s: the systems a turn touches are those of the old entry', faction => {
    const t = build(faction, BODY);
    expect(now.systemsOfTurn(t.table, t.board, pack, t.turn)).toEqual(old.entrySystems(t.g, pack, t.e));
    const free = { ...t.e, moves: [], systemId: null } as Entry;
    expect(now.systemsOfTurn(t.table, t.board, pack, turnOf(t.table, free, pack))).toEqual(old.entrySystems(t.g, pack, free));
  });

  test('a correction puts its units in the system chosen; the units counted stay', () => {
    const t = build('sol', BODY);
    const adjust = entry({ type: 'adjustment', label: 'x', delta: { units: { systemId: 'A', units: { carrier: 1 } } } });
    const turn = turnOf(t.table, adjust, pack);
    const moved = withDeltaSystem(turn, 'C');
    expect(moved.action).toMatchObject({ kind: 'correction', delta: { units: { systemId: 'C', units: { carrier: 1 } } } });
    expect(withDeltaSystem(t.turn, 'C')).toBe(t.turn);
  });

  test('the warnings of a row are those of the legacy frames', () => {
    const t = build('sol', BODY);
    const line = timelineOf(t.g, t.g.plans[0], 'forecast', pack);
    const rows = warningsByTurn(line.kernel);
    for (const frame of line.frames.filter(f => f.applied)) expect(rows[frame.entryId], frame.entryId).toEqual(frame.warnings);
  });
});
