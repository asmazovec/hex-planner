import type { CardEffects, ExpansionId } from './types';
import { CARD } from './strategy';
import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { createGame } from './newGame';
import { slotAcross } from './route';
import { fleetSpeed, productionCost, productionPlaces, project, readyInfluence, readyResources, routeDistances, routeMove, routeReach, routeSteps, stateBeforeEntry, tacticalMeters, systemsAdjacent } from './project';
import type {
  AdjustmentDelta, DataPack, Entry, EntryBody, Game, Payment, Phase, UnitCounts, UnitDef, UnitId, Warning,
} from './types';

describe('how far a route goes', () => {
  const plain = { number: '1', planetIds: [], kind: 'system', wormholes: [] };
  const lane = (id: string, lanes?: [number, number][]) => ({ id, number: id, planetIds: [], kind: 'hyperlane', wormholes: [], lanes });
  const routePack = {
    tiles: {
      a: { ...plain, id: 'a' },
      alpha: { ...plain, id: 'alpha', wormholes: ['alpha'] },
      // The lane joins the north-west edge (5) and the south-east edge (2).
      straight: lane('straight', [[2, 5]]),
      // Two lanes, north-west to north (5 and 0), and south to south-east (3 and 2).
      bends: lane('bends', [[0, 5], [2, 3]]),
      // The tiles 119 to 124 have no known lanes.
      unknown: lane('unknown'),
      nebula: { ...plain, id: 'nebula', anomaly: 'nebula' },
      nova: { ...plain, id: 'nova', anomaly: 'supernova' },
      rocks: { ...plain, id: 'rocks', anomaly: 'asteroid' },
      rift: { ...plain, id: 'rift', anomaly: 'rift' },
      scar: { ...plain, id: 'scar', anomaly: 'scar' },
      tower: { ...plain, id: 'tower', anomaly: 'rift', secondAnomaly: 'asteroid' },
    },
    planets: {},
    units: { cruiser: { id: 'cruiser', name: 'cruiser', cost: 2, capacity: 0, capacityUsed: 1, ground: false, fighter: false, combat: null, move: 2, limit: null } },
    factions: {},
  } as unknown as DataPack;
  const line = (map: Record<string, string>, enemyUnits: Game['enemyUnits'] = {}) =>
    ({ map, enemyUnits, faction: 'sol', fracture: { tiles: {} } }) as unknown as Game;
  /** A line running south-east, each slot the next across edge 2. */
  const row = { '0,0': 'a', '1,0': 'a', '2,0': 'a', '3,0': 'a', '4,0': 'a' };
  const reach = (map: Record<string, string>, speed: number, active = '4,0', enemy: Game['enemyUnits'] = {}, path = ['0,0']) =>
    [...routeReach(line(map, enemy), path, speed, active, routePack)].sort();

  describe('distance', () => {
    test('each neighbour is a step', () => {
      const steps = routeDistances(line(row), '0,0', routePack);
      expect([steps.get('1,0'), steps.get('2,0'), steps.get('3,0')]).toEqual([1, 2, 3]);
    });

    test('a wormhole joins two far systems in one step', () => {
      expect(routeDistances(line({ ...row, '0,0': 'alpha', '3,0': 'alpha' }), '0,0', routePack).get('3,0')).toBe(1);
    });

    test('a lane joins the systems at its two ends in one step, and is no system itself', () => {
      const steps = routeDistances(line({ ...row, '1,0': 'straight' }), '0,0', routePack);
      expect(steps.get('2,0')).toBe(1);
      expect(steps.has('1,0')).toBe(false);
    });

    test('only along its lines: a system beside a lane that does not end there is not joined by it', () => {
      // North of the hyperlane: edge 0 has no line, so the way to the south-east is around it.
      const map = { '1,-1': 'a', '1,0': 'straight', '2,0': 'a', '2,-1': 'a' };
      const steps = routeDistances(line(map), '1,-1', routePack);
      expect(steps.get('2,0')).toBe(2);
    });

    test('a turned tile turns its lines: at one step the line runs north-east to south-west', () => {
      // Edges 2 and 5 move up by two to 4 and 1: from the south-west to the north-east.
      const map = { '0,1': 'a', '1,0': 'straight@2', '2,-1': 'a' };
      expect(routeDistances(line(map), '0,1', routePack).get('2,-1')).toBe(1);
      const straight = { '0,1': 'a', '1,0': 'straight', '2,-1': 'a' };
      expect(routeDistances(line(straight), '0,1', routePack).has('2,-1')).toBe(false);
    });

    test('two lines of one tile do not cross: each joins its own pair of edges', () => {
      const map = { '0,0': 'a', '1,0': 'bends', '1,-1': 'a', '2,0': 'a', '1,1': 'a' };
      const steps = routeDistances(line(map), '0,0', routePack);
      expect(steps.get('1,-1')).toBe(1);
      expect(steps.has('2,0')).toBe(false);
    });

    test('lines run on through a chain of hyperlanes for one step', () => {
      expect(routeDistances(line({ ...row, '1,0': 'straight', '2,0': 'straight' }), '0,0', routePack).get('3,0')).toBe(1);
    });

    test('a hyperlane with unknown lines joins all its sides', () => {
      const map = { '0,0': 'a', '1,0': 'unknown', '1,-1': 'a', '2,0': 'a' };
      const steps = routeDistances(line(map), '0,0', routePack);
      expect([steps.get('1,-1'), steps.get('2,0')]).toEqual([1, 1]);
    });

    test('a real hyperlane tile joins the systems at the ends of its printed lines, turned as it lies', () => {
      const real = loadPack(['pok']);
      const [a, b] = real.tiles['83A'].lanes![0];
      for (const turns of [0, 1, 4]) {
        const [from, to] = [slotAcross('0,0', (a + turns) % 6)!, slotAcross('0,0', (b + turns) % 6)!];
        const game = { map: { '0,0': `83A@${turns}`, [from]: '25', [to]: '26' }, enemyUnits: {}, faction: 'sol', fracture: { tiles: {} } } as unknown as Game;
        expect(routeDistances(game, from, real).get(to)).toBe(1);
      }
    });

    test('a drawn route is measured as drawn, and a hyperlane hex on it costs nothing', () => {
      const game = line({ ...row, '1,0': 'nebula' });
      expect(routeSteps(game, ['0,0', '1,0', '2,0'], routePack)).toBe(2);
      expect(routeSteps(game, ['0,0', '3,0'], routePack)).toBe(3);
      // A map with holes in it has no way across them: the grid measures it, so a far flight is not called near.
      expect(routeSteps(line({ '0,0': 'a', '3,0': 'a' }), ['0,0', '3,0'], routePack)).toBe(3);
      expect(routeSteps(line({ '0,0': 'a', 'off': 'a' }), ['0,0', 'off'], routePack)).toBe(1);
      expect(routeSteps(line({ ...row, '1,0': 'straight' }), ['0,0', '1,0', '2,0'], routePack)).toBe(1);
    });
  });

  describe('what a ship reaches', () => {
    test('as far as its speed', () => {
      expect(reach(row, 2)).toEqual(['1,0', '2,0']);
    });

    test('asteroids and a supernova let nothing in, the rift of two anomalies neither', () => {
      for (const tile of ['rocks', 'nova', 'tower']) expect(reach({ ...row, '1,0': tile }, 3)).toEqual([]);
    });

    test('a nebula: only as the active system, and never through', () => {
      expect(reach({ ...row, '1,0': 'nebula' }, 3, '4,0')).toEqual([]);
      expect(reach({ ...row, '1,0': 'nebula' }, 3, '1,0')).toEqual(['1,0']);
    });

    test('a ship starting in a nebula flies at speed 1', () => {
      expect(reach({ ...row, '0,0': 'nebula' }, 3)).toEqual(['1,0']);
    });

    test('a rift adds one on the way out or through, each rift its own (LRR 41 note 6)', () => {
      expect(reach({ ...row, '0,0': 'rift' }, 1)).toEqual(['1,0', '2,0']);
      expect(reach({ ...row, '1,0': 'rift' }, 1)).toEqual(['1,0', '2,0']);
      expect(reach({ ...row, '1,0': 'rift', '2,0': 'rift' }, 1)).toEqual(['1,0', '2,0', '3,0']);
    });

    test('a rift already behind on the path keeps its bonus', () => {
      expect(reach({ ...row, '0,0': 'rift' }, 1, '4,0', {}, ['0,0', '1,0'])).toEqual(['2,0']);
    });

    test('an entropic scar does not touch the movement', () => {
      expect(reach({ ...row, '1,0': 'scar' }, 2)).toEqual(['1,0', '2,0']);
    });

    test('enemy ships: only as the active system, and never through', () => {
      const enemy = { '1,0': { o1: { cruiser: 1 } } };
      expect(reach(row, 3, '4,0', enemy)).toEqual([]);
      expect(reach(row, 3, '1,0', enemy)).toEqual(['1,0']);
    });

    test('a route ends on the active system', () => {
      expect(reach(row, 3, '1,0')).toEqual(['1,0']);
    });
  });

  test('the speed of a route counts a nebula at the start and a rift on the way', () => {
    const game = line({ ...row, '0,0': 'nebula', '1,0': 'rift' });
    expect(routeMove(game, ['0,0'], 3, routePack)).toBe(1);
    expect(routeMove(game, ['0,0', '1,0'], 3, routePack)).toBe(2);
    expect(routeMove(line(row), ['0,0', '1,0'], 3, routePack)).toBe(3);
  });

  test('the speed of a fleet is its fastest ship that flies', () => {
    expect(fleetSpeed(line(row), {}, [], routePack)).toBeNull();
  });
});

