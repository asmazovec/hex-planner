import { describe, expect, test } from 'vitest';
import { adjust, bench, effect, expectNone, HOME, NEAR, quote, tactical, warningsOf } from '../kit';
import { id } from './edict';

describe('ability:edict Edict', () => {
  // "When you win a combat: Place 1 command token from your opponent's reinforcements in your fleet pool if it does
  //  not already contain 1 of that player's tokens."
  // Checks: the ability is a reminder at the combat.
  // Why nothing is validated here: combats are not simulated, and other players' tokens on the Mahact command sheet
  // are not tracked; a token won is entered by hand into the fleet pool.
  test('ability:edict is a hint shown at the combat', () => {
    const { pack } = bench({ faction: 'mahact', expansions: ['pok'] });
    quote(pack, id, 'When you win a combat: Place 1 command token from your opponent\'s reinforcements in your fleet pool');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat']);
  });

  // "Other player's tokens in your fleet pool increase your fleet limit"
  // Checks: a token won and added to the fleet pool by hand raises the limit as any token does: four ships stand in a
  // system with the fleet pool of 3 plus 1.
  // Why nothing more is needed: the fleet limit counts the tokens of the fleet pool (37.1), whoever's they are.
  test('ability:edict a token added to the fleet pool by hand raises the fleet limit', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 4 } }] });
    const table = bench({ faction: 'mahact', expansions: ['pok'], units: { [HOME]: { cruiser: 4 } }, entries: [adjust({ fleet: 1 }), move] });
    quote(table.pack, id, 'Other player\'s tokens in your fleet pool increase your fleet limit but cannot be redistributed.');
    expectNone(warningsOf(table, move), 'fleetPool');
  });

  test.todo('ability:edict other players\' tokens in the fleet pool cannot be redistributed: whose tokens are in a pool is not tracked');
});
