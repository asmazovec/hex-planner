import { describe, expect, test } from 'vitest';
import { createGame } from './newGame';
import { productionCost, project, readyInfluence, readyResources } from './project';
import type {
  AdjustmentDelta, DataPack, Entry, EntryBody, Game, Payment, Phase, UnitCounts, UnitDef, UnitId, Warning,
} from './types';

const unit = (id: UnitId, o: Partial<UnitDef>): UnitDef =>
  ({ id, name: id, cost: 1, capacity: 0, capacityUsed: 1, ground: false, fighter: false, ...o });

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
  factions: { sol: { id: 'sol', name: 'Sol', homeTile: 'home', startUnits: { carrier: 1, infantry: 2 } } },
  templates: [{ playerCount: 3, slots: [{ q: 0, r: 0, fixed: '18' }, { q: 1, r: 0 }] }],
};

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
    expect(productionCost({ fighter: 3 }, pack)).toBe(2);
    expect(productionCost({ cruiser: 2, infantry: 1 }, pack)).toBe(5);
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

  test('экспедиция: заглушка оплаты расходует планеты', () => {
    const g = gameWith([entry({ type: 'expedition', sliceId: null, payment: { planets: ['jord'], tradeGoods: 0 } })]);
    expect(run(g).state.exhausted).toEqual(['jord']);
  });
});

describe('createGame', () => {
  test('стартовые значения и планеты домашней системы', () => {
    const g = createGame({ expansions: ['pok'], playerCount: 3, faction: 'sol' }, pack);
    expect(g.planetControl).toEqual({ jord: 'me', arc: 'me' });
    expect(g.map).toEqual({ '0,0': '18' });
    expect(g.dataVersion).toBe('test');
    expect(g.opponents).toHaveLength(2);
    expect(g.activePlanId).toBe(g.plans[0].id);
    expect(g.plans[0].rounds).toHaveLength(1);
  });
});
