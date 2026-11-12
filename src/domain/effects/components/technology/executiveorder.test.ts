import { describe, expect, test } from 'vitest';
import { bench, componentAction, effect, endOf, expectStanding, quote, warningsOf } from '../kit';
import { id } from './executiveorder';

const keleres = (entries: ReturnType<typeof componentAction>[]) =>
  bench({ faction: 'keleresm', expansions: ['pok', 'te'], start: { technologies: [id] }, entries });

describe('technology:executiveorder Executive Order', () => {
  // "ACTION: Exhaust this card and draw the top or bottom card of the Agenda deck. Players immediately vote on this
  //  agenda as if you were the speaker"
  // Checks: the technology is a reminder of the component action's block.
  // Why the check is NOT redundant here: nothing is validated, because the agenda drawn and the vote are not
  // counted; a law it brings is entered by the player as a gain.
  test('technology:executiveorder is a hint at the component action: the vote is not counted', () => {
    const { pack } = keleres([]);
    quote(pack, id, 'draw the top or bottom card of the Agenda deck');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['component']);
  });

  // "ACTION: Exhaust this card" LRR 34.4, 71.4.
  // Checks: the component action exhausts the card, and a second one in the same round is warned of.
  // Why the check is NOT redundant here: an exhausted card is readied only in the status phase; the technology says
  // nothing against it.
  test('technology:executiveorder is exhausted by its action: a second one in the round is warned of', () => {
    const again = componentAction(id);
    const table = keleres([componentAction(id), again]);
    expect(endOf(table).holdings.exhausted).toContain(id);
    expectStanding(warningsOf(table, again), 'componentExhausted');
  });
});
