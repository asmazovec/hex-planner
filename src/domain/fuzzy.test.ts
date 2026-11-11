import { describe, expect, test } from 'vitest';
import { buildIndex, search, type SearchItem } from './fuzzy';

const ITEMS: SearchItem[] = [
  { id: 'tech:gravity_drive', name: 'Gravity Drive', text: 'After you activate a system, apply +1 to the move value of 1 of your ships during this tactical action.' },
  { id: 'action:sabotage', name: 'Sabotage', text: 'When another player plays an action card other than "Sabotage": Cancel that action card.' },
  { id: 'explore:gravity_rift_probe', name: 'Derelict Vessel', text: 'A ship pulled apart by the gravity of a rift. Gain 1 secret objective.' },
  { id: 'tech:antimass', name: 'Antimass Deflectors', text: 'Your ships can move into and through asteroid fields.' },
  { id: 'tech:sarween', name: 'Sarween Tools', text: 'When 1 or more of your units use PRODUCTION, reduce the combined cost of the produced units by 1.' },
  { id: 'action:direct_hit', name: 'Direct Hit', text: 'After another player\'s ship uses SUSTAIN DAMAGE to cancel a hit produced by your units: Destroy that ship.' },
  { id: 'unit:destroyer', name: 'Destroyer', text: 'ANTI-FIGHTER BARRAGE 9 (x2). A small escort ship.' },
  { id: 'agenda:mutiny', name: 'Mutiny', text: 'For: each player who voted "For" gains 1 victory point. Against: they lose 1.' },
];

const index = buildIndex(ITEMS);
const ids = (query: string, limit?: number) => search(index, query, limit).map(hit => hit.id);

