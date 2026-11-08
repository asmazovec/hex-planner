import { describe, expect, test } from 'vitest';
import { loadPack } from './loadPack';
import type { ExpansionId, MapLayout } from '../domain/types';

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
  const template = (expansions: ExpansionId[], playerCount: number, layout: MapLayout = 'standard') =>
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
  test('с Prophecy of Kings шаблоны правил: Большая галактика на 6, гиперпути и альтернативные на 7, обычная и альтернативная на 8', () => {
    expect(loadPack(['pok']).templates.map(t => `${t.playerCount}-${t.layout}`)).toEqual([
      '3-standard', '3-hyperlanes', '4-standard', '4-hyperlanes', '5-standard', '5-hyperlanes',
      '6-standard', '6-large', '7-hyperlanes', '7-alternate', '8-standard', '8-alternate',
    ]);
    expect(template(['pok'], 8)!.slots.flatMap(s => s.fixed ?? [])).toEqual(['18']);
  });
  test('без Prophecy of Kings только обычные шаблоны, гиперпутевые с ней на 3, 4, 5 и 7 игроков', () => {
    expect(loadPack([]).templates.every(t => t.layout === 'standard')).toBe(true);
    expect(loadPack(['te']).templates.some(t => t.layout !== 'standard')).toBe(false);
    expect(loadPack(['pok']).templates.filter(t => t.layout === 'hyperlanes').map(t => t.playerCount)).toEqual([3, 4, 5, 7]);
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

describe('faction reference data', () => {
  const full = loadPack(['pok', 'te']);

  test('Sol has the starting technologies and commodities of the source', () => {
    expect(full.factions.sol.startingTech).toEqual(['amd', 'nm']);
    expect(full.factions.sol.commodities).toBe(4);
    expect(full.factions.sol.abilities).toEqual(['Orbital Drop', 'Versatile']);
  });

  test('a faction that chooses its technologies carries the choice, not a fixed list', () => {
    expect(full.factions.winnu.startingTech).toEqual([]);
    expect(full.factions.winnu.startingTechChoice?.amount).toBe(1);
    expect(full.factions.argent.startingTechChoice).toEqual({ amount: 2, options: ['nm', 'st', 'ps'] });
    expect(full.factions.deepwrought.startingTechChoice).toEqual({ amount: 2, options: [] });
  });

  test('every technology a faction names is in the pack of that faction, with a type', () => {
    for (const expansions of [[], ['pok'], ['te'], ['pok', 'te']] as ExpansionId[][]) {
      const pack = loadPack(expansions);
      for (const faction of Object.values(pack.factions)) {
        for (const id of [...faction.startingTech, ...(faction.startingTechChoice?.options ?? [])]) {
          expect(pack.technologies[id]?.name, `${faction.id}: ${id}`).toBeTruthy();
          expect(['propulsion', 'biotic', 'cybernetic', 'warfare']).toContain(pack.technologies[id].type);
        }
      }
    }
  });

  test('every official faction has its faction technologies in its own pack, each with a type or a unit it upgrades', () => {
    for (const expansions of [[], ['pok'], ['te'], ['pok', 'te']] as ExpansionId[][]) {
      const pack = loadPack(expansions);
      for (const faction of Object.values(pack.factions)) {
        const techs = faction.sheet!.techs;
        expect(techs.length, faction.id).toBeGreaterThanOrEqual(2);
        for (const { id } of techs) {
          const tech = pack.technologies[id];
          expect(tech?.name, `${faction.id}: ${id}`).toBeTruthy();
          expect(tech.type !== null || tech.upgrade !== undefined || ['vax', 'vay'].includes(id), `${faction.id}: ${id}`).toBe(true);
        }
      }
    }
  });

  test('faction technologies per pack: 34 of the base game, 17 with Prophecy of Kings and Codex, 12 of Thunder\'s Edge', () => {
    const count = (expansions: ExpansionId[], only: (id: string) => boolean) =>
      new Set(Object.values(loadPack(expansions).factions).filter(f => only(f.id)).flatMap(f => f.sheet!.techs.map(t => t.id))).size;
    const base = loadPack([]).factions;
    const pok = loadPack(['pok']).factions;
    expect(count([], () => true)).toBe(34);
    expect(count(['pok'], id => !base[id])).toBe(17);
    expect(count(['te'], id => !base[id] && !pok[id])).toBe(12);
  });

  test('prerequisites are read per colour and unit upgrades are marked with the unit', () => {
    expect(full.technologies.pws2).toMatchObject({ name: 'Prototype War Sun II', type: null, upgrade: 'warsun', requires: { warfare: 3, cybernetic: 1 } });
    expect(full.technologies.lw2).toMatchObject({ type: null, upgrade: 'infantry', requires: { biotic: 2 } });
    expect(full.technologies.m2).toMatchObject({ upgrade: 'flagship', requires: { biotic: 1, propulsion: 1, cybernetic: 1 } });
    expect(full.technologies.ffac2.upgrade).toBe('spacedock');
    expect(full.technologies.ht2.upgrade).toBe('pds');
    expect(full.technologies.l4).toEqual({ id: 'l4', name: 'L4 Disruptors', type: 'cybernetic', requires: { cybernetic: 1 } });
    expect(full.technologies.mc.upgrade).toBeUndefined();
    expect(full.technologies['parasite-obs'].requires).toBeUndefined();
  });

  test('a gate faction stands on its gate tile, its planets stay on the off-map tile', () => {
    expect(full.factions.ghost.gateTile).toBe('17');
    expect(full.factions.crimson.gateTile).toBe('94');
    expect(full.factions.sol.gateTile).toBeUndefined();
  });

  test('unit values come from the source, limits from LRR 96.2; fighters and infantry stay unlimited', () => {
    expect(full.units.carrier).toMatchObject({ combat: 9, move: 1, limit: 4 });
    expect(full.units.fighter).toMatchObject({ combat: 9, move: null, limit: null });
    expect(full.units.infantry?.limit).toBeNull();
    expect(full.structures.map(s => [s.id, s.limit])).toEqual([['pds', 6], ['spacedock', 3]]);
  });

  test('space docks have Production of the planet\'s resources plus 2, plus 4 at level II', () => {
    const dock = full.structures.find(s => s.id === 'spacedock');
    expect([dock?.levels.one.production, dock?.levels.two?.production]).toEqual([2, 4]);
  });

  test('the two egress systems of the Fracture are marked', () => {
    expect(Object.values(full.tiles).filter(tile => tile.egress).map(tile => tile.id).sort()).toEqual(['fracture2', 'fracture6']);
  });
});

describe('ship data in the packs', () => {
  const full = loadPack(['pok', 'te']);

  test('Argent destroyer carries 1, L1Z1X dreadnought 2, flagships differ by faction', () => {
    expect(full.factions.argent.ships?.destroyer).toMatchObject({ one: { name: 'Strike Wing Alpha I', capacity: 1 }, two: { name: 'Strike Wing Alpha II', capacity: 1 } });
    expect(full.factions.l1z1x.ships?.dreadnought).toMatchObject({ one: { capacity: 2 }, two: { capacity: 2 } });
    expect(full.factions.sol.ships?.flagship?.one).toMatchObject({ name: 'Genesis', capacity: 12 });
    expect(full.factions.yssaril.ships?.flagship?.one).toMatchObject({ name: "Y'sia Y'ssrila", move: 2 });
    expect(full.factions.keleresa.ships?.flagship?.one.name).toBe('Artemiris');
  });

  test('every faction has its own flagship; only Memoria has a level II', () => {
    const levels = Object.values(full.factions).map(f => f.ships?.flagship);
    expect(levels.every(Boolean)).toBe(true);
    expect(Object.values(full.factions).filter(f => f.ships?.flagship?.two).map(f => f.id)).toEqual(['nomad']);
  });

  test('the base table has level II for the ships that have one', () => {
    expect(full.units.carrier?.levels?.two).toMatchObject({ name: 'Carrier II', capacity: 6, move: 2, cost: 3 });
    expect(full.units.fighter?.levels?.two).toMatchObject({ combat: 8, move: 2 });
    expect(full.units.warsun?.levels?.two).toBeUndefined();
    expect(full.units.warsun?.levels?.one.dice).toBe(3);
  });

  test('the Corsair, a third level, is not read as a Mentak level', () => {
    expect(full.factions.mentak.ships?.cruiser).toBeUndefined();
  });
});
