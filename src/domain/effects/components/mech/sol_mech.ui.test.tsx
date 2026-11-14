import { expect, test } from 'vitest';
import { showFlight, take, takeButton, uiBench } from '../../../../ui/testing/effects';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, componentAction, HOME, NEAR, quote, tactical, using } from '../kit';
import { id } from './sol_mech';

uiBench();

// "DEPLOY: After you use your Orbital Drop faction ability, you may spend 3 resources to place 1 mech on that planet."
// Checks: after Orbital Drop on Home One with the mech named, the flight out of the home system offers the mech of
// Home One in the plain look; I take it aboard the carrier and nothing is missing.
// Why the check is redundant here: the mech was deployed, not produced, so it stands on the planet without a unit
// with Production.
test('mech:sol_mech the mech deployed with Orbital Drop is offered on the planet and taken aboard', async () => {
  const drop = using(componentAction('ability:orbital_drop', { choices: { planet: 'h1' } } as Partial<Entry>), id);
  const move = tactical(NEAR, { moves: [{ from: HOME, units: {} }] });
  const table = bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { carrier: 1 } }, entries: [drop, move] });
  quote(table.pack, id, 'place 1 mech on that planet');
  const live = showFlight(table, move, HOME);
  expect(takeButton('Mech', 'Home One').className).not.toContain('draft-take-over');
  await take('Carrier');
  await take('Mech', 'Home One');
  expect(live.warnings().filter(w => w.code === 'unitsMissing')).toEqual([]);
});
