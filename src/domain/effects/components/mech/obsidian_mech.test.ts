import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './obsidian_mech';

describe('mech:obsidian_mech Viper Hollow', () => {
  // "If this unit was coexisting when this card flipped to this side, gain control of its planet"
  // Checks: the mech is a reminder of the component action that flips it, and lifts no check.
  // Why nothing is validated: the flip follows a change of faction and coexistence, neither of which the plan models;
  // the planet gained is entered by the player.
  test('mech:obsidian_mech is a reminder of the flip and waives nothing', () => {
    const { pack } = bench({ faction: 'obsidian', expansions: ['pok', 'te'] });
    quote(pack, id, 'gain control of its planet; the other player\'s units are now coexisting');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['component']);
  });

  test.todo('mech:obsidian_mech a coexisting Viper takes control of its planet on the flip: coexistence and the change of faction are not modelled');
});
