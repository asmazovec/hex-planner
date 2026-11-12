import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './representative_government';

describe('agenda:representative_government Representative Government', () => {
  // "For: Players cannot exhaust planets to cast votes during the agenda phase. Each player may cast 1 vote on each
  //  agenda instead. Against: At the start of the next strategy phase, each player that voted "Against" exhausts all
  //  of their cultural planets."
  // Checks: the effect is a hint with no step.
  // Why nothing is validated: "For" changes how votes are cast and the plan counts no votes; "Against" exhausts planets
  // of those who voted against, which depends on the votes and is entered by hand (an exhausted planet is marked so).
  test('agenda:representative_government is a hint: it speaks of votes', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, 'Players cannot exhaust planets to cast votes during the agenda phase.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).waive).toBeUndefined();
    expect(effect(pack, id).hintAt ?? []).toEqual([]);
  });
});
