import { expect, test } from 'vitest';
import { checkCounts, readPlanetMarks, checkLaneRotations, normalizeTileId, parseHyperlanes, parseStartingFleet, positionToAxial, readStartingTech, readTech } from './build-data';
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
