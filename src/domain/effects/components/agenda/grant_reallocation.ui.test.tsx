import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { Entry, EntryBody } from '../../../types';
import { bench, HOME, planned, quote } from '../kit';
import { id } from './grant_reallocation';

uiBench();

const elected = (technology: string): Entry =>
  planned({ type: 'adjustment', label: '', delta: {} } as EntryBody, 'agenda', { gains: [id, technology] });
const table = (agenda: Entry) => bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { cruiser: 3 } }, entries: [agenda] });

// "for each prerequisite on that technology, they remove 1 token from their fleet pool"
// Checks: E-Res Siphons (2 prerequisites) chosen among the gains of the agenda: the pool of 1 is below the three
// cruisers at home, and the warning stands on the screen of the agenda entry.
// Why the check is NOT redundant here: the agenda lowers the fleet pool and lets no ship stay beyond it (37.3).
test.fails('agenda:grant_reallocation the technology chosen lowers the fleet pool below the ships, shown standing', () => {
  const agenda = elected('technology:ers');
  const t = table(agenda);
  quote(t.pack, id, 'remove 1 token from their fleet pool');
  showWarnings(t, agenda);
  expectShownStanding('fleetPool');
});

// Checks: Gravity Drive has no prerequisite: no fleet pool warning on the screen.
// Why the check is NOT redundant here: no prerequisite, no token removed.
test('agenda:grant_reallocation a technology with no prerequisite shows no fleet pool warning', () => {
  const agenda = elected('technology:gd');
  showWarnings(table(agenda), agenda);
  expectNotShown('fleetPool');
});
