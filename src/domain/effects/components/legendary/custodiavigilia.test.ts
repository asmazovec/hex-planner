import { describe, expect, test } from 'vitest';
import { standing } from '../../../rules/registry';
import type { Entry, UnitCounts } from '../../../types';
import { bench, effect, expectNone, expectStanding, FAR, FARTHER, HOME, NEAR, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './custodiavigilia';

/** The test row with Mecatol Rex (tile 18) at the target. */
const MAP = { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: '18', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };
/** A tactical action in the Mecatol Rex system that produces `units` there, with no space dock anywhere. */
const produce = (units: UnitCounts) => tactical(TARGET, { production: units });
const table = (move: Entry, control: Record<string, 'me' | 'enemy'>) => ({
  move, ...bench({ faction: 'keleresm', expansions: ['pok'], entries: [move], game: { map: MAP, planetControl: control } }),
});
const BOTH = { mr: 'me', custodiavigilia: 'me' } as const;

describe('legendary:custodiavigilia Custodian\'s Favour', () => {
  // "While you control Mecatol Rex, it gains SPACE CANNON 5 and PRODUCTION 3."
  // Checks: controlling Custodia Vigilia and Mecatol Rex, 3 infantry are produced in its system with no space dock;
  // neither "no unit with Production" nor "over the Production value" stands.
  // Why the check is redundant here: production needs a unit with Production in the system (67.1); Mecatol Rex is
  // one by the card, used as a unit on Mecatol Rex (Council Keleres, Custodia Vigilia 9).
  test.fails('legendary:custodiavigilia Mecatol Rex produces 3 units with no space dock', () => {
    const cv = table(produce({ infantry: 3 }), BOTH);
    quote(cv.pack, id, 'While you control Mecatol Rex, it gains SPACE CANNON 5 and PRODUCTION 3.');
    const codes = standing(warningsOf(cv, cv.move)).map(w => w.code);
    expect(codes).not.toContain('noProduction');
    expect(codes).not.toContain('productionOver');
  });

  // "... PRODUCTION 3."
  // Checks: a fourth unit is over the value of 3, and the warning names that value.
  // Why the check is NOT redundant here: the card gives a Production value, not unlimited production.
  test.fails('legendary:custodiavigilia a fourth unit is over the Production value of 3', () => {
    const cv = table(produce({ infantry: 4 }), BOTH);
    const warnings = warningsOf(cv, cv.move);
    expectNone(warnings, 'noProduction');
    expectStanding(warnings, 'productionOver');
    expect(warnings.find(w => w.code === 'productionOver')?.params).toMatchObject({ value: 3, count: 4 });
  });

  // "While you control Mecatol Rex ..."
  // Checks: with Custodia Vigilia but not Mecatol Rex, production there has no unit with Production.
  // Why the check is NOT redundant here: the card gives Production to Mecatol Rex only while its controller holds it.
  test('legendary:custodiavigilia without control of Mecatol Rex the system has no Production', () => {
    const cv = table(produce({ infantry: 1 }), { custodiavigilia: 'me', mr: 'enemy' });
    expectStanding(warningsOf(cv, cv.move), 'noProduction');
  });

  // LRR 67.1: a unit with the Production ability produces units in its system.
  // Checks: holding Mecatol Rex without Custodia Vigilia gives no Production there.
  // Why the check is NOT redundant here: the card is in force for the player who controls Custodia Vigilia only (53.2).
  test('legendary:custodiavigilia without Custodia Vigilia, Mecatol Rex has no Production', () => {
    const cv = table(produce({ infantry: 1 }), { mr: 'me' });
    expectStanding(warningsOf(cv, cv.move), 'noProduction');
  });

  test.todo('legendary:custodiavigilia SPACE CANNON 5 of Mecatol Rex and the 2 command tokens when another player scores with Imperial: a roll and another player\'s strategy card, reminders only (the hint of a legendary planet is not shown yet)');

  test.fails('legendary:custodiavigilia is a passive effect', () => {
    const { pack } = table(produce({}), BOTH);
    expect(effect(pack, id).tier).toBe('passive');
  });
});
