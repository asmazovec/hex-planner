import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../../testing/old/domain/types';
import { adjust, bench, effect, endOf, HOME, quote } from '../kit';
import { id } from './arms_reduction';

/** The agenda phase resolves the directive "For": the entry gains it. */
const resolved = (): Entry => ({ ...adjust({}, 'agenda'), gains: [id] });

describe('agenda:arms_reduction Arms Reduction', () => {
  // "For: Each player destroys all but 2 of their dreadnoughts and all but 4 of their cruisers."
  // Checks: three dreadnoughts and six cruisers in one system become two and four; the carrier stays.
  // Why the check is redundant here: there is no check; the directive removes units the plan counts (fleet pool,
  // capacity, what can fly next round), so the board after it must show them gone.
  test('agenda:arms_reduction "For" leaves two dreadnoughts and four cruisers', () => {
    const table = bench({ faction: 'sol', units: { [HOME]: { dreadnought: 3, cruiser: 6, carrier: 1 } }, entries: [resolved()] });
    quote(table.pack, id, 'destroys all but 2 of their dreadnoughts and all but 4 of their cruisers');
    expect(endOf(table).systems[HOME]).toEqual({ dreadnought: 2, cruiser: 4, carrier: 1 });
  });

  // "... all but 2 ... all but 4 ..."
  // Checks: a player within those numbers loses nothing.
  // Why the check is NOT redundant here: the directive destroys only what is beyond 2 and 4.
  test('agenda:arms_reduction "For" leaves two dreadnoughts and four cruisers alone', () => {
    const table = bench({ faction: 'sol', units: { [HOME]: { dreadnought: 2, cruiser: 4 } }, entries: [resolved()] });
    expect(endOf(table).systems[HOME]).toEqual({ dreadnought: 2, cruiser: 4 });
  });

  test.todo('agenda:arms_reduction with dreadnoughts in several systems the player chooses which stay: an entry cannot name that choice yet');
  test.todo('agenda:arms_reduction the same for every opponent: a directive played on my entry reaches only my state');
  test.todo('agenda:arms_reduction "Against" exhausts every planet with a technology specialty at the next strategy phase: an entry cannot name the outcome');

  test('agenda:arms_reduction is a play effect', () => {
    const { pack } = bench({ faction: 'sol' });
    expect(effect(pack, id).tier).toBe('play');
  });
});
