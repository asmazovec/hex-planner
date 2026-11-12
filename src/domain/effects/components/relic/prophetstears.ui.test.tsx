import { expect, test } from 'vitest';
import { expectShownWaived, showUses, uiBench, use } from '../../../../ui/testing/effects';
import type { AnyWarningCode } from '../../../types';
import { bench, primary, quote } from '../kit';
import { id } from './prophetstears';

uiBench();

/** The check pass 2 adds: a technology researched without its prerequisites (90.8). */
const CODE = 'prerequisitesMissing' as AnyWarningCode;

// "When you research a technology, you may exhaust this card to ignore 1 prerequisite"
// Checks: Fleet Logistics (two propulsion prerequisites) is researched with one of them owned; I choose the Tears in
// «Used», and the warning of the missing prerequisite reads as allowed by The Prophet's Tears.
// Why the check is redundant here: one prerequisite is missing, and the card ignores one.
test.fails('relic:prophetstears chosen in «Used», the missing prerequisite reads as allowed by The Prophet\'s Tears', async () => {
  const research = primary(7, { researched: ['technology:fl'] });
  const table = bench({ faction: 'sol', expansions: ['pok'], start: { relics: [id], technologies: ['technology:amd'] }, entries: [research] });
  quote(table.pack, id, 'you may exhaust this card to ignore 1 prerequisite');
  const live = showUses(table, research);
  await use("The Prophet's Tears");
  expect(live.entry().uses).toEqual([id]);
  expectShownWaived(CODE, "The Prophet's Tears");
});
