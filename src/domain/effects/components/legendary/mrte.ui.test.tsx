import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, showUses, uiBench, use } from '../../../../ui/testing/effects';
import type { ExtensionCode } from '../../../types';
import { bench, NEAR, quote, tactical } from '../kit';
import { id } from './mrte';

uiBench();

const CONDITION = 'componentCondition' as ExtensionCode;
const table = (secrets: string[]) => {
  const entry = tactical(NEAR);
  return { entry, game: bench({ faction: 'letnev', expansions: ['te'], start: { secrets }, entries: [entry], game: { planetControl: { mrte: 'me' } } }) };
};

// Galactic Council note 1: "The Galactic Council cannot be exhausted by a player that has no unscored secret objective
//  cards in their hand."
// Checks: with no secret objective in hand I take The Galactic Council in «Used»; it is written into the entry, and
// the warning of its condition stands on the screen.
// Why the check is NOT redundant here: the card asks for a secret objective to discard.
test('legendary:mrte taken in «Used» with no secret objective in hand shows the condition warning', async () => {
  const { entry, game } = table([]);
  quote(game.pack, id, 'discard 1 secret objective to draw 1 secret objective');
  const live = showUses(game, entry);
  await use('The Galactic Council');
  expect(live.entry().uses).toEqual([id]);
  expectShownStanding(CONDITION);
});

// Checks: with a secret objective in hand the card is taken with no warning of its condition.
// Why nothing is warned of: the condition is met; the swap itself is entered as the entry's gains and discards.
test('legendary:mrte taken in «Used» with a secret objective in hand shows no condition warning', async () => {
  const { entry, game } = table(['secretObjective:ans']);
  const live = showUses(game, entry);
  await use('The Galactic Council');
  expect(live.entry().uses).toEqual([id]);
  expectNotShown(CONDITION);
});
