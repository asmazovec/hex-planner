import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './exchangeprogram';

const table = () => bench({ faction: 'sol', expansions: ['te'], start: { hand: [id] } });

describe('actionCard:exchangeprogram Exchange Program', () => {
  // "Choose another player. You and that player may agree to place 1 infantry from each of your reinforcements into
  // coexistence on a planet the other player controls that contains their ground forces; if no agreement is reached,
  // you each discard 1 token from your fleet pool."
  // Checks: the card is a hint, shown at the step component; it waives nothing and changes no number.
  // Why nothing is validated here: The outcome is an agreement with another player, unknown when planning, and
  // coexistence of ground forces on one planet is not modelled; the token discarded from the fleet pool is an
  // adjustment entered by hand.
  test('actionCard:exchangeprogram is a hint at component, with no waiver and no change of a number', () => {
    const { pack } = table();
    quote(pack, id, 'You and that player may agree to place 1 infantry from each of your reinforcements into coexistence');
    const found = effect(pack, id);
    expect(found.tier).toBe('hint');
    expect(found.hintAt).toEqual(['component']);
    expect(found.waive).toBeUndefined();
    expect(found.modify).toBeUndefined();
  });

  test.todo('actionCard:exchangeprogram coexistence of two players\' infantry on one planet: not modelled');
});