const unit = (id: UnitId, o: Partial<UnitDef>): UnitDef =>
  ({ id, name: id, cost: 1, capacity: 0, capacityUsed: 1, ground: false, fighter: false, combat: null, move: null, limit: null, ...o });

const pack: DataPack = {
  version: 'test',
  tiles: {
    t1: { id: 't1', number: '1', planetIds: [], kind: 'system', wormholes: [] },
    t2: { id: 't2', number: '2', planetIds: ['lazar'], kind: 'system', wormholes: [] },
    home: { id: 'home', number: '3', planetIds: ['jord', 'arc'], kind: 'home', wormholes: [] },
    te: { id: 'te', number: '4', planetIds: [], kind: 'system', wormholes: [] },
  },
  planets: {
    jord: { id: 'jord', name: 'Jord', resources: 4, influence: 2 },
    arc: { id: 'arc', name: 'Arc', resources: 1, influence: 1 },
    lazar: { id: 'lazar', name: 'Lazar', resources: 1, influence: 0 },
    thundersedge: { id: 'thundersedge', name: "Thunder's Edge", resources: 5, influence: 1 },
  },
  units: {
    carrier: unit('carrier', { cost: 3, capacity: 4 }),
    cruiser: unit('cruiser', { cost: 2 }),
    dreadnought: unit('dreadnought', { cost: 4, capacity: 1 }),
    fighter: unit('fighter', { cost: 0.5, fighter: true }),
    infantry: unit('infantry', { cost: 0.5, ground: true }),
  },
  factions: { sol: { id: 'sol', name: 'Sol', homeTile: 'home', startUnits: { carrier: 1, infantry: 2 }, startingTech: [], commodities: 0, abilities: [] } },
  templates: [{ playerCount: 3, layout: 'standard', slots: [{ q: 0, r: 0, fixed: '18' }, { q: 1, r: 0 }] }],
  technologies: {},
  structures: [],
};

type TacticalBody = Extract<Entry, { type: 'tactical' }>;
const noPay: Payment = { planets: [], tradeGoods: 0 };
let n = 0;
const entry = (body: EntryBody, phase: Phase = 'action', status: Entry['status'] = 'planned'): Entry =>
  ({ ...body, id: `x${++n}`, phase, status }) as Entry;
const withId = (id: string, e: Entry): Entry => ({ ...e, id });
const setup = (systemId: string, units: UnitCounts) =>
  entry({ type: 'adjustment', label: 'setup', delta: { units: { systemId, units } } }, 'strategy', 'done');
const tactical = (over: Partial<Extract<EntryBody, { type: 'tactical' }>>): EntryBody =>
  ({ type: 'tactical', systemId: 'B', moves: [], landings: [], production: {}, payment: noPay, ...over });
const move = (id: string, from: string, units: UnitCounts, to = 'B') =>
  withId(id, entry(tactical({ systemId: to, moves: [{ from, units }] })));

function gameWith(entries: Entry[], extra: Partial<Game> = {}, roundTwo: Entry[] = []): Game {
  const g = createGame({ expansions: [], playerCount: 3, faction: 'sol' }, pack);
  g.map = { A: 't1', B: 't2', H: 'home', T: 'te' };
  g.plans[0].rounds = [{ number: 1, strategyCard: null, backupCard: null, entries }];
  if (roundTwo.length) g.plans[0].rounds.push({ number: 2, strategyCard: null, backupCard: null, entries: roundTwo });
  return Object.assign(g, extra);
}
const run = (g: Game, filter: 'now' | 'forecast' = 'forecast') => project(g, g.plans[0], filter, pack);
const codes = (w: Warning[] | undefined) => (w ?? []).map(x => x.code);

