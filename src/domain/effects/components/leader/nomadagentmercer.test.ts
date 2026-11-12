import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './nomadagentmercer';

describe('leader:nomadagentmercer Field Marshal Mercer', () => {
  // "You may exhaust this card to allow that player to remove up to 2 of their ground forces from the game board and
  //  place them on planets they control in the active system."
  // Checks: the agent is a reminder with no step and lifts nothing.
  // Why nothing is validated here: the units moved are the turn player's, placed at the end of their turn by another
  // player's agent; the plan has no entry for that, so they are moved by hand.
  test('leader:nomadagentmercer is a hint with no step', () => {
    const { pack } = bench({ faction: 'nomad', expansions: ['pok'] });
    quote(pack, id, 'remove up to 2 of their ground forces from the game board');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });

  test.todo('leader:nomadagentmercer up to 2 ground forces placed on planets of the active system: an entry that uses a component names no units or planets');
});
