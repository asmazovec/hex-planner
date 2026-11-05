import { describe, expect, test } from 'vitest';
import { checkCounts, readPlanetKind, readPlanetMarks, checkLaneRotations, normalizeTileId, parseHyperlanes, parseStartingFleet, positionToAxial, readStartingTech, readTech, selectShips } from './build-data';
import { rotateLanes } from '../src/domain/lanes';

test('сборщик падает при неверном количестве', () => {
  expect(() => checkCounts({ base: 50 }, { base: 51 })).toThrow(/base/);
});

test('сборщик падает, если счётчик отсутствует или лишний', () => {
  expect(() => checkCounts({}, { base: 51 })).toThrow(/base/);
  expect(() => checkCounts({ base: 51, pok: 1 }, { base: 51 })).toThrow(/pok/);
});

test('верные количества проходят', () => {
  expect(() => checkCounts({ base: 51 }, { base: 51 })).not.toThrow();
});

test('стартовый флот: синонимы, сооружения отброшены, неизвестный код ломает сборку', () => {
  expect(parseStartingFleet('cv, cr,2 ff, 4 inf n,pds n, sd n'))
    .toEqual({ carrier: 1, cruiser: 1, fighter: 2, infantry: 4 });
  expect(parseStartingFleet('2 inf, 2 cv, 2 ff, 1 ca, sd mollprimusk'))
    .toEqual({ infantry: 2, carrier: 2, fighter: 2, cruiser: 1 });
  expect(parseStartingFleet('dn,2 cr,mech r,fs,ws,dd'))
    .toEqual({ dreadnought: 1, cruiser: 2, mech: 1, flagship: 1, warsun: 1, destroyer: 1 });
  expect(() => parseStartingFleet('2 zz')).toThrow(/zz/);
});

test('позиция источника переводится в осевые координаты: север, затем по часовой', () => {
  expect(positionToAxial('000')).toEqual({ q: 0, r: 0 });
  expect(positionToAxial('101')).toEqual({ q: 0, r: -1 });
  expect(positionToAxial('102')).toEqual({ q: 1, r: -1 });
  expect(positionToAxial('104')).toEqual({ q: 0, r: 1 });
  expect(positionToAxial('304')).toEqual({ q: 3, r: -3 });
  expect(positionToAxial('318')).toEqual({ q: -1, r: -2 });
});

test('id тайлов нормализуются', () => {
  expect(normalizeTileId('01')).toBe('1');
  expect(normalizeTileId('83a')).toBe('83A');
  expect(normalizeTileId('96b')).toBe('96B');
  expect(normalizeTileId('fracture4')).toBe('fracture4');
});

test('связи гиперпутей читаются из матрицы граней: пары один раз, повороты источника пропущены', () => {
  const text = [
    '83a=0,0,0,0,0,0;0,0,0,0,1,0;0,0,0,0,0,0;0,0,0,0,0,0;0,1,0,0,0,0;0,0,0,0,0,0',
    '83a60=0,0,0,0,0,0;0,0,0,0,0,0;0,0,0,0,0,1;0,0,0,0,0,0;0,0,0,0,0,0;0,0,1,0,0,0',
    '87a=0,0,1,0,0,0;0,0,0,0,0,0;1,0,0,0,1,1;0,0,0,0,0,0;0,0,1,0,0,0;0,0,1,0,0,0',
    '# comment',
  ].join('\n');
  expect(parseHyperlanes(text)).toEqual({ '83A': [[1, 4]], '87A': [[0, 2], [2, 4], [2, 5]] });
});

test('поворот гиперпута сдвигает номера граней по часовой, источник это подтверждает', () => {
  expect(rotateLanes([[1, 4]], 1)).toEqual([[2, 5]]);
  expect(rotateLanes([[1, 4]], 5)).toEqual([[0, 3]]);
  expect(rotateLanes([[0, 2], [0, 3], [3, 5]], 2)).toEqual([[1, 5], [2, 4], [2, 5]]);
  const lines = [
    '83a=0,0,0,0,0,0;0,0,0,0,1,0;0,0,0,0,0,0;0,0,0,0,0,0;0,1,0,0,0,0;0,0,0,0,0,0',
    '83a60=0,0,0,0,0,0;0,0,0,0,0,0;0,0,0,0,0,1;0,0,0,0,0,0;0,0,0,0,0,0;0,0,1,0,0,0',
    '83a120=0,0,0,1,0,0;0,0,0,0,0,0;0,0,0,0,0,0;1,0,0,0,0,0;0,0,0,0,0,0;0,0,0,0,0,0',
    '83a180=0,0,0,0,0,0;0,0,0,0,1,0;0,0,0,0,0,0;0,0,0,0,0,0;0,1,0,0,0,0;0,0,0,0,0,0',
    '83a240=0,0,0,0,0,0;0,0,0,0,0,0;0,0,0,0,0,1;0,0,0,0,0,0;0,0,0,0,0,0;0,0,1,0,0,0',
    '83a300=0,0,0,1,0,0;0,0,0,0,0,0;0,0,0,0,0,0;1,0,0,0,0,0;0,0,0,0,0,0;0,0,0,0,0,0',
  ];
  expect(() => checkLaneRotations(lines.join('\n'))).not.toThrow();
  const wrong = [...lines.slice(0, 2), lines[2].replace('0,0,0,1,0,0;', '0,0,0,0,1,0;'), ...lines.slice(3)];
  expect(() => checkLaneRotations(wrong.join('\n'))).toThrow(/83a/);
});