describe('project', () => {
  test('прогноз учитывает план, «сейчас» только выполненное', () => {
    const g = gameWith([setup('A', { cruiser: 1 }), move('e1', 'A', { cruiser: 1 })]);
    expect(run(g, 'now').state.systems.B?.cruiser).toBeUndefined();
    const f = run(g).state;
    expect(f.systems.B.cruiser).toBe(1);
    expect(f.tactic).toBe(2);
    expect(f.tokensOnMap).toContain('B');
  });

  test('«сейчас» учитывает выполненную запись', () => {
    const e = entry(tactical({}), 'action', 'done');
    expect(run(gameWith([e]), 'now').state.tactic).toBe(2);
  });

  test('отменённая запись не считается', () => {
    const e = entry(tactical({}), 'action', 'cancelled');
    const s = run(gameWith([e])).state;
    expect(s.tactic).toBe(3);
    expect(s.tokensOnMap).toEqual([]);
  });

  test('вместимость группы и системы', () => {
    const g = gameWith([setup('A', { cruiser: 1, fighter: 1 }), move('e1', 'A', { cruiser: 1, fighter: 1 })]);
    expect(codes(run(g).warningsByEntry.e1)).toEqual(expect.arrayContaining(['capacityGroup', 'capacitySystem']));
  });

  test('вместимость не превышена: предупреждений нет', () => {
    const g = gameWith([setup('A', { carrier: 1, fighter: 3, infantry: 1 }),
      move('e1', 'A', { carrier: 1, fighter: 3, infantry: 1 })]);
    expect(run(g).warningsByEntry.e1).toEqual([]);
  });

  test('истребители не считаются в резерве флота, корабли считаются', () => {
    const ships = gameWith([setup('A', { cruiser: 4 }), move('e1', 'A', { cruiser: 4 })]);
    expect(codes(run(ships).warningsByEntry.e1)).toContain('fleetPool');
    const fighters = gameWith([setup('A', { carrier: 1, fighter: 4 }), move('e1', 'A', { carrier: 1, fighter: 4 })]);
    expect(codes(run(fighters).warningsByEntry.e1)).not.toContain('fleetPool');
  });

  test('постройка: стоимость считается за пару и округляется вверх', () => {
    expect(productionCost({ fighter: 3 }, 'sol', [], pack)).toBe(2);
    expect(productionCost({ cruiser: 2, infantry: 1 }, 'sol', [], pack)).toBe(5);
  });

  test('оплата постройки: нехватка ресурсов, истощение планет, товары', () => {
    const build = (payment: Payment) =>
      withId('p', entry(tactical({ systemId: 'H', production: { cruiser: 2 }, payment })));
    const short = run(gameWith([build({ planets: ['arc'], tradeGoods: 1 })]));
    expect(short.warningsByEntry.p).toEqual(expect.arrayContaining([
      { code: 'shortTradeGoods', params: { needed: 1, have: 0 } },
      { code: 'shortResources', params: { needed: 4, paid: 1 } },
    ]));
    const ok = run(gameWith([build({ planets: ['jord'], tradeGoods: 0 })]));
    expect(ok.warningsByEntry.p).toEqual([]);
    expect(ok.state.exhausted).toEqual(['jord']);
    expect(ok.state.systems.H.cruiser).toBe(2);
    const twice = run(gameWith([build({ planets: ['jord'], tradeGoods: 0 }), withId('q', build({ planets: ['jord'], tradeGoods: 0 }))]));
    expect(codes(twice.warningsByEntry.q)).toContain('planetExhausted');
  });

  test('наземные юниты можно забрать с планеты', () => {
    const g = gameWith([
      setup('B', { infantry: 2 }),
      withId('l', entry(tactical({ landings: [{ planetId: 'jord', units: { infantry: 2 } }] }))),
      withId('m', entry(tactical({ moves: [{ from: 'jord', units: { infantry: 1 } }] }))),
    ]);
    const r = run(g);
    expect(r.state.ground.jord.infantry).toBe(1);
    expect(r.state.systems.B.infantry).toBe(1);
  });

  describe('planet pickups belong to the group of their system', () => {
    const landAtHome = () => withId('l', entry(tactical({ systemId: 'H', landings: [{ planetId: 'jord', units: { infantry: 2 } }] }), 'strategy'));
    const moves = (list: { from: string; units: UnitCounts }[], over = {}) => withId('m', entry(tactical({ moves: list, ...over })));

    test('a pickup beyond the capacity of the ships from that system warns', () => {
      const g = gameWith([setup('H', { cruiser: 1 }), landAtHome(),
        moves([{ from: 'H', units: { cruiser: 1 } }, { from: 'jord', units: { infantry: 1 } }])]);
      expect(run(g).warningsByEntry.m).toContainEqual({ code: 'capacityGroup', params: { from: 'H', load: 1, capacity: 0 } });
    });

    test('a pickup carried by ships from that system does not warn', () => {
      const g = gameWith([landAtHome(), moves([{ from: 'H', units: { carrier: 1 } }, { from: 'jord', units: { infantry: 2 } }])]);
      expect(codes(run(g).warningsByEntry.m)).not.toContain('capacityGroup');
    });

    test('one warning per system, not one per move', () => {
      const g = gameWith([setup('H', { fighter: 1 }), landAtHome(),
        moves([{ from: 'H', units: { fighter: 1 } }, { from: 'jord', units: { infantry: 1 } }])]);
      expect(run(g).warningsByEntry.m.filter(w => w.code === 'capacityGroup')).toEqual([
        { code: 'capacityGroup', params: { from: 'H', load: 2, capacity: 0 } },
      ]);
    });

    test('the meters give the same numbers as the warnings, with production in the fleet', () => {
      const m = moves([{ from: 'H', units: { cruiser: 1 } }, { from: 'jord', units: { infantry: 1 } }], { production: { cruiser: 3 } });
      const g = gameWith([setup('H', { cruiser: 1 }), setup('B', { cruiser: 1 }), landAtHome(), m]);
      const meters = tacticalMeters(g, m as Extract<Entry, { type: 'tactical' }>, 'H', stateBeforeEntry(g, g.plans[0], 'm', pack), pack);
      expect(meters).toEqual({ group: { load: 1, capacity: 0 }, ships: 5, fleet: 3 });
      const warnings = run(g).warningsByEntry.m;
      expect(warnings).toContainEqual({ code: 'capacityGroup', params: { from: 'H', load: 1, capacity: 0 } });
      expect(warnings).toContainEqual({ code: 'fleetPool', params: { systemId: 'B', ships: 5, fleet: 3 } });
    });

    test('the meters count only what the source really holds, as the warnings do', () => {
      const m = moves([{ from: 'A', units: { carrier: 2 } }]);
      const g = gameWith([setup('A', { carrier: 1 }), m]);
      const meters = tacticalMeters(g, m as Extract<Entry, { type: 'tactical' }>, 'A', stateBeforeEntry(g, g.plans[0], 'm', pack), pack);
      expect(meters.group).toEqual({ load: 0, capacity: 4 });
      expect(meters.ships).toBe(1);
    });
  });

  describe('landing is counted against what arrived', () => {
    const landing = (planetId: string, n: number, kind: UnitId = 'infantry') => ({ planetId, units: { [kind]: n } });
    const landWarnings = (w: Warning[] | undefined) => (w ?? []).filter(x => x.code === 'landingOverLimit' || x.code === 'unitsMissing');

    test('within the limit gives no warning, units already in space count', () => {
      const g = gameWith([setup('B', { infantry: 2 }), withId('l', entry(tactical({ landings: [landing('lazar', 2)] })))]);
      expect(landWarnings(run(g).warningsByEntry.l)).toEqual([]);
    });

    test('over the limit across two planets: one warning with totals, only what exists lands, in order', () => {
      const g = gameWith([ // Sol starts with two infantry at home
        withId('l', entry(tactical({ systemId: 'H', landings: [landing('jord', 2), landing('arc', 1)] })))]);
      const r = run(g);
      expect(landWarnings(r.warningsByEntry.l)).toEqual([{ code: 'landingOverLimit', params: { unit: 'infantry', wanted: 3, available: 2 } }]);
      expect(r.state.ground.jord.infantry).toBe(2);
      expect(r.state.ground.arc?.infantry).toBeUndefined();
    });

    test('moves and pickups from planets count as arrived', () => {
      const g = gameWith([setup('A', { infantry: 1 }),
        withId('p', entry(tactical({ systemId: 'H', landings: [landing('jord', 1)] }), 'strategy')),
        withId('l', entry(tactical({
          moves: [{ from: 'A', units: { infantry: 1 } }, { from: 'jord', units: { infantry: 1 } }],
          landings: [landing('lazar', 2)],
        })))]);
      expect(landWarnings(run(g).warningsByEntry.l)).toEqual([]);
    });

    test('units produced in the same entry are not available', () => {
      const g = gameWith([withId('l', entry(tactical({
        production: { infantry: 1 }, landings: [landing('lazar', 1)],
      })))]);
      expect(landWarnings(run(g).warningsByEntry.l)).toEqual([{ code: 'landingOverLimit', params: { unit: 'infantry', wanted: 1, available: 0 } }]);
    });

    test('moves still report unitsMissing', () => {
      const g = gameWith([move('e1', 'A', { infantry: 1 })]);
      expect(codes(run(g).warningsByEntry.e1)).toContain('unitsMissing');
    });
  });

  test('высадка меняет контроль и переносит юниты на планету', () => {
    const g = gameWith([setup('B', { infantry: 2 }),
      entry(tactical({ landings: [{ planetId: 'lazar', units: { infantry: 2 } }] }))]);
    const s = run(g).state;
    expect(s.control.lazar).toBe('me');
    expect(s.ground.lazar.infantry).toBe(2);
    expect(s.systems.B.infantry).toBeUndefined();
  });

  test('начало раунда: планеты готовы, жетоны с карты снимаются', () => {
    const build = entry(tactical({ systemId: 'H', payment: { planets: ['jord'], tradeGoods: 0 } }));
    const g = gameWith([build], {}, [entry({ type: 'pass' })]);
    const s = run(g).state;
    expect(s.exhausted).toEqual([]);
    expect(s.tokensOnMap).toEqual([]);
    expect(s.tactic).toBe(2);
    expect(run(gameWith([build])).state.exhausted).toEqual(['jord']);
  });

  test('statusTokens добавляет жетоны по выбору пользователя', () => {
    const s = run(gameWith([entry({ type: 'statusTokens', tactic: 1, fleet: 1, strategy: 0 }, 'status')])).state;
    expect([s.tactic, s.fleet, s.strategy]).toEqual([4, 4, 2]);
  });

  test('очки фазы статуса: мои и соперников, «сейчас» только выполненные', () => {
    const base = gameWith([]);
    const [a, b] = base.opponents.map(o => o.id);
    const game = gameWith(
      [entry({ type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, vp: 1, opponentVp: { [a]: 2 } }, 'status', 'done')],
      { vp: 3, opponents: base.opponents.map(o => (o.id === b ? { ...o, vp: 4 } : o)) },
      [entry({ type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, vp: 2, opponentVp: { [a]: 1, [b]: 1 } }, 'status')],
    );
    const now = run(game, 'now').state;
    expect(now.vp).toBe(4);
    expect(now.opponentVp).toEqual({ [a]: 2, [b]: 4 });
    const forecast = run(game).state;
    expect(forecast.vp).toBe(6);
    expect(forecast.opponentVp).toEqual({ [a]: 3, [b]: 5 });
  });

  test('очки в запись статуса и ручная правка складываются; у старой записи очков нет', () => {
    const game = gameWith([
      entry({ type: 'adjustment', label: 'x', delta: { vp: 2 } }),
      entry({ type: 'statusTokens', tactic: 1, fleet: 0, strategy: 0 }, 'status'),
      entry({ type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, vp: 1 }, 'status'),
    ]);
    expect(run(game).state.vp).toBe(3);
    expect(run(game).state.opponentVp).toEqual(Object.fromEntries(game.opponents.map(o => [o.id, 0])));
  });

  test('очки неизвестного соперника не попадают в состояние', () => {
    const game = gameWith([entry({ type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, opponentVp: { gone: 3 } }, 'status')]);
    expect(run(game).state.opponentVp).not.toHaveProperty('gone');
  });

  test('adjustment меняет величины и участвует в расчёте', () => {
    const delta: AdjustmentDelta = { tradeGoods: 2, vp: 1, strategy: -1 };
    const s = run(gameWith([entry({ type: 'adjustment', label: 'card', delta }, 'action')])).state;
    expect([s.tradeGoods, s.vp, s.strategy]).toEqual([2, 1, 1]);
  });

  test('товары из правки оплачивают постройку', () => {
    const g = gameWith([
      entry({ type: 'adjustment', label: 'card', delta: { tradeGoods: 2 } }, 'strategy'),
      withId('p', entry(tactical({ systemId: 'H', production: { cruiser: 1 }, payment: { planets: [], tradeGoods: 2 } }))),
    ]);
    const r = run(g);
    expect(r.warningsByEntry.p).toEqual([]);
    expect(r.state.tradeGoods).toBe(0);
  });

  test('перемещение несуществующих юнитов: без минуса и с unitsMissing', () => {
    const g = gameWith([move('e1', 'A', { cruiser: 1 })]);
    const r = run(g);
    expect(r.state.systems.A.cruiser ?? 0).toBe(0);
    expect(r.state.systems.B.cruiser ?? 0).toBe(0);
    expect(codes(r.warningsByEntry.e1)).toContain('unitsMissing');
  });

  test('перемещается то, что есть, остальное в unitsMissing', () => {
    const g = gameWith([setup('A', { cruiser: 1 }), move('e1', 'A', { cruiser: 3 })]);
    const r = run(g);
    expect(r.state.systems.B.cruiser).toBe(1);
    expect(r.warningsByEntry.e1).toContainEqual({ code: 'unitsMissing', params: { where: 'A', unit: 'cruiser', missing: 2 } });
  });

  test('смена порядка записей меняет результат', () => {
    const build = withId('b', entry(tactical({ systemId: 'A', production: { cruiser: 1 }, payment: { planets: ['jord'], tradeGoods: 0 } })));
    const mv = move('m', 'A', { cruiser: 1 });
    const buildFirst = run(gameWith([build, mv])).state;
    expect(buildFirst.systems.B.cruiser).toBe(1);
    const moveFirst = run(gameWith([mv, build]));
    expect(moveFirst.state.systems.B.cruiser ?? 0).toBe(0);
    expect(codes(moveFirst.warningsByEntry.m)).toContain('unitsMissing');
  });

  test('потеря раньше прибытия юнита: счёт зажат в ноль и есть unitsMissing, после смены порядка предупреждение уходит', () => {
    const loss = withId('l', entry({ type: 'adjustment', label: '', kind: 'losses', delta: { units: { systemId: 'B', units: { cruiser: -1 } } } }, 'action'));
    const arrival = withId('a', entry(tactical({ moves: [{ from: 'A', units: { cruiser: 1 } }] }), 'action'));
    const start = setup('A', { cruiser: 1 });
    const lossFirst = run(gameWith([start, loss, arrival]));
    expect(lossFirst.warningsByEntry.l).toContainEqual({ code: 'unitsMissing', params: { where: 'B', unit: 'cruiser', missing: 1 } });
    expect(lossFirst.state.systems.B.cruiser).toBe(1);
    const arrivalFirst = run(gameWith([start, arrival, loss]));
    expect(codes(arrivalFirst.warningsByEntry.l)).not.toContain('unitsMissing');
    expect(arrivalFirst.state.systems.B.cruiser ?? 0).toBe(0);
  });

  test('записи идут по фазам внутри раунда, а не по массиву', () => {
    const late = withId('late', entry({ type: 'statusTokens', tactic: 1, fleet: 0, strategy: 0 }, 'status'));
    const early = withId('early', entry(tactical({}), 'action'));
    expect(run(gameWith([late, early])).state.tactic).toBe(3);
  });

  test('начальное состояние: стартовые юниты, планеты и жетоны', () => {
    const g = createGame({ expansions: [], playerCount: 3, faction: 'sol' }, pack);
    g.map = { H: 'home@2' };
    const s = run(g).state;
    expect(s.systems.H).toEqual({ carrier: 1, infantry: 2 });
    expect([s.tactic, s.fleet, s.strategy, s.tradeGoods, s.vp]).toEqual([3, 3, 2, 0, 0]);
    expect(readyResources(s, pack)).toBe(5);
    expect(readyInfluence(s, pack)).toBe(3);
  });

  test('готовые ресурсы не считают истощённые и чужие планеты', () => {
    const g = gameWith([entry(tactical({ systemId: 'H', payment: { planets: ['jord'], tradeGoods: 0 } }))],
      { planetControl: { arc: 'enemy', lazar: 'me' } });
    const s = run(g).state;
    expect(readyResources(s, pack)).toBe(1);
  });

  test('планета Thunder\'s Edge принадлежит системе экспедиции', () => {
    const g = gameWith([entry(tactical({ systemId: 'T', production: { infantry: 2 }, payment: noPay }))], {
      planetControl: { thundersedge: 'me' },
      expedition: { slices: {}, thundersEdgeSystem: 'T' },
    });
    expect(run(g).state.ground.thundersedge.infantry).toBe(2);
    expect(readyResources(run(g).state, pack)).toBe(10);
  });

  test('тактическая запись без выбранной системы ничего не тратит', () => {
    const e = entry(tactical({ systemId: null, production: { cruiser: 1 }, payment: { planets: ['jord'], tradeGoods: 0 } }));
    const s = run(gameWith([e])).state;
    expect(s.tactic).toBe(3);
    expect(s.tokensOnMap).toEqual([]);
    expect(s.exhausted).toEqual([]);
  });

  test('оплата чужой или ничейной планетой не даёт ресурсов', () => {
    const build = (planets: string[]) =>
      withId('p', entry(tactical({ systemId: 'H', production: { cruiser: 1 }, payment: { planets, tradeGoods: 0 } })));
    const enemy = run(gameWith([build(['arc', 'lazar'])], { planetControl: { arc: 'enemy' } }));
    expect(enemy.warningsByEntry.p).toContainEqual({ code: 'shortResources', params: { needed: 2, paid: 0 } });
    expect(enemy.state.exhausted).toEqual(['arc', 'lazar']);
  });

  test('экспедиция без части: оплата расходует планеты', () => {
    const g = gameWith([entry({ type: 'expedition', sliceId: null, payment: { planets: ['jord'], tradeGoods: 0 } })]);
    expect(run(g).state.exhausted).toEqual(['jord']);
  });

  test('товар идёт за 1 ресурс, излишек сгорает без предупреждения', () => {
    const build = (production: UnitCounts, payment: Payment) =>
      withId('p', entry(tactical({ systemId: 'H', production, payment })));
    const tg = entry({ type: 'adjustment', label: 'card', delta: { tradeGoods: 2 } }, 'strategy');
    const burn = run(gameWith([build({ cruiser: 1 }, { planets: ['jord'], tradeGoods: 0 })]));
    expect(codes(burn.warningsByEntry.p)).toEqual([]);
    const tgOnly = run(gameWith([tg, build({ cruiser: 1 }, { planets: [], tradeGoods: 2 })]));
    expect(codes(tgOnly.warningsByEntry.p)).toEqual([]);
    const short = run(gameWith([tg, build({ carrier: 1, cruiser: 1 }, { planets: ['jord'], tradeGoods: 0 })]));
    expect(short.warningsByEntry.p).toContainEqual({ code: 'shortResources', params: { needed: 5, paid: 4 } });
    const withTg = run(gameWith([tg, build({ carrier: 1, cruiser: 1 }, { planets: ['jord'], tradeGoods: 2 })]));
    expect(codes(withTg.warningsByEntry.p)).toEqual([]);
    expect(withTg.state.tradeGoods).toBe(0);
  });

  test('планета, истощённая раньше по плану, вызывает planetExhausted', () => {
    const spend = withId('s', entry(tactical({ systemId: 'H', payment: { planets: ['jord'], tradeGoods: 0 } })));
    const buy = withId('b', entry(tactical({ systemId: 'H', production: { cruiser: 1 }, payment: { planets: ['jord'], tradeGoods: 0 } })));
    expect(codes(run(gameWith([spend, buy])).warningsByEntry.b)).toContain('planetExhausted');
    expect(codes(run(gameWith([buy, spend])).warningsByEntry.s)).toContain('planetExhausted');
    expect(codes(run(gameWith([buy])).warningsByEntry.b)).not.toContain('planetExhausted');
  });

  describe('захваченная высадкой планета', () => {
    const land = (planetId: string, planets: string[]) =>
      withId('t', entry(tactical({
        landings: [{ planetId, units: { infantry: 2 } }], production: { cruiser: 1 }, payment: { planets, tradeGoods: 0 },
      })));

    test('входит истощённой и не платит в той же записи', () => {
      const r = run(gameWith([setup('B', { infantry: 2 }), land('lazar', ['lazar'])]));
      expect(r.state.control.lazar).toBe('me');
      expect(r.state.exhausted).toEqual(['lazar']);
      expect(r.warningsByEntry.t).toEqual(expect.arrayContaining([
        { code: 'planetExhausted', params: { planetId: 'lazar' } },
        { code: 'shortResources', params: { needed: 2, paid: 0 } },
      ]));
    });

    test('истощена и без оплаты, а в следующем раунде готова', () => {
      const same = run(gameWith([setup('B', { infantry: 2 }), land('lazar', [])]));
      expect(same.state.exhausted).toEqual(['lazar']);
      expect(readyResources(same.state, pack)).toBe(5);
      const next = run(gameWith([setup('B', { infantry: 2 }), land('lazar', [])], {}, [entry({ type: 'pass' })]));
      expect(next.state.exhausted).toEqual([]);
      expect(readyResources(next.state, pack)).toBe(6);
    });

    test('своя планета остаётся готовой, высадка без юнитов ничего не меняет', () => {
      const own = run(gameWith([setup('B', { infantry: 2 }), land('arc', ['arc'])]));
      expect(codes(own.warningsByEntry.t)).not.toContain('planetExhausted');
      expect(own.state.exhausted).toEqual(['arc']);
      const none = run(gameWith([land('lazar', [])]));
      expect(none.state.exhausted).toEqual([]);
      expect(none.state.control.lazar).toBeUndefined();
    });

    test('планета, отнятая у соперника, тоже истощена', () => {
      const g = gameWith([setup('B', { infantry: 2 }), land('lazar', [])], { planetControl: { lazar: 'enemy' } });
      expect(run(g).state.exhausted).toEqual(['lazar']);
    });
  });

  describe('экспедиция: части и стоимость', () => {
    const expedition = (sliceId: string | null, payment: Partial<Payment>, id = 'x') =>
      withId(id, entry({ type: 'expedition', sliceId, payment: { planets: [], tradeGoods: 0, ...payment } }));
    const giveTg = (amount: number) =>
      entry({ type: 'adjustment', label: 'card', delta: { tradeGoods: amount } }, 'strategy');

    test('res5: ресурсы планет и товаров', () => {
      const ok = run(gameWith([expedition('res5', { planets: ['jord', 'arc'] })]));
      expect(ok.warningsByEntry.x).toEqual([]);
      expect(ok.state.exhausted).toEqual(['jord', 'arc']);
      const short = run(gameWith([expedition('res5', { planets: ['jord'] })]));
      expect(short.warningsByEntry.x).toContainEqual({ code: 'shortResources', params: { needed: 5, paid: 4 } });
      const viaTg = run(gameWith([giveTg(1), expedition('res5', { planets: ['jord'], tradeGoods: 1 })]));
      expect(viaTg.warningsByEntry.x).toEqual([]);
      expect(viaTg.state.tradeGoods).toBe(0);
    });

    test('inf5: считает влияние, товар идёт за 1 влияние', () => {
      const short = run(gameWith([expedition('inf5', { planets: ['jord', 'arc'] })]));
      expect(short.warningsByEntry.x).toContainEqual({ code: 'shortInfluence', params: { needed: 5, paid: 3 } });
      expect(codes(short.warningsByEntry.x)).not.toContain('shortResources');
      const ok = run(gameWith([giveTg(2), expedition('inf5', { planets: ['jord', 'arc'], tradeGoods: 2 })]));
      expect(ok.warningsByEntry.x).toEqual([]);
      expect(ok.state.tradeGoods).toBe(0);
    });

    test('tg3: тратит 3 товара, при нехватке предупреждает', () => {
      const ok = run(gameWith([giveTg(4), expedition('tg3', { tradeGoods: 3 })]));
      expect(ok.warningsByEntry.x).toEqual([]);
      expect(ok.state.tradeGoods).toBe(1);
      const exact = run(gameWith([giveTg(3), expedition('tg3', { tradeGoods: 3 })]));
      expect(exact.state.tradeGoods).toBe(0);
      const short = run(gameWith([giveTg(1), expedition('tg3', { tradeGoods: 3 })]));
      expect(short.warningsByEntry.x).toContainEqual({ code: 'shortTradeGoods', params: { needed: 3, have: 1 } });
      expect(short.state.tradeGoods).toBe(0);
    });

    test('secret, cards, tech: без стоимости в ресурсах', () => {
      for (const id of ['secret', 'cards', 'tech']) {
        expect(run(gameWith([expedition(id, {})])).warningsByEntry.x).toEqual([]);
      }
      expect(run(gameWith([expedition('tech', { planets: ['arc'] })])).state.exhausted).toEqual(['arc']);
    });

    test('часть занимается один раз', () => {
      const twice = run(gameWith([giveTg(6), expedition('tg3', { tradeGoods: 3 }, 'a'), expedition('tg3', { tradeGoods: 3 }, 'b')]));
      expect(codes(twice.warningsByEntry.a)).toEqual([]);
      expect(twice.warningsByEntry.b).toContainEqual({ code: 'sliceTaken', params: { sliceId: 'tg3' } });
      const other = run(gameWith([expedition('secret', {})], { expedition: { slices: { secret: 'other' }, thundersEdgeSystem: null } }));
      expect(codes(other.warningsByEntry.x)).toContain('sliceTaken');
      const cancelled = run(gameWith([
        entry({ type: 'expedition', sliceId: 'secret', payment: noPay }, 'action', 'cancelled'), expedition('secret', {}),
      ]));
      expect(codes(cancelled.warningsByEntry.x)).toEqual([]);
    });
  });
});

