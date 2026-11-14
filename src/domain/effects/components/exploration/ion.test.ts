import { describe, expect, test } from 'vitest';
import { bench, effect, expectNone, FARTHER, HOME, quote, tactical, using, warningsOf } from '../kit';
import { id } from './ion';

describe('exploration:ion Ion Storm', () => {
  // "Place the ion storm token in this system with either side faceup."
  // Checks: the card is a reminder at the movement step and nothing else.
  // Why nothing is validated: the token is an alpha or a beta wormhole the board of the plan does not keep, and the
  // side it shows depends on which wormhole a ship chose (exploration cards, Ion Storm 2-3), which no entry records.
  test('exploration:ion is a hint at the movement step', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    quote(pack, id, 'flip the ion storm token to its opposing side');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['movement']);
  });

  // LRR 101: "Systems that contain identical wormholes are adjacent."
  // Checks: a move through the storm's wormhole, drawn straight to a far system, is a jump of one step and warns of
  // nothing.
  // Why the check is redundant here: a jump is never warned of, so the wormhole the token adds breaks no check.
  test('exploration:ion a move through the storm is drawn as a jump and warns of nothing', () => {
    const move = using(tactical(FARTHER, { moves: [{ from: HOME, units: { destroyer: 1 } }] }), id);
    const table = bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { destroyer: 1 } }, entries: [move] });
    expectNone(warningsOf(table, move), 'speedShort');
  });

  test.todo('exploration:ion the storm token as an alpha or beta wormhole of the explored system, flipped after a move through it: the board keeps no wormhole tokens and no entry records which wormhole a ship used');
});
