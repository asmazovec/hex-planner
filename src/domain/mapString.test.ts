import { expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { arrangeSet, parseMapString, ringSlots } from './mapString';
import { seatSlots } from './mapBuilder';

const pok = loadPack(['pok']);
const full = loadPack(['pok', 'te']);
const base = loadPack([]);
/** What a caller passes to tell a tile of a switched-off expansion from a truly unknown one. */
const OTHERS = { pok: loadPack(['pok']), te: loadPack(['te']) };
/** Screen direction of an axial slot on the flat-topped grid, in hex units, y pointing down. */
const slotDirection = (q: number, r: number) => ({ x: 1.5 * q, y: Math.sqrt(3) * (q / 2 + r) });

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
    const { x, y } = slotDirection(q, r);
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
  expect(parseMapString(tokens, 5, pok).map).toEqual({});
});

test('a six-player string with tiles in the fourth ring is read against the Large Galaxy, one without against three rings', () => {
  const tokens = Array.from({ length: 60 }, (_, i) => (i === 59 ? '25' : i === 0 ? '26' : '0')).join(' ');
  const large = parseMapString(tokens, 6, pok);
  expect(large.layout).toBe('large');
  expect(large.map).toEqual({ '0,-1': '26', '-1,-3': '25' });
  expect(parseMapString('26', 6, pok).layout).toBe('standard');
});

