import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showTactical, uiBench, use } from '../../../../ui/testing/effects';
import { bench, HOME, quote, tactical } from '../kit';
import { id } from './war_machine1';

uiBench();

const setup = () => {
  const move = tactical(HOME, { production: { infantry: 9 } });
  return { move, table: bench({ faction: 'sol', expansions: ['pok'], start: { hand: [id] }, entries: [move], game: { docks: ['h1'] } }) };
};

// "Apply +4 to the total PRODUCTION value of your units"
// Checks: nine infantry produced at a dock of Production 5; the player names War Machine in «Used» of the tactical
// editor and the production warning goes away.
// Why the check is redundant here: the Production value is 9 with the card, so nine units are within it (a change of
// the number: nothing is shown as allowed).
test.fails('actionCard:war_machine1 named in «Used», nine units are no longer over the Production value', async () => {
  const { move, table } = setup();
  quote(table.pack, id, 'Apply +4 to the total PRODUCTION value of your units');
  showTactical(table, move);
  expectShownStanding('productionOver');
  await use('War Machine');
  expectNotShown('productionOver');
});

// LRR 68.1: the Production value limits the number of units produced.
// Checks: without the card the warning stands in the editor.
// Why the check is NOT redundant here: the card was not named.
test('actionCard:war_machine1 not named, nine units are over the dock of 5', () => {
  const { move, table } = setup();
  showTactical(table, move);
  expectShownStanding('productionOver');
});
