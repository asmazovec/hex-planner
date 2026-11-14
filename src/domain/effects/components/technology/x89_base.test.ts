import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import type { Entry } from '../../../types';
import { bench, componentAction, effect, endOf, expectStanding, quote, warningsOf } from '../kit';
import { id } from './x89_base';

/** A game of the Federation of Sol in which I hold the card from the start. */
const held = (entries: Entry[] = []) => bench({ faction: 'sol', start: { technologies: [id] }, entries });

describe('technology:x89_base X-89 Bacterial Weapon', () => {
  // "destroy all infantry on that planet"
  // Checks: the card is a reminder, shown in the block of the step `component` to the player who holds it.
  // Why nothing is validated: the infantry destroyed are other players', which my count knows only by hand and which matter only to a
  // ground combat the plan does not simulate; the card itself is exhausted by the component action, as its text says.
  test('technology:x89_base is a hint shown at its step to the player who holds it', () => {
    const t = held();
    quote(t.pack, id, 'destroy all infantry on that planet');
    expect(effect(t.pack, id)).toMatchObject({ tier: 'hint', hintAt: ['component'] });
    for (const step of effect(t.pack, id).hintAt ?? []) expect(hintsAt(t.pack, endOf(t), step, ['me']).map(c => c.id)).toContain(id);
  });

  // Checks: a player who does not hold the card is not reminded of it.
  test('technology:x89_base is not shown to a player who does not hold it', () => {
    const t = bench({ faction: 'sol' });
    expect(hintsAt(t.pack, endOf(t), 'component', ['me']).map(c => c.id)).not.toContain(id);
  });

  // "ACTION: Exhaust this card and choose 1 planet"
  // Checks: played twice by component actions in one round, the second play finds the card exhausted.
  // Why the check is NOT redundant here: the card exhausts itself and is readied only in the status phase.
  test('technology:x89_base played twice in a round: the second play finds it exhausted', () => {
    const again = componentAction(id);
    const t = held([componentAction(id), again]);
    expectStanding(warningsOf(t, again), 'componentExhausted');
  });
});
