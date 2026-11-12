import { describe, expect, test } from 'vitest';
import type { DataPack, Entry, TechType } from '../../../types';
import { bench, componentAction, effect, endOf, quote } from '../kit';
import { id } from './bookoflatvinia';

/** The four planets of the test board, given one technology specialty each, or only three of them. */
const specialties = (types: TechType[]) => (pack: DataPack) => {
  ['h1', 'h2', 't1', 't2'].forEach((planet, n) => { if (types[n]) pack.planets[planet] = { ...pack.planets[planet], tech: [types[n]] }; });
};
const ALL: TechType[] = ['propulsion', 'biotic', 'cybernetic', 'warfare'];
const table = (entries: Entry[], types: TechType[]) => bench({
  faction: 'sol', expansions: ['pok'], start: { relics: [id] }, entries, edit: specialties(types),
  game: { planetControl: { h1: 'me', h2: 'me', t1: 'me', t2: 'me' } },
});

describe('relic:bookoflatvinia Book of Latvinia', () => {
  // "ACTION: Purge this card; if you control planets that have all 4 types of technology specialties, gain 1 victory
  //  point."
  // Checks: controlling planets of all four specialties, the action gives 1 victory point and purges the relic.
  // Why it is counted here: a play of the component action; the planets controlled and the points are the board's.
  test('relic:bookoflatvinia gives 1 victory point with all four specialties controlled', () => {
    const book = table([componentAction(id)], ALL);
    quote(book.pack, id, 'if you control planets that have all 4 types of technology specialties, gain 1 victory point');
    const end = endOf(book);
    expect(end.vp).toBe(1);
    expect(end.holdings.relics).not.toContain(id);
  });

  // "Otherwise, gain the speaker token."
  // Checks: with three specialties only, no point is gained; the relic is purged all the same (Book of Latvinia note 4).
  // Why the check is NOT redundant here: the point needs all four types.
  test('relic:bookoflatvinia with three specialties gives no point and is still purged', () => {
    const end = endOf(table([componentAction(id)], ALL.slice(0, 3)));
    expect(end.vp).toBe(0);
    expect(end.holdings.relics).not.toContain(id);
  });

  test.todo('relic:bookoflatvinia "gain the speaker token": the plan does not keep the speaker');
  test.todo('relic:bookoflatvinia "research up to 2 technologies that have no prerequisites": entered as gains, which no rule of the plan checks');

  test('relic:bookoflatvinia is a play effect', () => {
    expect(effect(table([], []).pack, id).tier).toBe('play');
  });
});
