import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './seize';

const table = () => bench({ faction: 'sol', expansions: ['pok'], start: { hand: [id] } });

describe('actionCard:seize Seize Artifact', () => {
  // "Choose 1 of your neighbors that has 1 or more relic fragments. That player must give you 1 relic fragment of
  // your choice."
  // Checks: the card is a hint, shown at the step component; it waives nothing and changes no number.
  // Why nothing is validated here: A relic fragment is an exploration card, and no player's holdings keep exploration
  // cards (as LRR 94.3 is tested: relic fragments in a transaction are not modelled), so there is nothing to move
  // from the neighbour to me.
  test('actionCard:seize is a hint at component, with no waiver and no change of a number', () => {
    const { pack } = table();
    quote(pack, id, 'That player must give you 1 relic fragment of your choice.');
    const found = effect(pack, id);
    expect(found.tier).toBe('hint');
    expect(found.hintAt).toEqual(['component']);
    expect(found.waive).toBeUndefined();
    expect(found.modify).toBeUndefined();
  });

  test.todo('actionCard:seize taking a relic fragment from a neighbour: relic fragments are not held by anyone in the replay');
});
