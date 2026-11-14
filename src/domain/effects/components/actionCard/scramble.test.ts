import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './scramble';

const holding = (hand: string[]) => bench({ faction: 'sol', expansions: ['pok'], start: { hand } });

describe('actionCard:scramble Scramble Frequency', () => {
  // "That player rerolls all of their dice."
  // Checks: the card is a hint of the combat and invasion steps and lifts nothing.
  // Why nothing is validated here: it rerolls dice, and the plan rolls none.
  test('actionCard:scramble is a hint of the combat and invasion steps', () => {
    const { pack } = holding([]);
    quote(pack, id, 'That player rerolls all of their dice.');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', rule: id });
    expect([...(effect(pack, id).hintAt ?? [])].sort()).toEqual(['combat', 'invasion']);
  });

  // Checks: held in hand, the card is reminded in both blocks; not held, in neither.
  // Why nothing is validated here: a reminder is all the plan gives for a card about dice.
  test('actionCard:scramble held in hand is reminded at combat and invasion, not held it is not', () => {
    const held = holding([id]);
    expect(hintsAt(held.pack, endOf(held), 'combat', ['rival']).map(c => c.id)).toContain(id);
    expect(hintsAt(held.pack, endOf(held), 'invasion', ['rival']).map(c => c.id)).toContain(id);
    const none = holding([]);
    expect(hintsAt(none.pack, endOf(none), 'combat', ['rival']).map(c => c.id)).not.toContain(id);
  });
});
