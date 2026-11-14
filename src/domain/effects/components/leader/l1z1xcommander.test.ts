import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './l1z1xcommander';

describe('leader:l1z1xcommander 2RAM', () => {
  // "Units that have PLANETARY SHIELD do not prevent you from using BOMBARDMENT"
  // Checks: the component is a hint shown in the block of the invasion step, and lifts nothing.
  // Why nothing is validated here: PLANETARY SHIELD and BOMBARDMENT are unit abilities of combat (15, 64); the plan does not resolve them, so nothing it validates depends on them.
  test('leader:l1z1xcommander is a hint at the invasion step and waives nothing', () => {
    const { pack } = bench({ faction: 'l1z1x', expansions: ['pok'] });
    quote(pack, id, "Units that have PLANETARY SHIELD do not prevent you from using BOMBARDMENT");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['invasion']);
  });
});
