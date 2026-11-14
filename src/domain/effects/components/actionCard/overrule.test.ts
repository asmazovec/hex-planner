import { describe, expect, test } from 'vitest';
import { isWaived } from '../../../rules/registry';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, effect, endOf, expectStanding, expectWaived, primary, quote, using, warningsOf, type Bench } from '../kit';
import { id } from './overrule';

/** My card this round is Leadership (1); Trade (5) is another player's or unchosen. */
const MINE = 1;
const OTHER = 5;

/** Six players, my card of the round chosen, Overrule in hand. */
function table(entries: Entry[], hand = [id]): Bench {
  const game = bench({ faction: 'sol', expansions: ['te'], start: { hand }, entries });
  game.game.plans[0].rounds[0].strategyCard = MINE;
  return game;
}
const standingOf = (warnings: ReturnType<typeof warningsOf>, code: string) => warnings.filter(w => w.code === code && !isWaived(w));

describe('actionCard:overrule Overrule', () => {
  // "Perform the primary ability of a readied or unchosen strategy card."
  // Checks: the primary of a card I do not hold, entered with Overrule in `uses`, is listed as a primary of another's
  // card and lifted by the action card.
  // Why the check is redundant here: LRR 82 and 83.3 let only the holder resolve a card's primary; Overrule lets me perform
  // the primary of a card I do not hold, by its own words.
  test('actionCard:overrule lifts the check of a primary of a card not mine', () => {
    const play = using(primary(OTHER), id);
    const overrule = table([play]);
    quote(overrule.pack, id, 'Perform the primary ability of a readied or unchosen strategy card.');
    expectWaived(warningsOf(overrule, play), 'foreignPrimary', id);
  });

  // Checks: that primary spends no strategy token: the pool keeps its two tokens.
  // Why the check is redundant here: a primary of another's card costs a token only where an ability lets it be
  // resolved for one; Overrule performs it as the effect of the action card, which names no token.
  test('actionCard:overrule spends no strategy token for the primary', () => {
    const play = using(primary(OTHER), id);
    const overrule = table([play]);
    expect(standingOf(warningsOf(overrule, play), 'shortStrategy')).toEqual([]);
    expect(endOf(overrule).strategy).toBe(2);
  });

  // LRR 82 (Strategic Action): "During the action phase, the active player may perform a strategic action to resolve
  //  the primary ability on their strategy card."
  // Checks: the same primary without Overrule is warned of and costs a token.
  // Why the check is NOT redundant here: without the card nothing lets me resolve another's primary.
  test('actionCard:overrule not played, the primary of a card not mine stands as a breach', () => {
    const play = primary(OTHER);
    const plain = table([play]);
    expectStanding(warningsOf(plain, play), 'foreignPrimary');
    expect(endOf(plain).strategy).toBe(1);
  });

  // Checks: the card lifts the check for the entry that plays it only; a second primary of another's card in the same
  // round is warned of.
  // Why the check is NOT redundant here: one Overrule performs one primary; the card is discarded when played (2.7).
  test('actionCard:overrule covers the entry that plays it, not a later primary of the round', () => {
    const later = primary(OTHER);
    expectStanding(warningsOf(table([using(primary(OTHER), id), later]), later), 'foreignPrimary');
  });

  // LRR 2.7: an action card played is discarded.
  // Checks: Overrule leaves the hand when its entry plays it; one not in hand is warned of.
  // Why the check is NOT redundant here: only a card held can be played.
  test('actionCard:overrule is discarded when played, and one not in hand is warned of', () => {
    const play = using(primary(OTHER), id);
    expect(endOf(table([play])).holdings.hand).not.toContain(id);
    expectStanding(warningsOf(table([play], []), play), 'componentNotHeld');
  });

  test.todo('actionCard:overrule "a readied or unchosen strategy card": the plan does not know which cards of the other players are exhausted');

  test('actionCard:overrule is a play effect that waives a primary of another player\'s card', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).permit?.map(w => [w.code, w.lasts])).toEqual([['foreignPrimary', undefined]]);
  });
});
