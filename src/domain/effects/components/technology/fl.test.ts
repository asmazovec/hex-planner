import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../../../testing/old/domain/effects/registry';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, effect, endOf, expectNone, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './fl';

/** A game of the Federation of Sol in which I hold the card from the start. */
const held = (entries: Entry[] = []) => bench({ faction: 'sol', start: { technologies: [id] }, entries });

describe('technology:fl Fleet Logistics', () => {
  // "you may perform 2 actions instead of 1"
  // Checks: the card is a reminder, shown in the block of the step `round` to the player who holds it.
  // Why nothing is validated: every action is an entry of its own and no check counts the actions of a turn, so two actions in a row are
  // two entries and nothing is warned of.
  test('technology:fl is a hint shown at its step to the player who holds it', () => {
    const t = held();
    quote(t.pack, id, 'you may perform 2 actions instead of 1');
    expect(effect(t.pack, id)).toMatchObject({ tier: 'hint', hintAt: ['round'] });
    for (const step of effect(t.pack, id).hintAt ?? []) expect(hintsAt(t.pack, endOf(t), step, ['me']).map(c => c.id)).toContain(id);
  });

  // Checks: a player who does not hold the card is not reminded of it.
  test('technology:fl is not shown to a player who does not hold it', () => {
    const t = bench({ faction: 'sol' });
    expect(hintsAt(t.pack, endOf(t), 'round', ['me']).map(c => c.id)).not.toContain(id);
  });

  // LRR 3.1 (one action per turn) is not checked by the plan.
  // Checks: two tactical actions one after the other make no warning of the round's flow with or without the card,
  // which is why nothing has to be lifted.
  test('technology:fl two actions in a row are warned of for no one', () => {
    const first = tactical(NEAR);
    const second = tactical(TARGET);
    for (const t of [held([first, second]), bench({ faction: 'sol', entries: [first, second] })]) {
      expectNone(warningsOf(t, second), 'actionAfterPass');
      expectNone(warningsOf(t, second), 'actionOutsidePhase');
    }
  });
});
