import { expect, test } from 'vitest';
import type { AnyWarningCode } from '../../../types';
import { expectShownStanding, land, showTactical, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, quote, TARGET, tactical, using } from '../kit';
import { id } from './dmz';

uiBench();

/** The check pass 2 adds for a planet with the card attached: units landed, produced or placed on it. */
const DEMILITARIZED = 'planetDemilitarized' as AnyWarningCode;

// "Return all structures on this planet to your reinforcements. Then, return all ground forces on this planet to the
//  space area."
// Checks: in «Used» of the landing that took Target One, the player names the card it explored with; the entry plays it.
// Why nothing is waived here: the card moves units and attaches itself; it lifts no check.
test.fails('exploration:dmz is chosen in «Used» of the landing that explored the planet', async () => {
  const move = tactical(TARGET, { landings: [{ planetId: 't1', units: { infantry: 2 } }] });
  const table = bench({ faction: 'sol', expansions: ['pok'], units: { [TARGET]: { carrier: 1, infantry: 2 } }, entries: [move] });
  quote(table.pack, id, 'Return all structures on this planet to your reinforcements.');
  const live = showUses(table, move);
  await use('Demilitarized Zone');
  expect(live.entry().uses).toEqual([id]);
});

// "Attach: Units cannot be committed to, produced on, or placed on this planet."
// Checks: in round 2 the player lands an infantry on the demilitarized planet in the tactical editor; the landing is
// taken, and the warning stands under it.
// Why the check is NOT redundant here: the card forbids it, and nothing of this player lifts that.
test.fails('exploration:dmz a landing on the planet in a later round is shown warned of', async () => {
  const first = using(tactical(TARGET, { landings: [{ planetId: 't1', units: { infantry: 2 } }] }), id);
  const again = tactical(TARGET);
  const table = bench({ faction: 'sol', expansions: ['pok'], units: { [TARGET]: { carrier: 1, infantry: 3 } }, rounds: [[first], [again]] });
  const live = showTactical(table, again);
  await land('Infantry', 'Target One');
  expect(live.entry().landings).toEqual([{ planetId: 't1', units: { infantry: 1 } }]);
  expectShownStanding(DEMILITARIZED);
});
