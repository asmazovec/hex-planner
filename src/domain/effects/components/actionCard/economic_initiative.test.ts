import { describe, expect, test } from 'vitest';
import type { DataPack, Entry } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, FAR, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './economic_initiative';

/** h1 is cultural, h2 has no trait; I control both. */
const cultural = (pack: DataPack) => { pack.planets.h1 = { ...pack.planets.h1, traits: ['cultural'] }; };
const spend = (...planets: string[]) => tactical(NEAR, { payment: { planets, tradeGoods: 0 } });
const payAgain = (planet: string) => tactical(TARGET, { payment: { planets: [planet], tradeGoods: 0 } });
const table = (entries: Entry[], hand: string[] = [id]) => bench({ faction: 'sol', start: { hand }, entries, edit: cultural });

describe('actionCard:economic_initiative Economic Initiative', () => {
  // "Ready each cultural planet you control."
  // Checks: h1, exhausted by a payment, is readied by the card and pays again later in the round without warning.
  // Why the check is redundant here: the exhausted planet check (34.4) asks whether the planet is exhausted; the card
  // readies it, so it is not: nothing is listed, the planet really is ready.
  test('actionCard:economic_initiative readies the cultural planet: it pays again without warning', () => {
    const again = payAgain('h1');
    const table1 = table([spend('h1', 'h2'), componentAction(id), again]);
    quote(table1.pack, id, 'Ready each cultural planet you control.');
    expectNone(warningsOf(table1, again), 'planetExhausted');
  });

  // "Ready each cultural planet you control."
  // Checks: at the end of the plan h1 is ready and h2, which has no cultural trait, stays exhausted.
  // Why nothing is waived: the card readies, it lifts nothing; the board itself changes.
  test('actionCard:economic_initiative leaves the board with the cultural planet ready', () => {
    expect(endOf(table([spend('h1', 'h2'), componentAction(id)])).exhausted).toEqual(['h2']);
  });

  // "Ready each cultural planet ..."
  // Checks: h2, not cultural, is still exhausted after the card and is warned of when it pays again.
  // Why the check is NOT redundant here: the card readies cultural planets only.
  test('actionCard:economic_initiative does not ready a planet that is not cultural', () => {
    const again = payAgain('h2');
    expectStanding(warningsOf(table([spend('h1', 'h2'), componentAction(id), again]), again), 'planetExhausted');
  });

  // LRR 34.4: an exhausted planet cannot be spent until it is readied.
  // Checks: without the card the cultural planet paying twice is warned of.
  // Why the check is NOT redundant here: nothing readied it.
  test('actionCard:economic_initiative not played, the cultural planet paying twice is warned of', () => {
    const again = payAgain('h1');
    expectStanding(warningsOf(table([spend('h1'), again]), again), 'planetExhausted');
  });

  // "Ready each cultural planet you control."
  // Checks: a planet exhausted after the card was played is not readied by it.
  // Why the check is NOT redundant here: the card readies what is exhausted when it is resolved, once.
  test('actionCard:economic_initiative does not ready a planet spent after it', () => {
    const again = tactical(FAR, { payment: { planets: ['h1'], tradeGoods: 0 } });
    expectStanding(warningsOf(table([componentAction(id), spend('h1'), again]), again), 'planetExhausted');
  });

  test('actionCard:economic_initiative is a play effect', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
  });
});
