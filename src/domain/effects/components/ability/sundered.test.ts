import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './sundered';

describe('ability:sundered Sundered', () => {
  // "You cannot use wormholes other than epsilon wormholes. Other players' units that move or are placed into your home
  //  system are destroyed."
  // Checks: the ability is a reminder in the block of movement.
  // Why nothing is validated: the ability restricts instead of lifting a check, and a route through an alpha or beta
  // wormhole would be entered as a jump, which the plan does not warn of; the units of other players destroyed in the
  // Rebellion's home system belong to their own entries.
  test('ability:sundered is a reminder of movement', () => {
    const { pack } = bench({ faction: 'crimson', expansions: ['te'] });
    quote(pack, id, 'You cannot use wormholes other than epsilon wormholes.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['movement']);
  });

  test.todo('ability:sundered a Rebellion route through an alpha or beta wormhole is warned of: the plan does not warn of a jump, and a component cannot add a restriction');
  test.todo('ability:sundered another player\'s units moved into the Rebellion home system are destroyed: the home lies off the board and the effect on another player\'s entry is not modelled');
});
