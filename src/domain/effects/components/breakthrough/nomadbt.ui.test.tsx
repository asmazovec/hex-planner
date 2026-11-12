import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, componentAction, quote, using } from '../kit';
import { id } from './nomadbt';

uiBench();

const MERCER = 'leader:nomadagentmercer';
const THUNDARIAN = 'leader:nomadagentthundarian';

/** Mercer is used, then used again by `again`. */
const table = (again: ReturnType<typeof componentAction>) => bench({
  faction: 'nomad', expansions: ['pok', 'te'], entries: [componentAction(MERCER), again],
  start: { leaders: { [MERCER]: 'unlocked', [THUNDARIAN]: 'unlocked' }, breakthrough: 'held' },
});

// "At the start of any player's turn, you may exhaust 1 of your agents to ready any other agent."
// Checks: the second use of Mercer already names The Thundarian in «Used»; I add Thunder's Paradox there, and the
// warning that Mercer is exhausted reads as allowed by the breakthrough.
// Why the check is redundant here: the breakthrough readied Mercer at the start of the turn, paid with The Thundarian.
test.fails('breakthrough:nomadbt Thunder\'s Paradox is added to «Used», and the exhausted agent reads as allowed by it', async () => {
  const again = using(componentAction(MERCER), THUNDARIAN);
  const nomad = table(again);
  quote(nomad.pack, id, 'exhaust 1 of your agents to ready any other agent');
  showUses(nomad, again);
  expectShownStanding('componentExhausted');
  await use('Thunder\'s Paradox');
  expectShownWaived('componentExhausted', 'Thunder\'s Paradox');
});

// LRR 51.4: an exhausted agent cannot be used until it is readied.
// Checks: without the breakthrough named, the warning stands.
// Why the check is NOT redundant here: nothing readied Mercer.
test('breakthrough:nomadbt not named, the exhausted agent\'s warning stands', () => {
  const again = using(componentAction(MERCER), THUNDARIAN);
  showUses(table(again), again);
  expectShownStanding('componentExhausted');
});
