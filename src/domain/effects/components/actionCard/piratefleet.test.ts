import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './piratefleet';

const table = () => bench({ faction: 'sol', expansions: ['te'], start: { hand: [id] } });

describe('actionCard:piratefleet Pirate Fleet', () => {
  // "Spend 3 resources to place 1 neutral carrier, 1 neutral cruiser, 1 neutral destroyer, and 2 neutral fighters in
  // a non-home system that contains no non-neutral ships."
  // Checks: the card is a hint, shown at the step component; it waives nothing and changes no number.
  // Why nothing is validated here: Neutral units are not modelled (no neutral player on the board), and a component
  // action has no payment of resources yet, so neither the cost nor the ships can be counted.
  test('actionCard:piratefleet is a hint at component, with no waiver and no change of a number', () => {
    const { pack } = table();
    quote(pack, id, 'Spend 3 resources to place 1 neutral carrier');
    const found = effect(pack, id);
    expect(found.tier).toBe('hint');
    expect(found.hintAt).toEqual(['component']);
    expect(found.modify).toBeUndefined();
  });

  test.todo('actionCard:piratefleet spending 3 resources and placing the neutral ships: a component action has no payment, and there is no neutral player');
});
