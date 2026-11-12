import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './md_base';

describe('technology:md_base Magen Defense Grid', () => {
  // "You may exhaust this card at the start of a round of ground combat on a planet that contains 1 or more of your
  //  units that have PLANETARY SHIELD; your opponent cannot make combat rolls this combat round."
  // Checks: the technology is a reminder of the invasion step, where ground combat is fought.
  // Why nothing is validated here: it takes away the opponent's combat rolls; the plan rolls no dice and fights no
  // combat, the losses are entered by hand.
  test('technology:md_base is a hint of the invasion', () => {
    const table = bench({ faction: 'hacan', start: { technologies: [id] } });
    quote(table.pack, id, 'your opponent cannot make combat rolls this combat round');
    expect(effect(table.pack, id)).toMatchObject({ tier: 'hint', hintAt: ['invasion'] });
    expect(effect(table.pack, id).waive).toBeUndefined();
    expect(hintsAt(table.pack, endOf(table), 'invasion', ['me']).map(c => c.id)).toContain(id);
  });

  // Checks: without the technology no reminder is shown.
  // Why nothing is validated here: the reminder follows the cards held; there is no check to keep or to lift.
  test('technology:md_base is not offered as a reminder while it is not held', () => {
    const table = bench({ faction: 'hacan' });
    expect(hintsAt(table.pack, endOf(table), 'invasion', ['me']).map(c => c.id)).not.toContain(id);
  });
});
