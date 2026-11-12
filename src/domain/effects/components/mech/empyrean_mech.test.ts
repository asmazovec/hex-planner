import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './empyrean_mech';

describe('mech:empyrean_mech Watcher', () => {
  // "You may remove this unit from a system that contains or is adjacent to another player's units to cancel an
  //  action card played by that player."
  // Checks: the mech is a reminder of the component step, where action cards are played as actions.
  // Why nothing is validated here: another player's action cards are not planned, so there is nothing to cancel; the
  // Watcher removed for it is taken off the board by hand (an adjustment).
  test('mech:empyrean_mech is a hint', () => {
    const { pack } = bench({ faction: 'empyrean', expansions: ['pok'] });
    quote(pack, id, 'to cancel an action card played by that player');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['component']);
  });
});
