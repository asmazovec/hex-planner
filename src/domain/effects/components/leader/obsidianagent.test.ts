import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './obsidianagent';

describe('leader:obsidianagent Vos Hollow', () => {
  // "When a player's ship is destroyed during any combat: You may exhaust this card; if you do, that player's opponent
  //  must destroy 1 of their ships of the same type in the active system."
  // Checks: the agent is a reminder of the combat and lifts no check.
  // Why nothing is validated: the plan simulates no combat; the ships destroyed are entered as losses by the player.
  test('leader:obsidianagent is a reminder of the combat and waives nothing', () => {
    const { pack } = bench({ faction: 'obsidian', expansions: ['pok', 'te'] });
    quote(pack, id, 'must destroy 1 of their ships of the same type in the active system');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat']);
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