describe('fuzzy search', () => {
  test('prefix of a word of the name ranks first', () => {
    expect(ids('grav')).toEqual(['tech:gravity_drive', 'explore:gravity_rift_probe']);
    // Not only the first word of the name.
    expect(ids('defl')[0]).toBe('tech:antimass');
  });

  test('one typo per four letters is forgiven', () => {
    expect(ids('sabotge')[0]).toBe('action:sabotage');
    expect(ids('sabotagr')[0]).toBe('action:sabotage');
    expect(ids('sbtg')).toEqual([]);
    // Three letters leave no room for a typo.
    expect(ids('sxb')).toEqual([]);
    // Eight letters allow two.
    expect(ids('antymasz')[0]).toBe('tech:antimass');
  });

  test('a typo does not make the result flicker while typing', () => {
    const prefixes = (word: string) => Array.from({ length: word.length - 2 }, (_, i) => word.slice(0, i + 3));
    expect(prefixes('sabotge')).toEqual(['sab', 'sabo', 'sabot', 'sabotg', 'sabotge']);
    for (const typed of prefixes('sabotge')) expect(ids(typed), typed).toContain('action:sabotage');
    for (const typed of prefixes('gravty')) expect(ids(typed), typed).toContain('tech:gravity_drive');
    // A typo at the start of a word weighs less than an exact start.
    const exact = search(index, 'sabot').find(hit => hit.id === 'action:sabotage')!;
    const typo = search(index, 'sabotg').find(hit => hit.id === 'action:sabotage')!;
    expect(typo.score).toBeLessThan(exact.score);
  });

  test('two neighbouring letters swapped are one typo', () => {
    expect(ids('gravtiy')[0]).toBe('tech:gravity_drive');
    expect(ids('sabotaeg')[0]).toBe('action:sabotage');
    expect(ids('garv')[0]).toBe('tech:gravity_drive');
  });

  test('words in any order', () => {
    expect(ids('drive gravity')).toEqual(['tech:gravity_drive']);
    expect(ids('gravity drive')).toEqual(['tech:gravity_drive']);
    // Every word has to match.
    expect(ids('gravity sabotage')).toEqual([]);
  });

  test('wrong layout', () => {
    expect(ids('пкфмшен')[0]).toBe('tech:gravity_drive');
    expect(ids('вкшму пкфм')).toEqual(['tech:gravity_drive']);
    expect(ids('ПКФМШЕН')[0]).toBe('tech:gravity_drive');
    // And the other way round, for names in Russian.
    const russian = buildIndex([{ id: 'x', name: 'Саботаж', text: '' }]);
    expect(search(russian, 'cf,jnf;').map(hit => hit.id)).toEqual(['x']);
  });

  test('name outranks text; text still matches', () => {
    // "ship" is in the text of several items and in no name.
    expect(ids('asteroid')).toEqual(['tech:antimass']);
    expect(ids('ships').length).toBeGreaterThan(0);
    // "destroy" starts the name of one and stands in the text of another.
    expect(ids('destroy')).toEqual(['unit:destroyer', 'action:direct_hit']);
    const [inName, inText] = search(index, 'destroy');
    expect(inName.score).toBeGreaterThan(inText.score);
    // The start of a word weighs more than its middle, in the name and in the text.
    const starts = buildIndex([
      { id: 'mid-name', name: 'Antimass', text: '' },
      { id: 'start-name', name: 'Mass Driver', text: '' },
      { id: 'mid-text', name: 'B', text: 'biomass' },
      { id: 'start-text', name: 'C', text: 'a mass of ships' },
    ]);
    expect(search(starts, 'mass').map(hit => hit.id)).toEqual(['start-name', 'mid-name', 'start-text', 'mid-text']);
  });

  test('empty, spaces, one letter', () => {
    expect(search(index, '')).toEqual([]);
    expect(search(index, '   ')).toEqual([]);
    expect(search(index, ' ,.! ')).toEqual([]);
    // One letter: starts of words only, names first.
    const names = ['Mutiny', 'Xxcha', 'Hacan'];
    const letters = buildIndex([
      ...names.map(name => ({ id: name, name, text: '' })),
      { id: 'text', name: 'Other', text: 'a map of the galaxy' },
    ]);
    expect(search(letters, 'm').map(hit => hit.id)).toEqual(['Mutiny', 'text']);
    expect(search(letters, 'x').map(hit => hit.id)).toEqual(['Xxcha']);
    // Padding and punctuation around a query change nothing.
    expect(ids('  grav!  ')).toEqual(ids('grav'));
  });

  test('limit caps the result; order is stable for equal scores (by name)', () => {
    const same = buildIndex([
      { id: '3', name: 'War Sun', text: '' },
      { id: '1', name: 'Warfare', text: '' },
      { id: '2', name: 'War Machine', text: '' },
      { id: '4', name: 'Dreadnought', text: 'A warship.' },
    ]);
    const all = search(same, 'war');
    expect(all.map(hit => hit.id)).toEqual(['2', '3', '1', '4']);
    // The whole word «war» is above «warfare», which only starts with it.
    expect(new Set(all.slice(0, 2).map(hit => hit.score)).size).toBe(1);
    expect(all[2].score).toBeLessThan(all[1].score);
    expect(search(same, 'war', 2).map(hit => hit.id)).toEqual(['2', '3']);
    expect(search(same, 'war', 0)).toEqual([]);
  });

  test('a thousand items answer fifty queries in under 200 ms', () => {
    const WORDS = [
      'gravity', 'drive', 'sabotage', 'fleet', 'logistics', 'neural', 'motivator', 'plasma', 'scoring', 'magen',
      'defense', 'grid', 'duranium', 'armor', 'assault', 'cannon', 'graviton', 'laser', 'system', 'transit',
      'diodes', 'integrated', 'economy', 'light', 'wave', 'deflector', 'hyper', 'metabolism', 'psychoarchaeology',
      'bio', 'stims', 'dacxive', 'animators', 'sling', 'relay', 'predictive', 'intelligence', 'self', 'assembly',
      'routines', 'scanlink', 'drone', 'network', 'dark', 'energy', 'tap', 'sarween', 'tools', 'antimass', 'ship',
      'planet', 'exhaust', 'ready', 'produce', 'units', 'combat', 'round', 'tactical', 'action', 'command', 'token',
    ];
    let seed = 7;
    const next = (n: number) => (seed = (seed * 1103515245 + 12345) % 2147483648) % n;
    const phrase = (count: number) => Array.from({ length: count }, () => WORDS[next(WORDS.length)]).join(' ');
    const items: SearchItem[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `item:${i}`,
      name: `${phrase(1 + next(3))} ${i}`,
      // 100 to 400 characters, as the printed texts are.
      text: `${phrase(15 + next(40))}.`,
    }));
    const big = buildIndex(items);
    const queries = [
      'g', 'gr', 'gra', 'grav', 'gravi', 'gravit', 'gravity', 'gravity d', 'gravity dr', 'gravity drive',
      'drive gravity', 'sabotge', 'sabotage', 'sbtg', 'пкфмшен', 'вкшму пкфм', 'ыфищефпу', 'antymasz', 'psychoarcheology',
      'neural motivator', 'motivator neural 12', 'ship', 'ships planet', 'tactical action', 'comand token',
      'zzzzzz', 'qwertyuiop', 'a', 's', 't', 'predictive intelligence', 'predictve inteligence', 'self assembly routines',
      'light wave deflector', 'lite wave', 'dark energy tap', 'енергия', 'magen defense grid', 'magen defnse grd',
      'x', '999', 'item', 'exhaust ready produce units', 'combat round', 'system transit diodes', 'bio stims',
      'dacxive animators', 'sling relay', 'scanlink drone network', 'integrated economy',
    ];
    expect(queries).toHaveLength(50);
    expect(search(big, 'gravity').length).toBeGreaterThan(0);
    const started = performance.now();
    for (const query of queries) search(big, query, 30);
    expect(performance.now() - started).toBeLessThan(200);
  });
});
