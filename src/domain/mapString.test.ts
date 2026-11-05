import { expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { hexToPixel } from '../ui/map/geometry';
import { parseMapString, ringSlots } from './mapString';

const pok = loadPack(['pok']);
const full = loadPack(['pok', 'te']);

/**
 * Output of the Milty Draft algorithm (js/generate-map.js, `#tts-string`) for the finished six-player draft fixture
 * data/test-drafts/draft.november2025.finished.json of its repository; see docs/data-verification.md.
 */
const MILTY_6P =
  '20 4268 42 39 75 109 64 4262 63 79 28 104 48 32 102 76 29 61 0 49 50 0 98 113 0 4256 24 0 105 77 0 4273 115 0 4274 43 '
  + '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0';

test('ring order starts at the top and runs clockwise, like the map geometry', () => {
  expect(ringSlots(1)).toEqual(['0,-1', '1,-1', '1,0', '0,1', '-1,1', '-1,0']);
  expect(ringSlots(2).slice(0, 4)).toEqual(['0,-2', '1,-2', '2,-2', '2,-1']);
  const bearings = ringSlots(2).map(key => {
    const [q, r] = key.split(',').map(Number);
    const { x, y } = hexToPixel(q, r);
    return (Math.atan2(x, -y) * 180) / Math.PI;
  });
  expect(bearings[0]).toBeCloseTo(0);
  for (let i = 1; i < 6; i += 1) expect(bearings[i]).toBeGreaterThan(bearings[i - 1]);
});

test('a real Milty string puts tiles into the expected ring slots and keeps homes empty', () => {
  const result = parseMapString(MILTY_6P, 6, full);
  expect(result.map['0,-1']).toBe('20');
  expect(result.map['1,-1']).toBeUndefined(); // 4268 is not in the pack
  expect(result.map['1,0']).toBe('42');
  expect(result.map['-1,0']).toBe('109');
  expect(result.map['0,-2']).toBe('64');
  expect(result.map['1,-3']).toBe('49');
  expect(result.map['0,-3']).toBeUndefined(); // home placeholder
  expect(result.unknown).toContain('4268');
  expect(result.expected).toBe(30);
});

test('a hyperlane keeps its side and rotation as id@rotation', () => {
  const result = parseMapString('83A3 0 84B0', 5, pok);
  expect(result.map['0,-1']).toBe('83A@3');
  expect(result.map['1,-1']).toBeUndefined();
  expect(result.map['1,0']).toBe('84B@0');
});

test('an unknown number is reported and the rest is placed', () => {
  const result = parseMapString('25 999 26', 6, pok);
  expect(result.map).toEqual({ '0,-1': '25', '1,0': '26' });
  expect(result.unknown).toEqual(['999']);
  expect(result.found).toBe(2);
});

test('extra spaces, commas and line breaks do not matter', () => {
  const clean = parseMapString('25 26 27', 6, pok);
  expect(parseMapString('  25,26 ,\n27\n', 6, pok)).toEqual(clean);
});

test('a braced centre tile is ignored and does not shift the ring', () => {
  expect(parseMapString('{18} 25', 6, pok).map).toEqual({ '0,-1': '25' });
});

test('empty input places nothing', () => {
  expect(parseMapString('  \n ', 6, pok)).toMatchObject({ map: {}, unknown: [], found: 0 });
});

test('tiles beyond the template are not placed', () => {
  const tokens = Array.from({ length: 60 }, (_, i) => (i === 59 ? '25' : '0')).join(' ');
  expect(parseMapString(tokens, 6, pok).map).toEqual({});
});
