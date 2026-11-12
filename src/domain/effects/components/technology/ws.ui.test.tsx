import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { AnyWarningCode } from '../../../types';
import { bench, HOME, quote, tactical } from '../kit';
import { id } from './ws';

uiBench();

/** The check pass 2 adds for everyone: a war sun without its technology. */
const CODE = 'warSunLocked' as AnyWarningCode;

const build = (technologies: string[]) => {
  const entry = tactical(HOME, { production: { warsun: 1 }, payment: { planets: ['h1', 'h2'], tradeGoods: 8 } });
  return { entry, ...bench({ faction: 'hacan', start: { technologies }, entries: [entry], game: { docks: ['h1'] } }) };
};

// tirules2, units, War Sun 1: "A player without the war sun unit upgrade technology cannot produce, place or have a war
//  sun on the board for any reason."
// Checks: a war sun produced while holding War Sun: the warning is on the screen in the allowed look, naming War Sun.
// Why the check is redundant here: the technology is what unlocks the unit.
test('technology:ws a war sun produced with the technology reads as allowed by War Sun', () => {
  const table = build([id]);
  quote(table.pack, id, 'Move 2, Capacity 6');
  showWarnings(table, table.entry);
  expectShownWaived(CODE, 'War Sun');
});

// Checks: without the technology the same warning stands.
// Why the check is NOT redundant here: nothing this player holds unlocks the war sun.
test('technology:ws without the technology the war sun warning stands', () => {
  const table = build([]);
  showWarnings(table, table.entry);
  expectShownStanding(CODE);
});
