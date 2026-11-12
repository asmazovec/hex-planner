import { expect, test } from 'vitest';
import { showTurn, uiBench } from '../../../../ui/testing/effects';
import type { DataPack, TechType } from '../../../types';
import { bench, componentAction, endOf, quote } from '../kit';
import { id } from './bookoflatvinia';

uiBench();

const TURN = componentAction(id);

/** The four planets of the test board, given one technology specialty each. */
const ALL: TechType[] = ['propulsion', 'biotic', 'cybernetic', 'warfare'];
const specialties = (pack: DataPack) => {
  ['h1', 'h2', 't1', 't2'].forEach((planet, n) => { pack.planets[planet] = { ...pack.planets[planet], tech: [ALL[n]] }; });
};

// "ACTION: Purge this card; if you control planets that have all 4 types of technology specialties, gain 1 victory
//  point."
// Checks: the component action of the Book is open in the editor, and the plan counts the point and the purge.
// Why it is counted here: a play of the component action; the planets controlled and the points are the board's.
test('relic:bookoflatvinia the action shows in the editor and the plan counts the victory point', () => {
  const book = bench({
    faction: 'sol', expansions: ['pok'], start: { relics: [id] }, entries: [TURN], edit: specialties,
    game: { planetControl: { h1: 'me', h2: 'me', t1: 'me', t2: 'me' } },
  });
  quote(book.pack, id, 'if you control planets that have all 4 types of technology specialties, gain 1 victory point');
  const live = showTurn(book, TURN);
  expect(document.body.textContent).toContain('Book of Latvinia');
  const end = endOf({ pack: book.pack, game: live.game() });
  expect(end.vp).toBe(1);
  expect(end.holdings.relics).not.toContain(id);
});
