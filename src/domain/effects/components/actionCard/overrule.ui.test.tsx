import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showUses, showWarnings, uiBench, use } from '../../../../ui/testing/effects';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, primary, quote } from '../kit';
import { id } from './overrule';

uiBench();

/** My card this round is Leadership (1); the entry is the primary of Trade (5), a card I do not hold. */
const table = (entry: Entry) => {
  const game = bench({ faction: 'sol', expansions: ['te'], start: { hand: [id] }, entries: [entry] });
  game.game.plans[0].rounds[0].strategyCard = 1;
  return game;
};

// "Perform the primary ability of a readied or unchosen strategy card."
// Checks: in «Used» of the primary of a card I do not hold I choose Overrule; it is named in the entry, and the warning
// of a primary of another's card reads as allowed by Overrule.
// Why the check is redundant here: the card lets me perform the primary of a card I do not hold (LRR 83.3 otherwise).
test('actionCard:overrule chosen in «Used», the primary of a card not mine reads as allowed by Overrule', async () => {
  const play = primary(5);
  const overrule = table(play);
  quote(overrule.pack, id, 'Perform the primary ability of a readied or unchosen strategy card.');
  const live = showUses(overrule, play);
  await use('Overrule');
  expect(live.entry().uses).toEqual([id]);
  expectShownWaived('foreignPrimary', 'Overrule');
});

// LRR 82: the active player resolves "the primary ability on their strategy card".
// Checks: without Overrule the same primary shows its warning standing.
// Why the check is NOT redundant here: nothing lets me resolve another's primary.
test('actionCard:overrule not chosen, the primary of a card not mine stands', () => {
  const play = primary(5);
  showWarnings(table(play), play);
  expectShownStanding('foreignPrimary');
});
