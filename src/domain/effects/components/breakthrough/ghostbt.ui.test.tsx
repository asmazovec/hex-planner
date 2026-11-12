import { test } from 'vitest';
import { expectNotShown, expectShownStanding, expectShownWaived, showTactical, uiBench } from '../../../../ui/testing/effects';
import type { StartHoldings } from '../../../types';
import { bench, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './ghostbt';

uiBench();

const MAP = { [HOME]: 'r-home', [NEAR]: 'r-alpha', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };
const show = (start: StartHoldings) => {
  const entry = tactical(NEAR, { production: { destroyer: 1 } });
  const table = bench({ faction: 'ghost', expansions: ['te'], units: { [NEAR]: { cruiser: 1 } }, start, entries: [entry], game: { map: MAP } });
  showTactical(table, entry);
  return table;
};

// "Each wormhole in a system that contains your ships gains PRODUCTION 1 as if it were a unit you control. Reduce the
//  combined cost of units you produce in systems that contain wormholes by 1 for each wormhole in that system."
// Checks: a destroyer built in the alpha system with no dock: the warning that nothing produces there reads as allowed
// by Particle Synthesis, and the destroyer (cost 1) asks for no payment.
// Why the check is redundant here: the wormhole is a unit with PRODUCTION 1 for the Creuss player, and the cost is 1 less.
test.fails('breakthrough:ghostbt a destroyer built at a wormhole reads as allowed by Particle Synthesis and costs nothing', () => {
  const table = show({ breakthrough: 'held' });
  quote(table.pack, id, 'gains PRODUCTION 1 as if it were a unit you control');
  expectShownWaived('noProduction', 'Particle Synthesis');
  expectNotShown('shortResources');
});

// LRR 67, 79.4.
// Checks: without the breakthrough the same production shows both warnings standing.
test('breakthrough:ghostbt not held, the production at a wormhole shows its warnings standing', () => {
  show({});
  expectShownStanding('noProduction');
  expectShownStanding('shortResources');
});
