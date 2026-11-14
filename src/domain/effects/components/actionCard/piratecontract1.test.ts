import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './piratecontract1';

const table = () => bench({ faction: 'sol', expansions: ['te'] });

describe('actionCard:piratecontract1 Pirate Contract', () => {
  // "Place 1 neutral destroyer in a non-home system that contains no non-neutral ships."
  // Checks: the card is a hint shown in the block of a component action, the window printed on it ("Action").
  // Why the check is redundant here: nothing is validated, as there is no check to lift: the plan keeps no neutral
  // units (no state holds them), so a neutral destroyer placed changes nothing it counts, and "contains no non-neutral
  // ships" speaks of units the plan does not place.
  test('actionCard:piratecontract1 is a hint of the component action', () => {
    const { pack } = table();
    quote(pack, id, 'Place 1 neutral destroyer in a non-home system');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['component']);
  });
});
