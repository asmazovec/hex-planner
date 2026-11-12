import { test } from 'vitest';
import { expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { AnyWarningCode, Entry } from '../../../types';
import { bench, componentAction, quote } from '../kit';
import { id } from './divert_funding';

uiBench();

// "Return a non-unit upgrade, non-faction technology that you own to your technology deck."
// Checks: the component action that returns Destroyer II, a unit upgrade, shows the warning of the card.
// Why the check is NOT redundant here: the card names the technologies it may return; a unit upgrade is not one, and
// nothing lifts that.
test('actionCard:divert_funding returning a unit upgrade shows the warning of the card', () => {
  const entry = { ...componentAction(id, {}), choices: { returned: 'technology:dd2', researched: 'technology:gd' } } as Entry;
  const table = bench({ faction: 'sol', expansions: ['pok'], start: { hand: [id], technologies: ['technology:amd', 'technology:dd2'] }, entries: [entry] });
  quote(table.pack, id, 'Return a non-unit upgrade, non-faction technology that you own');
  showWarnings(table, entry);
  expectShownStanding('returnedTechInvalid' as AnyWarningCode);
});