describe('createGame', () => {
  test('стартовые значения и планеты домашней системы', () => {
    const g = createGame({ expansions: ['pok'], playerCount: 3, faction: 'sol' }, pack);
    expect(g.planetControl).toEqual({ jord: 'me', arc: 'me' });
    expect(g.docks).toEqual(['jord']);
    expect(g.map).toEqual({ '0,0': '18', '1,0': 'home' });
    expect(g.dataVersion).toBe('test');
    expect(g.opponents).toHaveLength(2);
    expect(g.activePlanId).toBe(g.plans[0].id);
    expect(g.plans[0].rounds).toHaveLength(1);
  });
});

describe('ship upgrades in the replay', () => {
  const real = loadPack(['pok']);
  const start = (faction: string, entries: Entry[], baseline: UnitId[] = []): Game => {
    const g = createGame({ expansions: ['pok'], playerCount: 3, faction }, real);
    g.map = { A: '19', B: '20', H: real.factions[faction].homeTile };
    g.upgrades.me = baseline;
    g.plans[0].rounds = [{ number: 1, strategyCard: null, backupCard: null, entries }];
    return g;
  };
  const go = (g: Game, filter: 'now' | 'forecast' = 'forecast', plan = g.plans[0]) => project(g, plan, filter, real);
  const flight = (id: string, units: UnitCounts, from = 'A', to = 'B', status: Entry['status'] = 'planned') =>
    withId(id, entry(tactical({ systemId: to, moves: [{ from, units }] }), 'action', status));
  const research = (upgrades: UnitId[], status: Entry['status'] = 'planned', type: 'strategic' | 'secondary' = 'strategic') =>
    entry({ type, upgrades }, 'action', status);
  const overTwoCarriers = { carrier: 2, infantry: 10 };

  test('two carriers carry 8, and 12 with the baseline upgrade', () => {
    const units = setup('A', overTwoCarriers);
    const before = go(start('arborec', [units, flight('m', overTwoCarriers)]));
    expect(before.warningsByEntry.m.find(w => w.code === 'capacityGroup')?.params).toMatchObject({ load: 10, capacity: 8 });
    expect(before.warningsByEntry.m.find(w => w.code === 'capacitySystem')?.params).toMatchObject({ load: 10, capacity: 8 });
    const after = go(start('arborec', [units, flight('m', overTwoCarriers)], ['carrier']));
    expect(codes(after.warningsByEntry.m)).toEqual([]);
  });

  test('capacity uses my faction: Sol carriers carry 6, then 8', () => {
    const units = { carrier: 2, infantry: 14 };
    const entries = [setup('A', units), flight('m', units)];
    expect(go(start('sol', entries)).warningsByEntry.m.find(w => w.code === 'capacityGroup')?.params.capacity).toBe(12);
    expect(go(start('sol', entries, ['carrier'])).warningsByEntry.m.find(w => w.code === 'capacityGroup')).toBeUndefined();
  });

  test('an entry upgrade counts from that entry on: over capacity before it, fine after it', () => {
    const g = start('arborec', [
      setup('A', overTwoCarriers), flight('first', overTwoCarriers), research(['carrier']), flight('second', overTwoCarriers, 'B', 'A'),
    ]);
    const { warningsByEntry } = go(g);
    expect(codes(warningsByEntry.first)).toEqual(['capacityGroup', 'capacitySystem']);
    // The cargo is fine now; the source holds the first action's token, which is its own warning.
    expect(codes(warningsByEntry.second)).not.toContain('capacityGroup');
    expect(codes(warningsByEntry.second)).not.toContain('capacitySystem');
  });

  test('moving the upgrade before the flight removes the warning', () => {
    const g = start('arborec', [setup('A', overTwoCarriers), research(['carrier']), flight('first', overTwoCarriers)]);
    expect(codes(go(g).warningsByEntry.first)).toEqual([]);
  });

  test('state.upgrades is the baseline plus the entries so far, without repeats; a secondary counts and still costs its token', () => {
    const second = research(['carrier', 'cruiser'], 'planned', 'secondary');
    const g = start('arborec', [research(['carrier']), withId('stop', entry({ type: 'pass' })), second], ['fighter']);
    const { state } = go(g);
    expect(state.upgrades).toEqual(['fighter', 'carrier', 'cruiser']);
    expect(state.strategy).toBe(1);
    expect(stateBeforeEntry(g, g.plans[0], 'stop', real).upgrades).toEqual(['fighter', 'carrier']);
    expect(g.upgrades.me).toEqual(['fighter']);
  });

  test('now counts done entries, the forecast also planned ones, a cancelled entry nothing', () => {
    const g = start('arborec', [
      setup('A', overTwoCarriers), research(['carrier']), research(['cruiser'], 'done'), research(['fighter'], 'cancelled'),
      flight('m', overTwoCarriers, 'A', 'B', 'done'),
    ]);
    expect(go(g, 'now').state.upgrades).toEqual(['cruiser']);
    expect(go(g, 'forecast').state.upgrades).toEqual(['carrier', 'cruiser']);
    expect(codes(go(g, 'now').warningsByEntry.m)).toContain('capacityGroup');
    expect(codes(go(g, 'forecast').warningsByEntry.m)).toEqual([]);
  });

  test('a cancelled upgrade changes no capacity', () => {
    const g = start('arborec', [setup('A', overTwoCarriers), research(['carrier'], 'cancelled'), flight('m', overTwoCarriers)]);
    expect(codes(go(g).warningsByEntry.m)).toContain('capacityGroup');
  });

  test('each plan has its own upgrades', () => {
    const g = start('arborec', [setup('A', overTwoCarriers), research(['carrier']), flight('m', overTwoCarriers)]);
    g.plans.push({
      id: 'other', name: 'other',
      rounds: [{ number: 1, strategyCard: null, backupCard: null, entries: [setup('A', overTwoCarriers), flight('m', overTwoCarriers)] }],
    });
    expect(codes(go(g).warningsByEntry.m)).toEqual([]);
    expect(codes(go(g, 'forecast', g.plans[1]).warningsByEntry.m)).toContain('capacityGroup');
    expect(go(g, 'forecast', g.plans[1]).state.upgrades).toEqual([]);
  });

  test('upgrades of a later round do not reach back', () => {
    const g = start('arborec', [setup('A', overTwoCarriers), flight('m', overTwoCarriers)]);
    g.plans[0].rounds.push({ number: 2, strategyCard: null, backupCard: null, entries: [research(['carrier'])] });
    expect(codes(go(g).warningsByEntry.m)).toContain('capacityGroup');
    expect(go(g).state.upgrades).toEqual(['carrier']);
  });

  describe('production cost', () => {
    const warSun = (id: string, status: Entry['status'] = 'planned') =>
      withId(id, entry(tactical({ systemId: 'A', production: { warsun: 1 } }), 'action', status));
    const needed = (warnings: Warning[]) => warnings.find(w => w.code === 'shortResources')?.params.needed;

    test('follows my faction and level: a Muaat War Sun costs 12, then 10 from the upgrade entry onward', () => {
      const g = start('muaat', [warSun('before'), research(['warsun']), warSun('after')]);
      const { warningsByEntry } = go(g);
      expect(needed(warningsByEntry.before)).toBe(12);
      expect(needed(warningsByEntry.after)).toBe(10);
    });

    test('a planned upgrade lowers it in the forecast only', () => {
      const g = start('muaat', [research(['warsun']), warSun('built', 'done')]);
      expect(needed(go(g, 'now').warningsByEntry.built)).toBe(12);
      expect(needed(go(g, 'forecast').warningsByEntry.built)).toBe(10);
    });

    test('another faction pays the base price for the same mark; a fighter stays half a resource, rounded up per type', () => {
      expect(productionCost({ warsun: 1 }, 'arborec', ['warsun'], real)).toBe(12);
      expect(productionCost({ warsun: 1 }, 'muaat', ['warsun'], real)).toBe(10);
      expect(productionCost({ fighter: 3 }, 'muaat', ['fighter'], real)).toBe(2);
    });
  });

  describe('fighters', () => {
    const fighters = (n: number, other: UnitCounts = {}) => ({ carrier: 1, fighter: n, ...other });
    const fly = (faction: string, units: UnitCounts, baseline: UnitId[] = []) =>
      go(start(faction, [setup('A', units), flight('m', units)], baseline)).warningsByEntry.m;

    test('Fighter I is cargo: over capacity it warns', () => {
      expect(codes(fly('arborec', fighters(5)))).toEqual(['capacityGroup', 'capacitySystem']);
    });

    test('with the upgrade no capacity warning', () => {
      expect(codes(fly('arborec', fighters(5), ['fighter']))).toEqual([]);
    });

    test('only fighters past the spare capacity count for the fleet pool', () => {
      // One carrier and a fleet pool of 3: four fighters ride free, two more fill the pool, the seventh is over it.
      expect(codes(fly('arborec', fighters(6), ['fighter']))).toEqual([]);
      const warnings = fly('arborec', fighters(7), ['fighter']);
      expect(codes(warnings)).toEqual(['fleetPool']);
      expect(warnings[0].params).toMatchObject({ ships: 4, fleet: 3 });
    });

    test('ground units take the capacity first, so fewer fighters fit', () => {
      const warnings = fly('arborec', fighters(5, { infantry: 2 }), ['fighter']);
      expect(codes(warnings)).toEqual(['fleetPool']);
      expect(warnings[0].params).toMatchObject({ ships: 4 });
    });

    test("Naalu's Fighter II follows the same rule, without the upgrade the old one", () => {
      expect(codes(fly('naalu', fighters(5), ['fighter']))).toEqual([]);
      expect(codes(fly('naalu', fighters(7), ['fighter']))).toEqual(['fleetPool']);
      expect(codes(fly('naalu', fighters(5)))).toEqual(['capacityGroup', 'capacitySystem']);
    });

    test('the rule follows the move value, never the id or the upgrade mark', () => {
      const own = structuredClone(real);
      own.factions.arborec.ships = { fighter: { one: { id: 'odd', name: 'Odd', cost: 1, capacity: 0, combat: 9, dice: 1, move: 2 } } };
      const g = start('arborec', [setup('A', fighters(5)), flight('m', fighters(5))]);
      expect(codes(project(g, g.plans[0], 'forecast', own).warningsByEntry.m)).toEqual([]);
    });

    test('the meters of the picker agree with the warnings', () => {
      const units = fighters(7, { infantry: 2 });
      const plain = start('arborec', [setup('A', units), flight('m', units)]);
      const flightEntry = plain.plans[0].rounds[0].entries[1] as Extract<Entry, { type: 'tactical' }>;
      const before = stateBeforeEntry(plain, plain.plans[0], 'm', real);
      expect(tacticalMeters(plain, flightEntry, 'A', before, real)).toMatchObject({ group: { load: 9, capacity: 4 }, ships: 1 });
      const up = { ...before, upgrades: ['fighter'] as UnitId[] };
      expect(tacticalMeters(plain, flightEntry, 'A', up, real)).toMatchObject({ group: { load: 2, capacity: 4 }, ships: 6 });
      const withCarrier = { ...before, upgrades: ['carrier'] as UnitId[] };
      expect(tacticalMeters(plain, flightEntry, 'A', withCarrier, real).group).toEqual({ load: 9, capacity: 6 });
    });

    test('with landings the meter and the warning agree: landed infantry free the capacity for the fighters', () => {
      const units = { carrier: 1, fighter: 4, infantry: 4 };
      const planetId = real.tiles['20'].planetIds[0];
      const landed = withId('m', entry(tactical({ systemId: 'B', moves: [{ from: 'A', units }], landings: [{ planetId, units: { infantry: 4 } }] })));
      const g = start('arborec', [setup('A', units), landed], ['fighter']);
      const before = stateBeforeEntry(g, g.plans[0], 'm', real);
      const flightEntry = landed as Extract<Entry, { type: 'tactical' }>;
      expect(codes(go(g).warningsByEntry.m)).toEqual([]);
      expect(tacticalMeters(g, flightEntry, 'A', before, real).ships).toBe(1);
      const staying = withId('n', entry(tactical({ systemId: 'B', moves: [{ from: 'A', units }] })));
      const kept = start('arborec', [setup('A', units), staying], ['fighter']);
      const warned = go(kept).warningsByEntry.n.find(w => w.code === 'fleetPool');
      const meter = tacticalMeters(kept, staying as Extract<Entry, { type: 'tactical' }>, 'A', stateBeforeEntry(kept, kept.plans[0], 'n', real), real);
      expect(warned?.params.ships).toBe(5);
      expect(meter.ships).toBe(5);
    });

    test('with production the meter and the warning agree: built ships count, ground units built on my planet do not', () => {
      const planetId = real.tiles['20'].planetIds[0];
      const units = { carrier: 1, fighter: 5 };
      const built = withId('m', entry(tactical({ systemId: 'B', moves: [{ from: 'A', units }], production: { cruiser: 1, infantry: 3 } })));
      const g = start('arborec', [setup('A', units), built], ['fighter']);
      g.planetControl = { ...g.planetControl, [planetId]: 'me' };
      const meter = tacticalMeters(g, built as Extract<Entry, { type: 'tactical' }>, 'A', stateBeforeEntry(g, g.plans[0], 'm', real), real);
      // Carrier, cruiser and the fifth fighter: the infantry stand on the planet and take no capacity.
      expect(meter.ships).toBe(3);
      expect(codes(go(g).warningsByEntry.m)).not.toContain('fleetPool');
    });
  });
});

