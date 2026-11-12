import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showTactical, uiBench } from '../../../../ui/testing/effects';
import { bench, HOME, NO_PAYMENT, quote, tactical } from '../kit';
import { id } from './nomadcommander';

uiBench();

/** The Nomad produce their flagship at the dock of Home One and pay nothing. */
const table = (leaders: Record<string, 'unlocked'>) => {
  const move = tactical(HOME, { production: { flagship: 1 }, payment: NO_PAYMENT });
  return { move, ...bench({ faction: 'nomad', expansions: ['pok'], start: { leaders }, entries: [move], game: { docks: ['h1'] } }) };
};

// "When you produce: You can produce your flagship without spending resources."
// Checks: the tactical editor of a production of the flagship with nothing paid shows no shortage of resources.
// Why the check is redundant here: with the commander unlocked the flagship costs no resources, so nothing is short.
test.fails('leader:nomadcommander the flagship produced with nothing paid shows no shortage', () => {
  const nomad = table({ [id]: 'unlocked' });
  quote(nomad.pack, id, 'You can produce your flagship without spending resources.');
  showTactical(nomad, nomad.move);
  expectNotShown('shortResources');
});

// LRR 26.1: producing a unit asks for its cost.
// Checks: with the commander locked the same production shows the shortage, standing.
// Why the check is NOT redundant here: a locked commander gives nothing, and the flagship costs 8.
test('leader:nomadcommander locked, the unpaid flagship shows a standing shortage', () => {
  const nomad = table({});
  showTactical(nomad, nomad.move);
  expectShownStanding('shortResources');
});
