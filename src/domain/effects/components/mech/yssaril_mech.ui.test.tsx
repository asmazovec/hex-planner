import { expect, test } from 'vitest';
import { choose, showUses, uiBench } from '../../../../ui/testing/effects';
import { bench, componentAction, endOf, quote } from '../kit';
import { id } from './yssaril_mech';

uiBench();

// "DEPLOY: After you use your Stall Tactics faction ability, you may place 1 mech on a planet you control."
// Checks: the Stall Tactics action names the mech in «Used»; the mech asks for the planet, I press Home One, the entry
// keeps it for the mech alone, and a mech stands on Home One.
// Why the check is redundant here: a mech otherwise enters the board only by production (67, 68.3); the deploy places
// it, so the interface has to let the player name the planet.
test('mech:yssaril_mech asks for the planet in «Used» of Stall Tactics and places the mech there', async () => {
  const card = 'actionCard:abs';
  const entry = componentAction('ability:stall_tactics', { spends: [card], uses: [id] });
  const table = bench({ faction: 'yssaril', expansions: ['pok'], start: { hand: [card] }, entries: [entry] });
  quote(table.pack, id, 'you may place 1 mech on a planet you control');
  const live = showUses(table, entry);
  await choose('Home One', 'Planet');
  expect((live.entry() as { useChoices?: unknown }).useChoices).toEqual({ [id]: { planet: 'h1' } });
  expect(endOf({ pack: table.pack, game: live.game() }).ground.h1?.mech).toBe(1);
});
