import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './bastioncommander';

describe('leader:bastioncommander Nip and Tuck', () => {
  // "At any time: Your action cards cannot be canceled by "Sabotage" action cards."
  // Checks: the commander is a reminder where my action cards are played.
  // Why nothing is validated here: a Sabotage is another player's reaction, which the plan does not enter; no check of
  // the replay cancels a card, so nothing is lifted.
  test('leader:bastioncommander is a hint of the component step', () => {
    const { pack } = bench({ faction: 'bastion', expansions: ['pok', 'te'], start: { leaders: { [id]: 'unlocked' } } });
    quote(pack, id, 'Your action cards cannot be canceled by "Sabotage" action cards.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['component']);
  });

  // "The Nekro Virus cannot place assimilator tokens on your components."
  // Checks: the commander has no waiver and changes no number.
  // Why nothing is validated here: the Valefar Assimilator tokens of the Nekro are not counted by the plan; what a
  // Nekro player copies is entered by hand as the technology it gains.
  test('leader:bastioncommander waives nothing and modifies nothing', () => {
    const { pack } = bench({ faction: 'bastion', expansions: ['pok', 'te'] });
    quote(pack, id, 'The Nekro Virus cannot place assimilator tokens on your components.');
    expect(effect(pack, id).waive).toBeUndefined();
    expect(effect(pack, id).modify).toBeUndefined();
  });
});
