import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, NEAR, quote, tactical } from '../kit';
import { id } from './frln1';

uiBench();

/** A cruiser produced in the empty system my carrier explored, paid with Home Two (1 resource, 2 influence). */
const setup = () => {
  const move = tactical(NEAR, { production: { cruiser: 1 }, payment: { planets: ['h2'], tradeGoods: 0 } });
  return { move, table: bench({ faction: 'sol', expansions: ['pok'], units: { [NEAR]: { carrier: 1 } }, entries: [move] }) };
};

// "You may produce 1 unit in this system. You may spend influence as if it were resources to produce this unit."
// Checks: the production stands warned of; the player names Freelancers in «Used», and both warnings stay on the screen
// in the allowed look, naming the card.
// Why the check is redundant here: LRR 67.1 asks for a unit with Production and 68.1 for resources; the card lets one
// unit be produced here and paid with influence.
test.fails('exploration:frln1 named in «Used» shows the production in a system without a dock as allowed', async () => {
  const { move, table } = setup();
  quote(table.pack, id, 'You may spend influence as if it were resources to produce this unit.');
  showUses(table, move);
  expectShownStanding('noProduction');
  await use('Freelancers');
  expectShownWaived('noProduction', 'Freelancers');
  expectShownWaived('shortResources', 'Freelancers');
});