describe('adjustment with ground units by planet', () => {
  const game = (entries: Entry[], extra: Partial<Game> = {}) => ({ ...gameWith(entries), ...extra });

  test('ground losses come off their planet only', () => {
    const add = entry({ type: 'adjustment', label: '', delta: { ground: { jord: { infantry: 3 }, arc: { infantry: 1 } } } }, 'strategy');
    const lost = entry({ type: 'adjustment', label: '', kind: 'losses', delta: { ground: { jord: { infantry: -1 } } } });
    const s = run(game([add, lost])).state;
    expect(s.ground.jord).toEqual({ infantry: 2 });
    expect(s.ground.arc).toEqual({ infantry: 1 });
  });

  test('a stack cannot go below nothing, and an empty stack leaves the planet', () => {
    const add = entry({ type: 'adjustment', label: '', delta: { ground: { jord: { infantry: 1 } } } }, 'strategy');
    const lost = entry({ type: 'adjustment', label: '', delta: { ground: { jord: { infantry: -5, mech: -1 } } } });
    expect(run(game([add, lost])).state.ground.jord).toEqual({});
  });

  test('space and ground of one delta both apply', () => {
    const lost = entry({ type: 'adjustment', label: '', kind: 'setup', delta: { units: { systemId: '0,1', units: { cruiser: 2 } }, ground: { lazar: { infantry: 1 } } } });
    const s = run(game([lost])).state;
    expect(s.systems['0,1']).toEqual({ cruiser: 2 });
    expect(s.ground.lazar).toEqual({ infantry: 1 });
  });

  test('a planned loss counts in the forecast, not now', () => {
    const add = entry({ type: 'adjustment', label: '', delta: { ground: { jord: { infantry: 2 } } } }, 'strategy', 'done');
    const lost = entry({ type: 'adjustment', label: '', kind: 'losses', delta: { ground: { jord: { infantry: -1 } } } });
    const g = game([add, lost]);
    expect(project(g, g.plans[0], 'now', pack).state.ground.jord).toEqual({ infantry: 2 });
    expect(project(g, g.plans[0], 'forecast', pack).state.ground.jord).toEqual({ infantry: 1 });
  });
});

