import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './ers';

describe('technology:ers E-Res Siphons', () => {
  // "After another player activates a system that contains 1 or more of your ships, gain 4 trade goods."
  // Checks: the technology is a reminder of the activation, and stands among its reminders once researched.
  // Why nothing is validated here: the trigger is another player's activation (tirules2, Jol-Nar, E-Res Siphons 1-2:
  // a tactical activation only), and an opponent's entry does not change my totals in this plan; nothing it allows
  // is forbidden by a check either.
  test('technology:ers is a reminder of the activation', () => {
    const table = bench({ faction: 'jolnar', start: { technologies: [id] } });
    quote(table.pack, id, 'After another player activates a system that contains 1 or more of your ships, gain 4 trade goods.');
    expect(effect(table.pack, id)).toMatchObject({ tier: 'hint', hintAt: ['activation'] });
    expect(hintsAt(table.pack, endOf(table), 'activation', ['rival']).map(component => component.id)).toContain(id);
  });

  test.todo('technology:ers an opponent\'s tactical action into a system with my ships gives me 4 trade goods: the actions of opponents do not change my totals in the plan');
});