test('стартовые технологии: фиксированный список, выбор, отсутствие', () => {
  expect(readStartingTech({ startingTech: ['amd', 'nm'] })).toEqual({ startingTech: ['amd', 'nm'] });
  expect(readStartingTech({ startingTechAmount: 2, startingTechOptions: ['nm', 'st'] }))
    .toEqual({ startingTech: [], startingTechChoice: { amount: 2, options: ['nm', 'st'] } });
  expect(readStartingTech({ startingTechAmount: 2 })).toEqual({ startingTech: [], startingTechChoice: { amount: 2, options: [] } });
  expect(readStartingTech({ startingTechAmount: 0, startingTechOptions: [] })).toEqual({ startingTech: [] });
});

test('технология берётся без текста, неизвестный тип ломает сборку', () => {
  const tech = { alias: 'amd', name: 'Antimass Deflectors', types: ['PROPULSION'], source: 'base', text: 'card text' };
  expect(readTech(tech)).toEqual({ id: 'amd', name: 'Antimass Deflectors', type: 'propulsion' });
  expect(() => readTech({ ...tech, types: ['NONE'] })).toThrow(/amd/);
});

test('отметки планеты: технологии и пропуски из techSpecialties', () => {
  expect(readPlanetMarks({ id: 'a', techSpecialties: ['BIOTIC'] })).toEqual({ tech: ['biotic'] });
  expect(readPlanetMarks({ id: 'a', techSpecialties: ['UNITSKIP'] })).toEqual({ skip: 'unit' });
  expect(readPlanetMarks({ id: 'a', techSpecialties: ['NONUNITSKIP'] })).toEqual({ skip: 'nonUnit' });
  expect(readPlanetMarks({ id: 'a', techSpecialties: ['WARFARE', 'PROPULSION'] })).toEqual({ tech: ['warfare', 'propulsion'] });
  expect(readPlanetMarks({ id: 'a', techSpecialties: null })).toEqual({});
  expect(readPlanetMarks({ id: 'a' })).toEqual({});
  expect(() => readPlanetMarks({ id: 'a', techSpecialties: ['PLASMA'] })).toThrow(/PLASMA/);
});

test('отметки планеты: повтор технологии в источнике даёт одну отметку', () => {
  expect(readPlanetMarks({ id: 'a', techSpecialties: ['CYBERNETIC', 'CYBERNETIC'] })).toEqual({ tech: ['cybernetic'] });
});

test('вид планеты: черты из planetType и planetTypes без повторов, легендарная способность', () => {
  expect(readPlanetKind({ id: 'a', planetType: 'HAZARDOUS' })).toEqual({ traits: ['hazardous'] });
  expect(readPlanetKind({ id: 'a', planetTypes: ['INDUSTRIAL', 'HAZARDOUS'] })).toEqual({ traits: ['industrial', 'hazardous'] });
  expect(readPlanetKind({ id: 'a', planetType: 'CULTURAL', planetTypes: ['CULTURAL'] })).toEqual({ traits: ['cultural'] });
  for (const none of ['FACTION', 'NONE', 'MR', 'SPACESTATION', 'LIGHTNING', 'FAKE']) expect(readPlanetKind({ id: 'a', planetType: none })).toEqual({});
  expect(readPlanetKind({ id: 'a', planetTypes: ['FACTION', 'CULTURAL'] })).toEqual({ traits: ['cultural'] });
  expect(readPlanetKind({ id: 'a' })).toEqual({});
  expect(readPlanetKind({ id: 'a', legendaryAbilityName: 'Imperial Arms Vault' })).toEqual({ legendary: 'Imperial Arms Vault' });
  expect(readPlanetKind({ id: 'a', legendaryAbilityName: null })).toEqual({});
  expect(() => readPlanetKind({ id: 'a', planetType: 'PLASMA' })).toThrow(/PLASMA/);
});

