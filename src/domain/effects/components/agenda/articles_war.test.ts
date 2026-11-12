import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { adjust, bench, effect, endOf, expectStanding, expectWaived, HOME, NEAR, quote, tactical, warningsOf } from '../kit';
import { id } from './articles_war';

/** The agenda resolved in the agenda phase of round 1, with the outcome that received the most votes. */
const resolved = (outcome: 'for' | 'against'): Entry => ({ ...adjust({}, 'agenda'), gains: [id], choices: { outcome } } as Entry);

const AERIE = 'mech:argent_mech';

/** An Argent destroyer (capacity 1) carries an infantry and an Aerie Sentinel in round 2, after the agenda of round 1. */
const table = (law: Entry | null) => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: { destroyer: 1, infantry: 1, mech: 1 } }] });
  return { move, ...bench({ faction: 'argent', expansions: ['pok'], units: { [HOME]: { destroyer: 1, infantry: 1, mech: 1 } }, rounds: [law ? [law] : [], [move]] }) };
};

describe('agenda:articles_war Articles of War', () => {
  // "For: All mechs lose their printed abilities except for SUSTAIN DAMAGE."
  // Checks: under the law the Aerie Sentinel no longer leaves the capacity count; the capacity warnings stand.
  // Why the check is NOT redundant here: the mech's ability is what lifted the capacity check (16.1, 16.3); the law
  // takes that ability away, so the rule applies to the mech as to any ground force.
  test.fails('agenda:articles_war takes the printed ability of a mech away: the Aerie Sentinel counts against capacity again', () => {
    const t = table(resolved('for'));
    quote(t.pack, id, 'All mechs lose their printed abilities except for SUSTAIN DAMAGE.');
    const warnings = warningsOf(t, t.move);
    expectStanding(warnings, 'capacityGroup');
    expectStanding(warnings, 'capacitySystem');
  });

  // Checks: without the law the same flight is allowed by the mech.
  // Why the check is redundant here: no law is in play, and the mech's own ability lifts the check.
  test('agenda:articles_war without the law the mech\'s ability still lifts the capacity check', () => {
    const t = table(null);
    expectWaived(warningsOf(t, t.move), 'capacityGroup', AERIE);
  });

  // LRR 7.6: an "Against" outcome of a law is resolved and the card discarded.
  // Checks: resolved Against, the law is not in play and the mech keeps its ability.
  test.fails('agenda:articles_war resolved Against is discarded: the mech keeps its ability', () => {
    const t = table(resolved('against'));
    expect(endOf(t).laws ?? []).not.toContain(id);
    expectWaived(warningsOf(t, t.move), 'capacityGroup', AERIE);
  });

  test.fails('agenda:articles_war is a passive effect', () => {
    expect(effect(table(null).pack, id).tier).toBe('passive');
  });

  test.todo('agenda:articles_war Against gives 3 trade goods to each player who voted For: votes are not modelled, entered by hand');
});
