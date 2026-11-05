import { describe, expect, test } from 'vitest';
import { loadPack } from './loadPack';
import type { ExpansionId } from '../domain/types';

const distinctNumbers = (expansions: ExpansionId[]) =>
  new Set(Object.values(loadPack(expansions).tiles).map(t => t.number)).size;

test('базовая игра содержит 51 тайл', () => {
  expect(Object.keys(loadPack([]).tiles).length).toBe(51);
});

test('контент выключенных дополнений не попадает в пакет', () => {
  const ids = Object.keys(loadPack([]).planets);
  expect(ids).not.toContain('thundersedge');
  expect(ids).not.toContain('styx');
  expect(loadPack([]).tiles['83A']).toBeUndefined();
  expect(loadPack(['te']).tiles['83A']).toBeUndefined();
  expect(loadPack(['te']).planets.ixth).toBeUndefined();
  expect(loadPack(['pok']).tiles['119A']).toBeUndefined();
});

test("данные Thunder's Edge загружаются без Prophecy of Kings", () => {
  expect(loadPack(['te']).planets.styx).toMatchObject({ resources: 4, influence: 0 });
  expect(loadPack(['te']).planets.thundersedge).toMatchObject({ resources: 5, influence: 1 });
});

test('физических тайлов столько, сколько в коробках', () => {
  expect(distinctNumbers([])).toBe(51);
  expect(distinctNumbers(['pok'])).toBe(51 + 40);
  // 33 тайла систем и гиперпутей плюс 7 систем Излома: печатные номера Излома не подтверждены
  expect(distinctNumbers(['te'])).toBe(51 + 33 + 7);
});

test('сторона гиперпути входит в id, повёрнутых копий источника нет', () => {
  const { tiles } = loadPack(['pok']);
  expect(tiles['83A']).toMatchObject({ number: '83', kind: 'hyperlane', planetIds: [] });
  expect(tiles['83B']).toMatchObject({ number: '83', kind: 'hyperlane' });
  expect(Object.keys(tiles).filter(id => /^(8[3-9]|9[01])[AB]$/.test(id))).toHaveLength(18);
  expect(Object.keys(tiles).filter(id => /^\d+[ab]\d+$/.test(id))).toHaveLength(0);
});

test('номера базовых тайлов без ведущего нуля', () => {
  expect(loadPack([]).tiles['1']).toMatchObject({ number: '1', kind: 'home', planetIds: ['jord'] });
  expect(loadPack([]).tiles['01']).toBeUndefined();
});

test('виды тайлов и аномалии', () => {
  const { tiles } = loadPack(['pok', 'te']);
  expect(tiles['17'].kind).toBe('system');
  expect(tiles['51'].kind).toBe('home');
  expect(tiles['81']).toMatchObject({ kind: 'system', anomaly: 'supernova' });
  expect(tiles['67']).toMatchObject({ anomaly: 'rift', planetIds: ['cormund'] });
  expect(tiles['25'].wormholes).toEqual(['beta']);
  expect(tiles['114'].anomaly).toBe('scar');
  expect(tiles['117']).toMatchObject({ anomaly: 'rift', secondAnomaly: 'asteroid' });
  expect(tiles['fracture4']).toMatchObject({ kind: 'fracture', planetIds: ['styx'] });
  expect(tiles['119A']).toMatchObject({ number: '119', kind: 'hyperlane', planetIds: [], wormholes: [] });
});

test('ссылки на планеты и домашние тайлы целостны при любом наборе', () => {
  const sets: ExpansionId[][] = [[], ['pok'], ['te'], ['pok', 'te']];
  for (const set of sets) {
    const pack = loadPack(set);
    for (const tile of Object.values(pack.tiles))
      for (const id of tile.planetIds) expect(pack.planets[id], id).toBeDefined();
    for (const faction of Object.values(pack.factions))
      expect(pack.tiles[faction.homeTile], faction.id).toBeDefined();
  }
});

