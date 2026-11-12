import { describe, expect, test } from 'vitest';
import type { StartHoldings } from '../../../types';
import { bench, effect, expectNone, expectStanding, HOME, quote, tactical, warningsOf } from '../kit';
import { id } from './ffac2';

/** The Saar produce `infantry` at home with their only dock on Home Two (1 resource). */
const produce = (infantry: number, start: StartHoldings = { technologies: [id] }) => {
  const build = tactical(HOME, { production: { infantry } });
  return { build, ...bench({ faction: 'saar', start, entries: [build], game: { docks: ['h2'] } }) };
};

describe('technology:ffac2 Floating Factory II', () => {
  // "PRODUCTION 7."
  // Checks: with Floating Factory II the Saar dock produces 7 units, whatever its planet's resources: seven infantry
  // from a dock on a planet of 1 resource make no warning.
  // Why the default value does not apply: the generated upgrade gives a space dock its planet's resources plus 4
  // (79.1, Space Dock II); the Floating Factory prints a flat PRODUCTION 7 and stands in no planet. A `modify` of
  // `productionValue`: the number changes, nothing is waived.
  test('technology:ffac2 the dock produces 7 units, not its planet\'s resources plus 4', () => {
    const saar = produce(7);
    quote(saar.pack, id, 'PRODUCTION 7.');
    expectNone(warningsOf(saar, saar.build), 'productionOver');
  });

  // Checks: the eighth unit is beyond the value, and the warning names 7.
  // Why the check is NOT redundant here: the upgrade changes the value, it does not lift the limit.
  test('technology:ffac2 still warns of an eighth unit, against the value of 7', () => {
    const saar = produce(8);
    expectStanding(warningsOf(saar, saar.build), 'productionOver');
    expect(warningsOf(saar, saar.build).find(w => w.code === 'productionOver')?.params).toMatchObject({ value: 7, count: 8 });
  });

  // LRR 79.1: "Each space dock has a Production ability that indicates the number of units it can produce."
  // Checks: without the technology the same dock is over its value with seven infantry.
  // Why the check is NOT redundant here: the upgrade is not researched.
  test('technology:ffac2 not researched, seven units from the dock are warned of', () => {
    const saar = produce(7, {});
    expectStanding(warningsOf(saar, saar.build), 'productionOver');
  });

  test.todo('technology:ffac2 the Floating Factory stands in the space area, moves 2 and carries 5 like a ship: the app keeps docks on planets only (LRR 85.1.1, 79.4.1 are todo in the rules tests)');
  test.todo('technology:ffac2 a blockaded Floating Factory is destroyed: docks in space are not modelled');

  test('technology:ffac2 is a passive unit upgrade', () => {
    const { pack } = produce(1);
    expect(effect(pack, id)).toMatchObject({ tier: 'passive', rule: '97.4' });
  });
});