describe('createGame structures', () => {
  test('a new game has no PDS', () => {
    expect(createGame({ expansions: ['pok'], playerCount: 3, faction: 'sol' }, pack).pds).toEqual({});
  });
});


describe('production on a chosen planet', () => {
  const build = (productionGround?: Record<string, UnitCounts>, production: UnitCounts = { infantry: 2 }) => withId('b', entry({
    type: 'tactical', systemId: 'H', moves: [], landings: [], production, payment: noPay, productionGround,
  }));
  const homeGame = (e: Entry) => gameWith([e], { map: { H: 'home' } });

  test('ground units go to the planet they were bought on', () => {
    const s = run(homeGame(build({ arc: { infantry: 2 } }))).state;
    expect(s.ground.arc).toEqual({ infantry: 2 });
    expect(s.ground.jord ?? {}).toEqual({});
  });

  test('what has no planet goes to the first planet I control, as before', () => {
    const s = run(homeGame(build({ arc: { infantry: 1 } }))).state;
    expect(s.ground.arc).toEqual({ infantry: 1 });
    expect(s.ground.jord).toEqual({ infantry: 1 });
    expect(run(homeGame(build())).state.ground.jord).toEqual({ infantry: 2 });
  });

  test('a planet list beyond the production places only what was produced', () => {
    expect(run(homeGame(build({ arc: { infantry: 5 } }))).state.ground.arc).toEqual({ infantry: 2 });
  });

  test('the places are read at the entry, after its own landing, not from the end of the round', () => {
    const land = withId('b', entry({
      type: 'tactical', systemId: 'T', moves: [{ from: 'H', units: { carrier: 1, infantry: 1 } }],
      landings: [{ planetId: 'lazar', units: { infantry: 1 } }], production: { cruiser: 1, infantry: 1 }, payment: noPay,
    }));
    const lost = entry({ type: 'adjustment', label: '', delta: {} });
    const g = gameWith([setup('H', { carrier: 1, infantry: 1 }), land, lost], { map: { H: 'home', T: 't2' }, planetControl: {} });
    const before = stateBeforeEntry(g, g.plans[0], 'b', pack);
    expect(productionPlaces(g, land as TacticalBody, before, pack)).toEqual([
      { unit: 'cruiser', planetId: null, count: 1 },
      { unit: 'infantry', planetId: 'lazar', count: 1 },
    ]);
    // A later change of control does not move what the entry already placed.
    expect(productionPlaces(g, build({ arc: { infantry: 1 } }) as TacticalBody, before, pack)).toEqual([
      { unit: 'infantry', planetId: 'arc', count: 1 },
      { unit: 'infantry', planetId: 'jord', count: 1 },
    ]);
  });

  test('without a planet of mine the rest stays in space', () => {
    const e = withId('b', entry({ type: 'tactical', systemId: 'T', moves: [], landings: [], production: { infantry: 1 }, payment: noPay }));
    const g = gameWith([e], { map: { T: 't2', H: 'home' } });
    const before = stateBeforeEntry(g, g.plans[0], 'b', pack);
    expect(productionPlaces(g, e as TacticalBody, before, pack)).toEqual([{ unit: 'infantry', planetId: null, count: 1 }]);
    expect(run(g).state.systems.T).toEqual({ infantry: 1 });
  });
});