describe('юниты', () => {
  test('базовые характеристики', () => {
    const { units } = loadPack([]);
    expect(units.fighter).toMatchObject({ cost: 0.5, capacity: 0, fighter: true, ground: false });
    expect(units.infantry).toMatchObject({ cost: 0.5, ground: true, fighter: false });
    expect(units.carrier).toMatchObject({ cost: 3, capacity: 4 });
    expect(units.cruiser).toMatchObject({ cost: 2, capacity: 0 });
    expect(units.destroyer).toMatchObject({ cost: 1, capacity: 0 });
    expect(units.dreadnought).toMatchObject({ cost: 4, capacity: 1 });
    expect(units.warsun).toMatchObject({ cost: 12, capacity: 6 });
    expect(units.flagship).toMatchObject({ cost: 8, capacity: 3 });
  });
  test('мехи есть только с Prophecy of Kings', () => {
    expect(loadPack([]).units.mech).toBeUndefined();
    expect(loadPack(['te']).units.mech).toBeUndefined();
    expect(loadPack(['pok']).units.mech).toMatchObject({ cost: 2, ground: true });
  });
});

describe('фракции', () => {
  test('стартовые наборы разбираются, сооружения в них не входят', () => {
    expect(loadPack([]).factions.arborec.startUnits).toEqual({ carrier: 1, cruiser: 1, fighter: 2, infantry: 4 });
    expect(loadPack(['pok']).factions.nomad.startUnits).toMatchObject({ flagship: 1 });
    expect(loadPack(['pok']).factions.naaz.startUnits).toMatchObject({ mech: 1 });
    expect(loadPack(['te']).factions.bastion.startUnits).toMatchObject({ cruiser: 1, dreadnought: 1 });
  });
  test('домашний тайл содержит домашние планеты', () => {
    expect(loadPack([]).factions.ghost.homeTile).toBe('51');
    expect(loadPack(['te']).factions.crimson.homeTile).toBe('118');
    expect(loadPack(['pok']).factions.keleresa.homeTile).toBe('58');
    expect(loadPack(['pok']).factions.keleresm.homeTile).toBe('2');
  });
  test('в наборе только фракции включённых дополнений', () => {
    expect(Object.keys(loadPack([]).factions)).toHaveLength(17);
    expect(loadPack([]).factions.nomad).toBeUndefined();
    expect(loadPack(['te']).factions.keleresa).toBeUndefined();
  });
});

