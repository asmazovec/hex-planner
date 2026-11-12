import { describe, expect, test } from 'vitest';
import { bench, componentAction, effect, expectNone, expectStanding, quote, warningsOf } from '../kit';
import { id } from './saarbt';

describe('breakthrough:saarbt Deorbit Barrage', () => {
  // "ACTION: Exhaust this card and spend any amount of resources to choose a planet up to 2 systems away from an
  //  asteroid field that contains your ships; roll a number of dice equal to the amount spent and assign 1 hit ..."
  // Checks: the breakthrough is a reminder of its component action.
  // Why nothing is validated here: the hits are dice the plan does not roll, and the amount of resources is the
  // player's free choice, so there is no number to check.
  test('breakthrough:saarbt is a hint of its component action', () => {
    const { pack } = bench({ faction: 'saar', expansions: ['te'] });
    quote(pack, id, 'roll a number of dice equal to the amount spent');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['component'] });
  });

  // "ACTION: Exhaust this card ..." with LRR 34 (an exhausted card cannot be used until readied).
  // Checks: played once by a component action the breakthrough is exhausted; the second play that round is warned of.
  // Why the check is NOT redundant here: nothing readies the card before the status phase.
  test('breakthrough:saarbt is exhausted by its action, so a second play in the round is warned of', () => {
    const first = componentAction(id);
    const second = componentAction(id);
    const table = bench({ faction: 'saar', expansions: ['te'], start: { breakthrough: 'held' }, entries: [first, second] });
    expectNone(warningsOf(table, first), 'componentExhausted');
    expectStanding(warningsOf(table, second), 'componentExhausted');
  });
});