describe('selectShips', () => {
  const ship = (id: string, baseType: string, o: Record<string, unknown> = {}) =>
    ({ id, baseType, name: id, source: 'base', cost: 1, capacityValue: 1, combatHitsOn: 7, combatDieCount: 1, moveValue: 2, ...o });
  const ids = ['alpha', 'keleresa', 'keleresm', 'keleresx'];
  const flagship = ship('alpha_flagship', 'flagship', { faction: 'alpha' });
  const keleres = ship('keleres_flagship', 'flagship', { faction: 'keleresm', source: 'codex3' });
  const run = (units: ReturnType<typeof ship>[]) => selectShips([flagship, keleres, ...units], ids);

  test('generic ships get levels I and II from upgradesFromUnitId', () => {
    const { generic } = run([ship('carrier', 'carrier'), ship('carrier2', 'carrier', { upgradesFromUnitId: 'carrier', capacityValue: 6 })]);
    expect(generic.carrier?.one.capacity).toBe(1);
    expect(generic.carrier?.two?.capacity).toBe(6);
    expect(generic.carrier?.two?.name).toBe('carrier2');
  });

  test('absent values read as no capacity and no move; the name is trimmed', () => {
    const { generic } = run([ship('fighter', 'fighter', { name: 'Fighter ', capacityValue: undefined, moveValue: undefined, cost: 0.5 })]);
    expect(generic.fighter?.one).toEqual({ id: 'fighter', name: 'Fighter', cost: 0.5, capacity: 0, combat: 7, dice: 1, move: null });
  });

  test('properties are read as numbers; a ship without them has none', () => {
    const { generic } = run([
      ship('dreadnought', 'dreadnought', { sustainDamage: true, bombardHitsOn: 5, bombardDieCount: 1 }),
      ship('destroyer', 'destroyer', { afbHitsOn: 9, afbDieCount: 2 }),
      ship('cruiser', 'cruiser', { spaceCannonHitsOn: 6, spaceCannonDieCount: 1 }),
      ship('carrier', 'carrier'),
    ]);
    expect(generic.dreadnought?.one).toMatchObject({ sustain: true, bombard: { hit: 5, dice: 1 } });
    expect(generic.destroyer?.one.barrage).toEqual({ hit: 9, dice: 2 });
    expect(generic.cruiser?.one.cannon).toEqual({ hit: 6, dice: 1 });
    expect(Object.keys(generic.carrier?.one ?? {}).sort()).toEqual(['capacity', 'combat', 'cost', 'dice', 'id', 'move', 'name']);
  });

  test('a faction entry goes to that faction only', () => {
    const { generic, factions } = run([
      ship('alpha_carrier', 'carrier', { faction: 'alpha', capacityValue: 3 }),
      ship('alpha_carrier2', 'carrier', { faction: 'alpha', upgradesFromUnitId: 'alpha_carrier', capacityValue: 5 }),
    ]);
    expect(factions.alpha.carrier?.one.capacity).toBe(3);
    expect(factions.alpha.carrier?.two?.capacity).toBe(5);
    expect(generic.carrier).toBeUndefined();
  });

  test('homebrew, nowarsun, cavalry, other sources and non-ships are left out and counted', () => {
    const { generic, factions, excluded } = run([
      ship('nowarsun', 'warsun'), ship('cavalry1', 'flagship', { source: 'pok' }),
      ship('home_carrier', 'carrier', { faction: 'alpha', homebrewReplacesID: 'x' }),
      ship('absol_x', 'destroyer', { faction: 'stranger', source: 'absol' }),
      ship('alpha_mech', 'mech', { faction: 'alpha' }),
    ]);
    expect(generic.warsun).toBeUndefined();
    expect(generic.flagship).toBeUndefined();
    expect(factions.alpha.carrier).toBeUndefined();
    expect(factions.alpha.destroyer).toBeUndefined();
    expect(excluded).toEqual({ homebrew: 1, nowarsun: 1, cavalry: 1, otherSource: 1, thirdLevel: 0 });
  });

  test('a faction name that is no pack faction fails the build, upper case included', () => {
    expect(() => run([ship('x', 'carrier', { faction: 'stranger' })])).toThrow(/stranger/);
    expect(() => run([ship('x', 'carrier', { faction: 'Alpha' })])).toThrow(/Alpha/);
  });

  test('the one Keleres flagship belongs to all three Keleres factions', () => {
    const { factions } = run([]);
    for (const id of ['keleresa', 'keleresm', 'keleresx']) expect(factions[id].flagship?.one.name).toBe('keleres_flagship');
  });

  test('a faction with no flagship fails the build', () => {
    expect(() => selectShips([keleres], ids)).toThrow(/alpha/);
  });

  test('a third level named in the exclusions stays out; an unknown one fails the build', () => {
    const corsair = ship('mentak_cruiser3', 'cruiser', { faction: 'alpha', source: 'thunders_edge', upgradesFromUnitId: 'cruiser2' });
    const { factions, excluded } = run([corsair]);
    expect(factions.alpha.cruiser).toBeUndefined();
    expect(excluded.thirdLevel).toBe(1);
    expect(() => run([{ ...corsair, id: 'other_cruiser3' }])).toThrow(/other_cruiser3/);
  });

  test('a level II without its level I fails the build', () => {
    expect(() => run([ship('c2', 'carrier', { upgradesFromUnitId: 'carrier' })])).toThrow(/c2/);
  });
});