describe('pickups on the way', () => {
  const route = (over: Partial<TacticalBody>, id = 'r') => withId(id, entry(tactical({ systemId: 'T', ...over })));
  const game = (entries: Entry[]) => {
    const g = createGame({ expansions: [], playerCount: 3, faction: 'sol' }, pack);
    g.map = { A: 't1', M: 't2', T: 't1', H: 'home' };
    g.plans[0].rounds[0].entries = [setup('A', { carrier: 1 }), setup('M', { fighter: 2 }), ...entries];
    return g;
  };

  test('units leave the transit system and arrive with the group', () => {
    const g = game([route({ moves: [
      { from: 'A', units: { carrier: 1 }, via: ['M'] },
      { from: 'M', units: { fighter: 2 }, pickupOf: 'A' },
    ] })]);
    const { state, warningsByEntry } = project(g, g.plans[0], 'forecast', pack);
    expect(state.systems.M).toEqual({});
    expect(state.systems.T).toEqual({ carrier: 1, fighter: 2 });
    expect(warningsByEntry.r).toEqual([]);
  });

  test('a pickup counts against the capacity of the group it joins, not as a group of its own', () => {
    const g = game([route({ moves: [
      { from: 'M', units: { fighter: 2 }, pickupOf: 'A' },
      { from: 'A', units: { cruiser: 1 }, via: ['M'] },
    ] })]);
    g.plans[0].rounds[0].entries[0] = setup('A', { cruiser: 1 });
    const warnings = project(g, g.plans[0], 'forecast', pack).warningsByEntry.r.filter(w => w.code === 'capacityGroup');
    expect(warnings).toEqual([{ code: 'capacityGroup', params: { from: 'A', load: 2, capacity: 0 } }]);
  });

  test('ground units are picked up from a planet on the way, and the meters count them', () => {
    const body = tactical({ systemId: 'T', moves: [
      { from: 'A', units: { carrier: 1 }, via: ['M'] },
      { from: 'lazar', units: { infantry: 3 }, pickupOf: 'A' },
    ] });
    const e = withId('r', entry(body));
    const g = game([withId('g', entry({ type: 'adjustment', label: '', delta: { ground: { lazar: { infantry: 3 } } } }, 'strategy', 'done')), e]);
    const { state, warningsByEntry } = project(g, g.plans[0], 'forecast', pack);
    expect(state.ground.lazar).toEqual({});
    expect(state.systems.T).toEqual({ carrier: 1, infantry: 3 });
    expect(warningsByEntry.r).toEqual([]);
    const before = stateBeforeEntry(g, g.plans[0], 'r', pack);
    expect(tacticalMeters(g, e as TacticalBody, 'A', before, pack).group).toEqual({ load: 3, capacity: 4 });
  });

  test('a source with nothing chosen yet moves nothing and warns of nothing', () => {
    const g = game([route({ moves: [{ from: 'A', units: {} }] })]);
    const { state, warningsByEntry } = project(g, g.plans[0], 'forecast', pack);
    expect(state.systems.A).toEqual({ carrier: 1 });
    expect(warningsByEntry.r).toEqual([]);
  });

  test('choosing more than exists on the way warns and blocks nothing', () => {
    const g = game([route({ moves: [
      { from: 'A', units: { carrier: 1 }, via: ['M'] },
      { from: 'M', units: { fighter: 3 }, pickupOf: 'A' },
    ] })]);
    const { state, warningsByEntry } = project(g, g.plans[0], 'forecast', pack);
    expect(state.systems.T).toEqual({ carrier: 1, fighter: 2 });
    expect(warningsByEntry.r).toContainEqual({ code: 'unitsMissing', params: { where: 'M', unit: 'fighter', missing: 1 } });
  });
});

