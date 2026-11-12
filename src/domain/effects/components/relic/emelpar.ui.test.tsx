import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, shown, showUses, showWarnings, uiBench, use } from '../../../../ui/testing/effects';
import type { Entry } from '../../../types';
import { adjust, bench, quote, secondary } from '../kit';
import { id } from './emelpar';

uiBench();

/** The strategy pool is emptied first; then the secondary of Technology (7) asks a token of it. */
const table = (play: Entry) => bench({ faction: 'sol', expansions: ['pok'], start: { relics: [id] }, entries: [adjust({ strategy: -2 }), play] });

// "When you would spend a token from your strategy pool, you may exhaust this card to spend a token from your
//  reinforcements instead."
// Checks: with an empty strategy pool I choose the Scepter in «Used» of the secondary; it is named in the entry, and no
// standing warning says the strategy pool is short.
// Why the check is redundant here: the token comes from the reinforcements, so the pool is not asked (20.5 otherwise).
test.fails('relic:emelpar chosen in «Used», the secondary no longer runs the strategy pool short', async () => {
  const play = secondary(7);
  const scepter = table(play);
  quote(scepter.pack, id, 'you may exhaust this card to spend a token from your reinforcements instead');
  const live = showUses(scepter, play);
  expectShownStanding('shortStrategy');
  await use('Scepter of Emelpar');
  expect(live.entry().uses).toEqual([id]);
  expect(shown('shortStrategy').filter(item => !item.className.includes('warning-waived'))).toEqual([]);
});

// LRR 20.5: a secondary is paid "by spending a command token from their strategy pool".
// Checks: the Scepter held but not chosen, the empty pool is warned of.
// Why the check is NOT redundant here: the relic was not used.
test('relic:emelpar not used, the empty strategy pool is warned of', () => {
  const play = secondary(7);
  showWarnings(table(play), play);
  expectShownStanding('shortStrategy');
  expectNotShown('componentExhausted');
});
