import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './rep_govt';

describe('agenda:rep_govt Representative Government', () => {
  // "For: Players cannot exhaust planets to cast votes during the agenda phase. each player may cast 1 vote on each
  //  agenda instead."
  // Checks: the card is a hint with no waiver.
  // Why nothing is validated: "For" changes votes, and the plan counts no votes. "Against" exhausts the cultural
  // planets of those who voted against at the start of the next strategy phase; who voted how is not in the plan, so
  // the player marks the planets exhausted by hand.
  test('agenda:rep_govt is a hint: the plan counts no votes', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    quote(pack, id, 'Players cannot exhaust planets to cast votes during the agenda phase.');
    quote(pack, id, 'each player that voted "Against" exhausts all of their cultural planets');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
