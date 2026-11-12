import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './reveal_prototype';

const table = () => bench({ faction: 'sol', expansions: ['pok'], start: { hand: [id] } });

describe('actionCard:reveal_prototype Reveal Prototype', () => {
  // "Spend 4 resources to research a unit upgrade technology of the same type as 1 of your units that is
  // participating in this combat."
  // Checks: the card is a hint, shown at the step combat; it waives nothing and changes no number.
  // Why nothing is validated here: The plan simulates no combat, and only a component action carries choices: a
  // tactical entry has no field for the technology researched by a card nor a payment beside its production. The
  // technology is entered in «Gained and discarded» by hand.
  test('actionCard:reveal_prototype is a hint at combat, with no waiver and no change of a number', () => {
    const { pack } = table();
    quote(pack, id, 'Spend 4 resources to research a unit upgrade technology');
    const found = effect(pack, id);
    expect(found.tier).toBe('hint');
    expect(found.hintAt).toEqual(['combat']);
    expect(found.waive).toBeUndefined();
    expect(found.modify).toBeUndefined();
  });

  test.todo('actionCard:reveal_prototype researching the unit upgrade for 4 resources inside a tactical action: an entry other than a component action has no choices and no second payment');
});
