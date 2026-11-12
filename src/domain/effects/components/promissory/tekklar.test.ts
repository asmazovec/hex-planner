import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './tekklar';

describe('promissory:tekklar Tekklar Legion', () => {
  // "At the start of an invasion combat: Apply +1 to the result of each of your unit's combat rolls during this combat."
  // Checks: the card is a reminder in the block of the invasion, where ground combat is fought.
  // Why nothing is validated here: it changes combat rolls only (tirules2, Sardakk N'orr, Tekklar Legion note 1: not
  // even anti-fighter barrage, bombardment or space cannon), and the plan simulates no combat.
  test('promissory:tekklar is a reminder of the invasion: combat rolls are not counted by the plan', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, 'At the start of an invasion combat: Apply +1 to the result of each of your unit\'s combat rolls');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['invasion'] });
    expect(effect(pack, id).waive).toBeUndefined();
  });

  // Checks: another player holding the note sees it among the reminders of the invasion, and not in other steps.
  // Why nothing is validated here: the reminder is all the card gives the plan.
  test('promissory:tekklar held by another player stands among the reminders of the invasion', () => {
    const table = bench({ faction: 'sol', start: { promissory: [`${id}@o1`] } });
    const board = endOf(table);
    expect(hintsAt(table.pack, board, 'invasion', ['me']).map(component => component.id)).toContain(`${id}@o1`);
    expect(hintsAt(table.pack, board, 'production', ['me']).map(component => component.id)).not.toContain(`${id}@o1`);
  });
});