describe('Construction\'s secondary', () => {
  const secondaryOn = (expansions: ExpansionId[], effects: CardEffects) => {
    const pack = loadPack(expansions);
    const game = createGame({ expansions, playerCount: 6, faction: 'sol' }, pack);
    const round = game.plans[0].rounds[0];
    round.entries.push(
      { id: 't', phase: 'action', status: 'planned', type: 'tactical', systemId: '1,0', moves: [], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 } },
      { id: 'c', phase: 'action', status: 'planned', type: 'secondary', card: CARD.construction, effects },
    );
    return project(game, game.plans[0], 'forecast', pack);
  };

  test('warns before Thunder\'s Edge when its token would join one of mine, and does not forbid it', () => {
    expect(secondaryOn(['pok'], { systemId: '1,0' }).warningsByEntry.c.map(w => w.code)).toEqual(['systemHasToken']);
    const free = secondaryOn(['pok'], { systemId: '2,0' });
    expect(free.warningsByEntry.c).toEqual([]);
    expect(free.state.tokensOnMap).toContain('2,0');
  });

  test('says so when units are built through it, and leaves no token with Thunder\'s Edge', () => {
    const built = secondaryOn(['pok', 'te'], { systemId: '1,0', production: { systemId: '1,0', units: { cruiser: 1 } } });
    expect(built.warningsByEntry.c.map(w => w.code)).toContain('constructionUnits');
    expect(built.warningsByEntry.c.map(w => w.code)).not.toContain('systemHasToken');
  });
});

describe('adjacency at the edge of the Fracture', () => {
  const game = { fracture: { active: true, ingress: [], seat: null, tiles: { '0,-4': 'fracture4', '1,-4': 'fracture5' } } } as unknown as Game;
  test('a Fracture system does not touch the map beside it, but does touch the Fracture system beside it', () => {
    const adjacent = systemsAdjacent(game);
    expect(adjacent('0,-4', '0,-3')).toBe(false);
    expect(adjacent('0,-4', '1,-4')).toBe(true);
    expect(adjacent('0,-3', '0,-2')).toBe(true);
  });
});
