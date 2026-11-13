import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { bench, effect, endOf, expectNone, expectStanding, expectWaived, FAR, HOME, quote, statusTokens, tactical, warningsOf } from '../kit';
import { id } from './thetriad';

/** A carrier (cost 3) built at the home dock, paid with what `planets` names. */
const build = (planets: string[], systemId = HOME): Entry =>
  tactical(systemId, { production: { carrier: 1 }, payment: { planets, tradeGoods: 0 } });
const table = (rounds: Entry[][], relics: string[] = [id]) =>
  bench({ faction: 'sol', expansions: ['te'], start: { relics }, rounds, game: { docks: ['h1'] } });

describe('relic:thetriad The Triad', () => {
  // "This card can be readied and spent as if it were a planet card. Its resource and influence values are equal to 3
  //  plus the number of different types of relic fragments you own."
  // Checks: the Triad alone pays for a carrier (cost 3): the warning that a payment names something that is not a
  // planet I control is listed and lifted by the card, and the payment is worth 3, so nothing is short.
  // Why the check is redundant here: a payment spends planet cards the player controls (34 note 2); the Triad is spent
  // "as if it were a planet card", by its own text.
  test('relic:thetriad pays as a planet card worth 3', () => {
    const carrier = build([id]);
    const triad = table([[carrier]]);
    quote(triad.pack, id, 'This card can be readied and spent as if it were a planet card.');
    const warnings = warningsOf(triad, carrier);
    expectWaived(warnings, 'planetNotControlled', id);
    expectNone(warnings, 'shortResources');
  });

  // "... spent as if it were a planet card."
  // Checks: spending the Triad exhausts it, as paying exhausts a planet card: a second payment in the round is warned of.
  // Why the check is NOT redundant here: a spent planet card is exhausted until it is readied (34.1); the Triad is
  // spent the same way.
  test('relic:thetriad spent twice in a round: the second payment is warned of as exhausted', () => {
    const first = build([id]);
    const second = build([id], FAR);
    const triad = table([[first, second]]);
    expect(endOf(table([[first]])).holdings.exhausted).toContain(id);
    expectStanding(warningsOf(triad, second), 'planetExhausted');
  });

  // "This card can be readied ... as if it were a planet card." LRR 81.6: each player readies their exhausted cards.
  // Checks: spent in round 1, the Triad is ready again in round 2 and pays without a warning of exhaustion.
  // Why the check is redundant here: the status phase readies it with the planets.
  test('relic:thetriad is readied by the status phase and pays again the next round', () => {
    const later = build([id]);
    const triad = table([[build([id]), statusTokens(1, 1, 0)], [later]]);
    const warnings = warningsOf(triad, later);
    expectWaived(warnings, 'planetNotControlled', id);
    expectNone(warnings, 'planetExhausted');
  });

  // LRR 34 note 2: a player spends only planets they control.
  // Checks: without the relic, naming the Triad in a payment is warned of and pays nothing.
  // Why the check is NOT redundant here: the card is not held, so nothing makes it a planet card.
  test('relic:thetriad not held pays nothing and is warned of', () => {
    const carrier = build([id]);
    const warnings = warningsOf(table([[carrier]], []), carrier);
    expectStanding(warnings, 'planetNotControlled');
    expectStanding(warnings, 'shortResources');
  });

  test.todo('relic:thetriad is worth 3 plus each type of relic fragment owned: the replay holds no relic fragments yet');

  test('relic:thetriad is a passive effect that waives the payment check for itself', () => {
    const { pack } = table([[]]);
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).permit?.map(w => w.code)).toEqual(['planetNotControlled']);
  });
});