test('a system tile on a slot where the template fixes a hyperlane is dropped, the lane stays', () => {
  // An old seven-player string of four full rings: 0,4 is the 85A of the rulebook formation.
  const result = parseMapString(milty({ '0,4': '25', '1,0': '26', '4,-4': '27', '2,2': '28' }), 7, pok);
  expect(result.layout).toBe('hyperlanes');
  expect(result.map).toEqual({ '1,0': '26', '4,-4': '27', '2,2': '28' });
  expect(result.dropped).toBe(1);
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
const LANES_4 = {
  '-2,-1': '83A0', '-1,-1': '87A2', '2,-1': '87A1', '3,-1': '83A2', '-3,0': '85A2', '-1,0': '85A2',
  '1,0': '85A5', '3,0': '85A5', '-3,1': '83A2', '-2,1': '87A4', '1,1': '87A5', '2,1': '83A0',
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

test('Milty MAP_7 and MAP_8 hyperlanes are the alternate hyperlanes of the rulebook and choose that layout', () => {
  for (const [players, lanes] of [[7, LANES_7], [8, LANES_8]] as const) {
    const result = parseMapString(milty(lanes), players, pok);
    expect(result.layout).toBe('alternate');
    expect(Object.keys(result.map).sort()).toEqual(Object.keys(lanes).sort());
    expect(result.dropped).toBe(0);
    expect(result.unknown).toEqual([]);
  }
});

test('tiles outside the template are counted as dropped', () => {
  // The 28-slot three-player template has no slot at 3,-3.
  const result = parseMapString(milty({ '1,-2': '30', '3,-3': '31' }), 3, pok);
  expect(result.layout).toBe('standard');
  expect(result.dropped).toBe(1);
  expect(result.map).toEqual({ '1,-2': '30' });
});

test.each([
  [3, LANES_3, 33],
  [4, LANES_4, 32],
])('a Milty string of %i players with hyperlanes selects the hyperlane layout and drops nothing', (players, lanes, expected) => {
  const result = parseMapString(milty(lanes), players, pok);
  expect(result.layout).toBe('hyperlanes');
  expect(result.dropped).toBe(0);
  expect(result.unknown).toEqual([]);
  expect(result.found).toBe(Object.keys(lanes).length);
  expect(result.expected).toBe(expected);
  expect(Object.keys(result.map).sort()).toEqual(Object.keys(lanes).sort());
});

test('a five-player string with hyperlanes selects the hyperlane layout, one without selects the standard one', () => {
  expect(parseMapString(milty(LANES_5), 5, pok)).toMatchObject({ layout: 'hyperlanes', expected: 31 });
  const plain = parseMapString(milty({ '0,-1': '25' }), 5, pok);
  expect(plain.layout).toBe('standard');
  expect(plain.expected).toBe(31);
});

test('a string with hyperlanes falls back to the standard template when the pack has no hyperlane layout', () => {
  const result = parseMapString(milty(LANES_4), 4, loadPack([]));
  expect(result.layout).toBe('standard');
});

test('the hyperlane layouts of 3 and 4 players hold exactly the Milty positions as fixed tiles', () => {
  for (const [players, lanes] of [[3, LANES_3], [4, LANES_4]] as const) {
    const fixed = Object.fromEntries(
      pok.templates.find(t => t.playerCount === players && t.layout === 'hyperlanes')!.slots
        .filter(slot => slot.fixed && slot.fixed !== '18').map(slot => [`${slot.q},${slot.r}`, slot.fixed]),
    );
    expect(fixed).toEqual(Object.fromEntries(Object.entries(lanes).map(([key, token]) => [key, token.replace(/(\d)$/, '@$1')])));
  }
});

test('expected counts only the homes the template has, even when a home list names a slot it lacks', () => {
  const template = pok.templates.find(t => t.playerCount === 6)!;
  const odd = { ...pok, templates: [{ ...template, homes: [...template.homes!.slice(0, 5), '9,9'] }] };
  expect(parseMapString('', 6, odd).expected).toBe(37 - 1 - 5);
});

test('unknown tokens are not counted as dropped', () => {
  expect(parseMapString(milty({ '4,-4': '999' }), 6, pok)).toMatchObject({ dropped: 0, unknown: ['999'] });
});

test('the token count is reported; a plain 18 is not counted, so it cannot shift the ring', () => {
  expect(parseMapString(MILTY_6P, 6, full).tokens).toBe(60);
  expect(parseMapString(`18 ${MILTY_6P}`, 6, full).tokens).toBe(60);
  expect(parseMapString(`18 ${MILTY_6P}`, 6, full).map).toEqual(parseMapString(MILTY_6P, 6, full).map);
  expect(parseMapString('{18} 25', 6, pok).tokens).toBe(1);
});

/** The sorted set of the 37 tiles of a six-player game that the user pasted: no positions. */
const SET_6P = '4, 12, 14, 16, 18, 19, 22, 24, 28, 30, 33, 34, 37, 41, 44, 46, 48, 49, 55, 58, 61, 63, 66, 68, 71, 72, 74, 76, 78, 79, 80, 102, 106, 110, 113, 115, 117';
const TE_TILES = ['102', '106', '110', '113', '115', '117'];
const POK_TILES = ['55', '58', '61', '63', '66', '68', '71', '72', '74', '76', '78', '79', '80'];

/** The user's picture of their Milty map: rings 1 to 3 from the top clockwise, 36 tokens. */
const MILTY_36 = '66 22 61 19 72 24 110 79 48 106 117 33 41 71 28 44 46 30 58 63 115 55 76 49 16 74 78 14 37 68 12 102 80 4 34 113';

test('a tile of an expansion that is off is reported apart from an unknown one', () => {
  const none = parseMapString(`${SET_6P}, 999`, 6, base, OTHERS);
  expect(none.offExpansion).toEqual({ pok: POK_TILES, te: TE_TILES });
  expect(none.unknown).toEqual(['999']);
  const withPok = parseMapString(SET_6P, 6, pok, OTHERS);
  expect(withPok.offExpansion).toEqual({ te: TE_TILES });
  expect(withPok.unknown).toEqual([]);
  const all = parseMapString(SET_6P, 6, full, OTHERS);
  expect(all.offExpansion).toEqual({});
  expect(all.unknown).toEqual([]);
});

test('a plain 18 is skipped like a braced one and is not counted; so is a Mecatol 112', () => {
  expect(parseMapString('18 25 26', 6, pok, OTHERS)).toMatchObject({ map: { '0,-1': '25', '1,-1': '26' }, tokens: 2 });
  expect(parseMapString('25 18 26', 6, pok, OTHERS)).toMatchObject({ map: { '0,-1': '25', '1,-1': '26' }, tokens: 2 });
  const withTe = parseMapString('112 25', 6, full, OTHERS);
  expect(withTe).toMatchObject({ map: { '0,-1': '25' }, tokens: 1, offExpansion: {} });
  expect(parseMapString('112 25', 6, pok, OTHERS)).toMatchObject({ map: { '0,-1': '25' }, tokens: 1, offExpansion: {} });
});

test('ascending tiles without positions are a set, a real draft string is not', () => {
  expect(parseMapString(SET_6P, 6, full, OTHERS).kind).toBe('set');
  expect(parseMapString(SET_6P.replace(/, /g, ' 0 '), 6, full, OTHERS).kind).toBe('set');
  expect(parseMapString(MILTY_6P, 6, full, OTHERS).kind).toBe('map');
  expect(parseMapString(MILTY_36, 6, full, OTHERS).kind).toBe('map');
  expect(parseMapString('25 26 27 28 29 30 31 32 33', 6, full, OTHERS).kind).toBe('map'); // fewer than 10
  expect(parseMapString('25 26 27 28 29 30 31 32 33 33', 6, full, OTHERS).kind).toBe('map'); // not strictly ascending
});

test('no ring-ordered string of a real draft is ascending across 10 tokens', () => {
  // Milty deals tiles from shuffled stacks; every pinned string of this file is far from sorted.
  for (const text of [MILTY_6P, MILTY_36]) {
    const numbers = text.split(' ').map(Number).filter(n => n > 0);
    expect(numbers.every((n, i) => i === 0 || n > numbers[i - 1])).toBe(false);
  }
});

test('a set with every expansion on is arranged: homes by seat, the rest in ring order, Mecatol in the centre', () => {
  const set = parseMapString(SET_6P, 6, full, OTHERS);
  expect(set.map).toEqual({});
  const placed = arrangeSet(set.set, 6, full);
  expect(placed).toMatchObject({ kind: 'map', found: 30, homes: 6, dropped: 0, unknown: [], expected: 30 });
  expect(placed.map['0,0']).toBe('112');
  const seats = seatSlots(6, full, placed.layout);
  expect(seats.map(key => placed.map[key])).toEqual(['4', '12', '14', '16', '55', '58']);
  const rest = Object.entries(placed.map).filter(([key]) => key !== '0,0' && !seats.includes(key));
  expect(rest).toHaveLength(30);
  const order = [1, 2, 3, 4].flatMap(ringSlots);
  const placedOrder = order.filter(key => key in placed.map && !seats.includes(key));
  expect(placedOrder.map(key => placed.map[key]).slice(0, 4)).toEqual(['19', '22', '24', '28']);
  expect(new Set(Object.values(placed.map)).size).toBe(37);
});

test('a set with the base game only places what the pack knows and keeps the rest out', () => {
  const set = parseMapString(SET_6P, 6, base, OTHERS);
  const placed = arrangeSet(set.set, 6, base);
  expect(placed.map['0,0']).toBe('18');
  expect(placed.homes).toBe(4);
  expect(placed.found).toBe(13);
});

test('a six-player string of rings 1 to 3 is complete at 36 tokens and so is the 60-token form', () => {
  const result = parseMapString(MILTY_36, 6, full, OTHERS);
  expect(result).toMatchObject({ tokens: 36, tokensComplete: true, found: 30, homes: 6, expected: 30, dropped: 0, unknown: [] });
  const seats = seatSlots(6, full, result.layout);
  expect(seats.map(key => result.map[key])).toEqual(['58', '55', '16', '14', '12', '4']);
  expect(parseMapString(MILTY_6P, 6, full, OTHERS).tokensComplete).toBe(true);
  expect(parseMapString(`18 ${MILTY_36}`, 6, full, OTHERS)).toMatchObject({ tokens: 36, tokensComplete: true });
  expect(parseMapString('25 26 27', 6, full, OTHERS).tokensComplete).toBe(false);
  expect(parseMapString(`${MILTY_36} 25`, 6, full, OTHERS).tokensComplete).toBe(false);
});

test('a double-sided home written by its printed number is read as its first side (firmament: 96 placed nothing)', () => {
  const tokens = Array.from({ length: 60 }, (_, i) => (i === 18 ? '96' : '0'));
  const result = parseMapString(tokens.join(' '), 6, full, OTHERS);
  expect(result.map['0,-3']).toBe('96A');
  expect(result.unknown).toEqual([]);
});
