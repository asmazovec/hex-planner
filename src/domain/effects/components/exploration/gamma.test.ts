import { describe, expect, test } from 'vitest';
import { bench, effect, expectNone, FARTHER, HOME, quote, tactical, using, warningsOf } from '../kit';
import { id } from './gamma';

describe('exploration:gamma Gamma Relay', () => {
  // "Place a gamma wormhole token in this system. Then, purge this card."
  // Checks: the card is a reminder at the movement step and nothing else.
  // Why nothing is validated: the token only joins systems by a gamma wormhole (101), and the board of the plan keeps
  // no wormhole tokens; no check of the route depends on two systems being joined.
  test('exploration:gamma is a hint at the movement step', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    quote(pack, id, 'Place a gamma wormhole token in this system.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['movement']);
  });

  // LRR 101: "Systems that contain identical wormholes are adjacent."
  // Checks: a cruiser marked straight from the home system to a system four steps away, as a ship would go through
  // the gamma wormhole the card places, is a jump of one step; no speed warning is made, card or not.
  // Why the check is redundant here: the route counts the steps the player draws and never warns of a jump, so what
  // the token allows is already allowed; only the highlight of reachable systems would learn of it.
  test('exploration:gamma a move through the placed wormhole is drawn as a jump and warns of nothing', () => {
    const move = using(tactical(FARTHER, { moves: [{ from: HOME, units: { cruiser: 1 } }] }), id);
    const table = bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { cruiser: 1 } }, entries: [move] });
    const warnings = warningsOf(table, move);
    expectNone(warnings, 'speedShort');
    expectNone(warnings, 'componentNotHeld');
  });

  test.todo('exploration:gamma the gamma wormhole token in the explored system joins it to every gamma wormhole for the highlight of reach: the board keeps no wormhole tokens');
});
