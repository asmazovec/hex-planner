import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import type { Entry } from '../../../types';
import { bench, effect, endOf, expectNone, expectStanding, NEAR, quote, tactical, TARGET, using, warningsOf } from '../kit';
import { id } from './td';

/** A game of the Federation of Sol in which I hold the card from the start. */
const held = (entries: Entry[] = []) => bench({ faction: 'sol', start: { technologies: [id] }, entries });

describe('technology:td Transit Diodes', () => {
  // "remove up to 4 of your ground forces from the game board and place them on 1 or more planets you control"
  // Checks: the card is a reminder, shown in the block of the step `round` to the player who holds it.
  // Why nothing is validated: moving the ground forces is a choice (from where, to which planets) that an entry using the card cannot
  // carry yet; the card itself is already exhausted by its use (below).
  test('technology:td is a hint shown at its step to the player who holds it', () => {
    const t = held();
    quote(t.pack, id, 'remove up to 4 of your ground forces from the game board and place them on 1 or more planets you control');
    expect(effect(t.pack, id)).toMatchObject({ tier: 'hint', hintAt: ['round'] });
    for (const step of effect(t.pack, id).hintAt ?? []) expect(hintsAt(t.pack, endOf(t), step, ['me']).map(c => c.id)).toContain(id);
  });

  // Checks: a player who does not hold the card is not reminded of it.
  test('technology:td is not shown to a player who does not hold it', () => {
    const t = bench({ faction: 'sol' });
    expect(hintsAt(t.pack, endOf(t), 'round', ['me']).map(c => c.id)).not.toContain(id);
  });

  // "You may exhaust this card at the start of your turn"
  // Checks: named in the `uses` of an entry the card is exhausted, so a second use in the same round is warned of as
  // an exhausted component, and the first is not.
  // Why the check is NOT redundant here: the card's own text exhausts it; it is ready again only in the status phase.
  test('technology:td used twice in a round: the second use finds it exhausted', () => {
    const first = using(tactical(NEAR), id);
    const second = using(tactical(TARGET), id);
    const t = held([first, second]);
    quote(t.pack, id, 'You may exhaust this card at the start of your turn');
    expectNone(warningsOf(t, first), 'componentExhausted');
    expectStanding(warningsOf(t, second), 'componentExhausted');
  });

  test.todo('technology:td moves up to 4 ground forces onto planets I control: an entry cannot carry the choices for a component it uses (choices exist on component actions only); then a fifth unit and a planet not controlled are warned of');
});
