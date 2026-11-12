import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './devour';

describe('ability:devour Devour', () => {
  // "Capture your opponent's non-structure units that are destroyed during combat."
  // Checks: the ability is a reminder of the combat and the invasion.
  // Why nothing is validated here: the losses of other players are not part of an action in the plan, and captured
  // units are not kept, so there is nothing to capture and no check it lifts.
  test('ability:devour is a hint of the combat and the invasion', () => {
    const { pack } = bench({ faction: 'cabal', expansions: ['pok'] });
    quote(pack, id, 'Capture your opponent\'s non-structure units that are destroyed during combat');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat', 'invasion']);
  });

  test.todo('ability:devour captures the opponent\'s units destroyed in combat: captured units are not modelled');
});
