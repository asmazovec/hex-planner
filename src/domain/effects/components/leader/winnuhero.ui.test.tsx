import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { CARD } from '../../../replay/cards/ids';
import { bench, primary, quote } from '../kit';
import { id } from './winnuhero';

uiBench();

/** The Winnu hold Leadership this round and enter Politics' primary. */
const table = () => {
  const politics = primary(CARD.politics);
  const winnu = bench({ faction: 'winnu', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries: [politics] });
  winnu.game.plans[0].rounds[0].strategyCard = CARD.leadership;
  return { politics, table: winnu };
};

// "ACTION: Perform the primary ability of any strategy card."
// Checks: I choose Mathis Mathinus in «Used» of Politics' primary; the warning that the card is not mine reads as
// allowed by the hero.
// Why the check is redundant here: the hero performs the primary of any card (83.3 gives it to the holder).
test('leader:winnuhero chosen in «Used», the primary of a card not held reads as allowed by Mathis Mathinus', async () => {
  const winnu = table();
  quote(winnu.table.pack, id, 'Perform the primary ability of any strategy card');
  showUses(winnu.table, winnu.politics);
  await use('Mathis Mathinus');
  expectShownWaived('foreignPrimary', 'Mathis Mathinus');
});

// Checks: without the hero the primary of a card not held stands.
// Why the check is NOT redundant here: the hero is not played.
test('leader:winnuhero not chosen, the primary of a card not held stands', () => {
  const winnu = table();
  showUses(winnu.table, winnu.politics);
  expectShownStanding('foreignPrimary');
});