describe('шаблоны карты', () => {
  const template = (expansions: ExpansionId[], playerCount: number, layout: 'standard' | 'hyperlanes' = 'standard') =>
    loadPack(expansions).templates.find(t => t.playerCount === playerCount && t.layout === layout);

  test('на 6 игроков 37 слотов с Mecatol Rex в центре', () => {
    const slots = template([], 6)!.slots;
    expect(slots).toHaveLength(37);
    expect(slots.find(s => s.q === 0 && s.r === 0)?.fixed).toBe('18');
  });
  test('без Prophecy of Kings нет шаблонов на 7 и 8 игроков', () => {
    expect(loadPack([]).templates.map(t => t.playerCount).sort()).toEqual([3, 4, 5, 6]);
    expect(template(['te'], 7)).toBeUndefined();
  });
  test('шаблон на 5 игроков с Prophecy of Kings ставит гиперпути со стороной и поворотом', () => {
    const fixed = template(['pok'], 5, 'hyperlanes')!.slots.flatMap(s => s.fixed ?? []);
    expect(fixed).toContain('86A@0');
    expect(fixed).toHaveLength(7);
    expect(template(['pok'], 3)!.slots.flatMap(s => s.fixed ?? [])).toEqual(['18']);
  });
  test('на 3 игрока 28 слотов: по 8 тайлов на игрока, дома и Mecatol Rex', () => {
    const slots = template([], 3)!.slots;
    expect(slots).toHaveLength(3 * 8 + 3 + 1);
    expect(slots.flatMap(s => s.fixed ?? [])).toEqual(['18']);
    expect(template(['pok'], 3)!.slots).toHaveLength(28);
    // Домашние углы третьего кольца идут через один: 301 есть, 304 нет
    expect(slots.some(s => s.q === 0 && s.r === -3)).toBe(true);
    expect(slots.some(s => s.q === 3 && s.r === -3)).toBe(false);
  });
  test('на 4 и 5 игроков без гиперпутей три кольца', () => {
    expect(template([], 4)!.slots).toHaveLength(37);
    expect(template([], 5)!.slots).toHaveLength(37);
  });
  test('на 7 и 8 игроков четыре кольца, по одному шаблону, гиперпути вводятся вручную', () => {
    for (const n of [7, 8]) {
      const slots = template(['pok'], n)!.slots;
      expect(slots).toHaveLength(61);
      expect(slots.flatMap(s => s.fixed ?? [])).toEqual(['18']);
      expect(new Set(slots.map(s => `${s.q},${s.r}`)).size).toBe(61);
    }
    expect(loadPack(['pok']).templates.map(t => `${t.playerCount}${t.layout === 'hyperlanes' ? 'h' : ''}`))
      .toEqual(['3', '3h', '4', '4h', '5', '5h', '6', '7', '8']);
  });
  test('без Prophecy of Kings гиперпутевых шаблонов нет, с ней они на 3, 4 и 5 игроков', () => {
    expect(loadPack([]).templates.every(t => t.layout === 'standard')).toBe(true);
    expect(loadPack(['te']).templates.some(t => t.layout === 'hyperlanes')).toBe(false);
    expect(loadPack(['pok']).templates.filter(t => t.layout === 'hyperlanes').map(t => t.playerCount)).toEqual([3, 4, 5]);
  });
  test('у каждого шаблона есть дома по числу игроков, места по часовой от верха', () => {
    for (const t of loadPack(['pok']).templates) expect(t.homes).toHaveLength(t.playerCount);
    expect(template([], 6)!.homes).toEqual(['0,-3', '3,-3', '3,0', '0,3', '-3,3', '-3,0']);
  });
  test('линии гиперпутей: у тайлов из источника есть пары граней, у 119A-124A нет', () => {
    const tiles = loadPack(['pok', 'te']).tiles;
    expect(tiles['83A'].lanes).toEqual([[1, 4]]);
    expect(tiles['83B'].lanes).toEqual([[0, 2], [0, 3], [3, 5]]);
    expect(tiles['87A'].lanes).toEqual([[0, 2], [2, 4], [2, 5]]);
    const lanes = Object.values(tiles).filter(t => t.kind === 'hyperlane' && t.lanes);
    expect(lanes.map(t => t.id)).toHaveLength(18);
    expect(tiles['119A'].lanes).toBeUndefined();
    expect(tiles['25'].lanes).toBeUndefined();
  });
  test("Thunder's Edge заменяет Mecatol Rex на тайл 112 во всех шаблонах", () => {
    for (const set of [['te'], ['pok', 'te']] as ExpansionId[][]) {
      const pack = loadPack(set);
      expect(pack.tiles['112'].planetIds).toEqual(['mrte']);
      for (const t of pack.templates) {
        const center = t.slots.find(s => s.q === 0 && s.r === 0)!;
        expect(center.fixed).toBe('112');
      }
    }
  });
  test('координаты слотов не повторяются, север первый по кольцу', () => {
    for (const t of loadPack(['pok']).templates) {
      const keys = t.slots.map(s => `${s.q},${s.r}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
    expect(template([], 6)!.slots.some(s => s.q === 0 && s.r === -3)).toBe(true);
    expect(template([], 6)!.slots.some(s => s.q === 3 && s.r === -3)).toBe(true);
  });
});
