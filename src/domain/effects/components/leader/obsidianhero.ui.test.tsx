import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { Entry } from '../../../types';
import { bench, componentAction, HOME, quote, tactical, TARGET } from '../kit';
import { id } from './obsidianhero';

uiBench();

const spend = (): Entry => tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });
const again = (): Entry => tactical(TARGET, { production: {}, payment: { planets: ['h1'], tradeGoods: 0 } });
const table = (entries: Entry[]) =>
  bench({ faction: 'obsidian', expansions: ['pok', 'te'], start: { leaders: { [id]: 'unlocked' } }, entries, game: { docks: ['h1'] } });

// "ACTION: Ready all of your planets. Then, purge this card."
// Checks: after the hero's component action the payment of a later action with Home One shows no warning that the
// planet is exhausted.
// Why the check is redundant here: the hero readied the planet, so it may be spent again (LRR 71.4).
test.fails('leader:obsidianhero played, a later payment with a planet spent before shows no exhausted planet', () => {
  const later = again();
  const made = table([spend(), componentAction(id), later]);
  quote(made.pack, id, 'Ready all of your planets.');
  showWarnings(made, later);
  expectNotShown('planetExhausted');
});

// LRR 64.9: "A player cannot spend an exhausted planet's resources or influence."
// Checks: without the hero the same payment shows the warning standing.
// Why the check is NOT redundant here: nothing readied the planet.
test('leader:obsidianhero not played, the payment with an exhausted planet shows the warning standing', () => {
  const later = again();
  showWarnings(table([spend(), later]), later);
  expectShownStanding('planetExhausted');
});
