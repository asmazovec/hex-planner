import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { createGame } from '../domain/newGame';
import { stateBeforeEntry, tacticalMeters, productionPlaces } from '../domain/project';
import { flies as oldFlies, stateInFlight } from '../domain/tactical';
import type { Entry, EntryBody, Game, UnitCounts } from '../domain/types';
import { flies, flightOf, inFlight, metersOf, productionSites } from '../game/flight';
import { turnOf } from '../game/fromLegacy';
import { timelineOf } from './projection';

const pack = loadPack(['pok']);
let n = 0;
const entry = (body: EntryBody, phase: Entry['phase'] = 'action', status: Entry['status'] = 'planned'): Entry => ({ ...body, id: `x${++n}`, phase, status }) as Entry;
const setup = (systemId: string, units: UnitCounts) => entry({ type: 'adjustment', label: 'setup', delta: { units: { systemId, units } } }, 'strategy', 'done');
const tactical = (over: Record<string, unknown>) => ({ type: 'tactical', systemId: 'B', moves: [], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 }, ...over }) as EntryBody;

function gameOf(faction: string, entries: Entry[], tech: string[] = []): Game {
  const g = createGame({ expansions: ['pok'], playerCount: 3, faction }, pack);
  g.map = { A: '19', B: '20', H: pack.factions[faction].homeTile };
  g.start.me = { technologies: [...(g.start.me.technologies ?? []), ...tech] };
  g.plans[0].rounds = [{ number: 1, strategyCard: null, backupCard: null, entries }];
  return g;
}

/** The same turn asked of the old replay and of the kernel. */
function both(g: Game, id: string) {
  const line = timelineOf(g, g.plans[0], 'forecast', pack);
  const { table } = line.kernel;
  const frame = line.kernel.byTurn.get(id)!;
  const e = g.plans[0].rounds[0].entries.find(x => x.id === id) as Extract<Entry, { type: 'tactical' }>;
  const turn = turnOf(table, e, pack);
  return { g, line, table, frame, e, turn, before: stateBeforeEntry(g, g.plans[0], id, pack), flight: flightOf(table, frame.before, pack, turn) };
}

describe('flightOf and the meters of a source', () => {
  const planet = pack.tiles['20'].planetIds[0];
  const cases: [string, Entry[]][] = [
    ['groups and production in the fleet', [setup('A', { cruiser: 1, fighter: 2 }), setup('B', { cruiser: 1 }),
      { ...entry(tactical({ moves: [{ from: 'A', units: { cruiser: 1, fighter: 2 } }], production: { cruiser: 3 } })), id: 'm' }]],
    ['beyond what the source holds', [setup('A', { carrier: 1 }), { ...entry(tactical({ moves: [{ from: 'A', units: { carrier: 2 } }] })), id: 'm' }]],
    ['landed infantry free the capacity', [setup('A', { carrier: 1, fighter: 4, infantry: 4 }),
      { ...entry(tactical({ moves: [{ from: 'A', units: { carrier: 1, fighter: 4, infantry: 4 } }], landings: [{ planetId: planet, units: { infantry: 4 } }] })), id: 'm' }]],
    ['losses in space', [setup('A', { carrier: 1, fighter: 3 }), setup('B', { cruiser: 1 }),
      { ...entry(tactical({ moves: [{ from: 'A', units: { carrier: 1, fighter: 3 } }], losses: { fighter: 2 } })), id: 'm' }]],
  ];
  for (const faction of ['arborec', 'naalu', 'sol']) {
    for (const [name, entries] of cases) {
      test(`${faction}: ${name}`, () => {
        const { g, e, before, flight, table } = both(gameOf(faction, entries), 'm');
        for (const source of ['A', 'B']) {
          expect(metersOf(table, pack, flight, 'p1', source)).toEqual(tacticalMeters(g, e, source, before, pack));
        }
      });
    }
  }

  test('Neuroglaive: the activator of a system holding a Naalu ship loses a fleet token, in the numbers of the board', () => {
    const g = gameOf('arborec', [setup('A', { cruiser: 1 }), { ...entry(tactical({ moves: [{ from: 'A', units: { cruiser: 1 } }] })), id: 'm' }]);
    const { flight } = both(g, 'm');
    expect(flight.activated.players.p1.pools.tactic).toBe(flight.before.players.p1.pools.tactic - 1);
  });

  test('the stages agree with the old replay: ships after the flight, the token of the action', () => {
    const g = gameOf('sol', [setup('A', { carrier: 1, fighter: 2 }), { ...entry(tactical({ moves: [{ from: 'A', units: { carrier: 1, fighter: 2 } }] })), id: 'm' }]);
    const { flight } = both(g, 'm');
    expect(flight.moved.systems.B.ships.p1).toEqual({ carrier: 1, fighter: 2 });
    expect(flight.moved.systems.A?.ships.p1 ?? {}).toEqual({});
    expect(flight.activated.systems.B.tokens).toContain('p1');
  });

  test('inFlight and flies', () => {
    const entries = [setup('A', { carrier: 1, fighter: 2 }), setup('H', { cruiser: 1 }),
      { ...entry(tactical({ moves: [{ from: 'A', units: { carrier: 1 } }, { from: 'H', units: { cruiser: 1 }, pickupOf: 'A' }] })), id: 'm' }];
    const { e, before, frame, turn, table } = both(gameOf('sol', entries), 'm');
    expect(flies(turn)).toBe(oldFlies(e));
    expect(flies(turnOf(table, { ...e, moves: [] }, pack))).toBe(oldFlies({ ...e, moves: [] }));
    for (const passed of [[], [1]]) {
      const old = stateInFlight(pack, e, before, passed);
      const now = inFlight(frame.before, turn, passed);
      expect(now.systems.A?.ships.p1 ?? {}).toEqual(old.systems.A ?? {});
      expect(now.systems.H?.ships.p1 ?? {}).toEqual(old.systems.H ?? {});
      expect(now.systems.B.tokens.includes('p1')).toBe(old.tokensOnMap.includes('B'));
    }
  });

  test('productionSites are those of productionPlaces', () => {
    const entries = [setup('B', { carrier: 1 }), { ...entry(tactical({ production: { cruiser: 1, infantry: 2 }, landings: [] })), id: 'm' }];
    const { g, e, before, frame, turn, table } = both(gameOf('sol', entries), 'm');
    expect(productionSites(table, frame.before, pack, turn)).toEqual(productionPlaces(g, e, before, pack));
  });
});
