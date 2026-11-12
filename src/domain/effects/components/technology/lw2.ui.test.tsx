import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showTactical, uiBench } from '../../../../ui/testing/effects';
import { adjust, bench, quote, TARGET, tactical } from '../kit';
import { id } from './lw2';

uiBench();

/** Two infantry produced in the target system, where my one infantry stands on t1 and no space dock is. */
const production = (faction: string, technologies: string[]) => {
  const move = tactical(TARGET, { production: { infantry: 2 }, productionGround: { t1: { infantry: 2 } } });
  return {
    move, table: bench({
      faction, expansions: ['pok'], start: { technologies }, entries: [adjust({ ground: { t1: { infantry: 1 } } }, 'strategy'), move],
      game: { planetControl: { t1: 'me' } },
    }),
  };
};

// "PRODUCTION 2"
// Checks: the tactical editor of a production made by one Letani Warrior II shows no production warning.
// Why the check is redundant here: the Arborec infantry is a unit with PRODUCTION, 2 with this upgrade.
test('technology:lw2 two infantry produced by a Letani Warrior II are shown without a production warning', () => {
  const { move, table } = production('arborec', [id]);
  quote(table.pack, id, 'PRODUCTION 2');
  showTactical(table, move);
  expectNotShown('noProduction');
  expectNotShown('productionOver');
});

// LRR 68.1: "A unit's Production ability, which is presented on a faction sheet or unit upgrade technology card, is
//  always followed by a value."
// Checks: another faction's infantry produces nothing, and the editor says so.
// Why the check is NOT redundant here: the Production of an infantry is the Arborec's own.
test('technology:lw2 another faction\'s infantry is shown as producing nothing', () => {
  const { move, table } = production('sol', ['technology:inf2']);
  showTactical(table, move);
  expectShownStanding('noProduction');
});
