import { expect, test } from 'vitest';
import { checkCounts, normalizeTileId, parseStartingFleet, positionToAxial } from './build-data';

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
