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

/** A 60-token Milty string with the given tokens at their slots. */
const milty = (tokens: Record<string, string>): string => {
  const slots = [1, 2, 3, 4].flatMap(ringSlots);
  return slots.map(slot => tokens[slot] ?? '0').join(' ');
};

/** Hyperlane positions of Milty's MAP_3, MAP_5, MAP_7 and MAP_8 templates (generate-map.js), as `<id><rotation>`. */
const LANES_3 = {
  '2,-3': '83A1', '3,-3': '85A4', '1,-2': '87A0', '3,-2': '83A2', '-2,-1': '83A0', '-1,-1': '87A2', '1,-1': '85A4',
  '2,-1': '87A4', '-3,0': '85A2', '-1,0': '85A2', '-3,1': '83A2', '-2,1': '87A4', '0,1': '85A0', '1,1': '87A2',
  '-1,2': '87A0', '1,2': '83A0', '-1,3': '83A1', '0,3': '85A0',
};
const LANES_5 = { '0,1': '85A0', '1,1': '87A2', '-1,2': '87A0', '1,2': '83A0', '-1,3': '83A1', '0,3': '85A0' };
const LANES_7 = { '1,-3': '83B0', '0,-1': '83B0', '-3,1': '83B2', '-1,1': '89B0', '0,1': '84B0', '1,2': '84B0' };
const LANES_8 = { '0,-1': '87A1', '1,-1': '89B3', '3,-1': '83B2', '-3,1': '83B2', '-1,1': '89B0', '0,1': '87A4' };

test('a home tile id in a seat slot is placed and does not count towards the expected tiles', () => {
  const result = parseMapString(milty({ '0,-1': '25', '0,-3': '1', '3,-3': '2' }), 6, pok);
  expect(result.map['0,-3']).toBe('1');
  expect(result.map['3,-3']).toBe('2');
  expect(result.homes).toBe(2);
  expect(result.found).toBe(1);
  expect(result.expected).toBe(30);
});

test('placeholders in the home slots leave no home placed', () => {
  expect(parseMapString(milty({ '0,-1': '25' }), 6, pok).homes).toBe(0);
});

test('Milty MAP_5 hyperlanes land on the template slots with their rotation', () => {
  const result = parseMapString(milty(LANES_5), 5, pok);
  expect(result.map).toEqual({
    '0,1': '85A@0', '1,1': '87A@2', '-1,2': '87A@0', '1,2': '83A@0', '-1,3': '83A@1', '0,3': '85A@0',
  });
  expect(result.dropped).toBe(0);
  expect(result.unknown).toEqual([]);
});

test('Milty MAP_7 and MAP_8 hyperlanes fit the 61-slot templates', () => {
  for (const [players, lanes] of [[7, LANES_7], [8, LANES_8]] as const) {
    const result = parseMapString(milty(lanes), players, pok);
    expect(Object.keys(result.map).sort()).toEqual(Object.keys(lanes).sort());
    expect(result.dropped).toBe(0);
    expect(result.unknown).toEqual([]);
  }
});

test('tiles outside the template are counted as dropped', () => {
  const result = parseMapString(milty(LANES_3), 3, pok);
  // Milty's three-player map has nine hyperlane slots the 28-slot template does not have.
  expect(result.dropped).toBe(9);
  expect(Object.keys(result.map)).toHaveLength(9);
  expect(result.map['1,-2']).toBe('87A@0');
});

test('unknown tokens are not counted as dropped', () => {
  expect(parseMapString(milty({ '4,-4': '999' }), 6, pok)).toMatchObject({ dropped: 0, unknown: ['999'] });
});

test('the token count is reported, so an unbraced leading 18 can be noticed', () => {
  expect(parseMapString(MILTY_6P, 6, full).tokens).toBe(60);
  expect(parseMapString(`18 ${MILTY_6P}`, 6, full).tokens).toBe(61);
  expect(parseMapString('{18} 25', 6, pok).tokens).toBe(1);
});
