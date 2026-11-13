import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './ghost_squad';

const holding = (hand: string[]) => bench({ faction: 'sol', expansions: ['pok'], start: { hand } });

describe('actionCard:ghost_squad Ghost Squad', () => {
  // "After another player commits units to land on a planet you control: Move any number of your ground forces from
  //  any planet you control in the active system to any other planet you control in the active system."
  // Checks: the card is a hint whose step is the invasion, the one its window names.
  // Why nothing is validated here: it is played in another player's tactical action, which the plan does not open to
  // my moves, and a move of ground forces between my own planets breaks no rule the replay checks.
  test('actionCard:ghost_squad is a hint of the invasion step', () => {
    const { pack } = holding([]);
    quote(pack, id, 'Move any number of your ground forces from any planet you control in the active system');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', rule: id, hintAt: ['invasion'] });
    expect(effect(pack, id).waive).toBeUndefined();
  });

  // Checks: held in hand, the card stands among the reminders of the invasion; not held, it does not.
  // Why nothing is validated here: a reminder is all the plan can give for a reaction in another player's turn.
  test('actionCard:ghost_squad held in hand is reminded at the invasion, not held it is not', () => {
    const held = holding([id]);
    expect(hintsAt(held.pack, endOf(held), 'invasion', ['rival']).map(c => c.id)).toContain(id);
    const none = holding([]);
    expect(hintsAt(none.pack, endOf(none), 'invasion', ['rival']).map(c => c.id)).not.toContain(id);
  });
});
