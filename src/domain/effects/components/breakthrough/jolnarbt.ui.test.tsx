import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { componentById } from '../../../components';
import { CARD } from '../../../strategy';
import { bench, quote, secondary } from '../kit';
import { id } from './jolnarbt';

/**
 * The Jol-Nar's Brilliant resolves the secondary of Technology as the primary: the first technology is free and the second
 * costs 6 resources, so every research here names two (both biotic, or both propulsion).
 */
const BIOTIC = ['technology:nm', 'technology:dxa'];
const PROPULSION = ['technology:gd', 'technology:amd'];

uiBench();

const research = (technologies: string[]) => secondary(CARD.technology, { researched: technologies, payment: { planets: ['h2'], tradeGoods: 0 } });
const table = (entry: ReturnType<typeof secondary>) => bench({
  faction: 'jolnar', expansions: ['te'], start: { breakthrough: 'held' }, entries: [entry],
  edit: pack => { pack.planets.h2 = { ...pack.planets.h2, tech: ['biotic'] }; },
});

// "When you research technology using the 'Technology' strategy card, you may exhaust a planet that has a technology
//  specialty instead of spending resources; if you do, you must research a technology of that color."
// Checks: two biotic technologies paid by exhausting Home Two (biotic specialty): the shortfall of resources is
// shown as allowed by Specialist Compounds.
// Why the check is redundant here: the planet is exhausted instead of spending the 6 resources.
test('breakthrough:jolnarbt research paid by a planet of its colour shows the shortfall as allowed', () => {
  const entry = research(BIOTIC);
  const jolnar = table(entry);
  showWarnings(jolnar, entry);
  expectShownWaived('shortResources', componentById(jolnar.pack, id)!.name);
});

// Checks: Two propulsion technologies with the same planet shows the shortfall standing.
// Why the check is NOT redundant here: the planet pays only for a technology of its color.
test('breakthrough:jolnarbt research of another colour shows the shortfall standing', () => {
  const entry = research(PROPULSION);
  const jolnar = table(entry);
  quote(jolnar.pack, id, 'if you do, you must research a technology of that color');
  showWarnings(jolnar, entry);
  expectShownStanding('shortResources');
});
