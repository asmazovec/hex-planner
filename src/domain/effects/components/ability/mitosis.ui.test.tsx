import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showTactical, uiBench } from '../../../../ui/testing/effects';
import type { AnyWarningCode } from '../../../types';
import { bench, HOME, quote, tactical } from '../kit';
import { id } from './mitosis';

uiBench();

/** The check pass 2 adds to the production step: infantry produced by space docks that may not produce them. */
const DOCK_INFANTRY = 'dockInfantry' as AnyWarningCode;

const production = (faction: string) => {
  const move = tactical(HOME, { production: { infantry: 2 } });
  return { move, table: bench({ faction, expansions: ['pok'], entries: [move], game: { docks: ['h1'] } }) };
};

// "Your space docks cannot produce infantry"
// Checks: the tactical editor of two infantry produced by the Arborec dock shows the warning that the dock cannot
// produce them, standing: the production is entered all the same.
// Why the check is NOT redundant here: the ability adds a limit for the Arborec; nothing lifts it.
test.fails('ability:mitosis infantry from an Arborec space dock are shown with a standing warning', () => {
  const { move, table } = production('arborec');
  quote(table.pack, id, 'Your space docks cannot produce infantry');
  showTactical(table, move);
  expectShownStanding(DOCK_INFANTRY);
});

// LRR 68.1: "This value is the maximum number of units that this unit can produce."
// Checks: another faction's dock produces the same infantry with no such warning.
// Why the check is NOT redundant here: the limit is printed on the Arborec sheet only.
test('ability:mitosis infantry from another faction\'s dock are shown without it', () => {
  const { move, table } = production('sol');
  showTactical(table, move);
  expectNotShown(DOCK_INFANTRY);
  expectNotShown('productionOver');
});
