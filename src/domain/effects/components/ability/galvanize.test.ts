import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './galvanize';

const table = () => bench({ faction: 'bastion', expansions: ['pok', 'te'] });

describe('ability:galvanize Galvanize', () => {
  // "Galvanized units roll 1 additional die for combat rolls and unit abilities."
  // Checks: the ability is a reminder of the battle in space and of the invasion.
  // Why nothing is validated here: the plan rolls no dice and keeps no galvanize tokens; no check of the replay
  // counts combat dice, so there is nothing to change and nothing to lift.
  test('ability:galvanize is a hint of the combat and the invasion steps', () => {
    const { pack } = table();
    quote(pack, id, 'Galvanized units roll 1 additional die for combat rolls and unit abilities.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat', 'invasion']);
  });

  // "When a game effect instructs a player to galvanize a unit: they place a galvanize token beneath it if it does
  //  not have one."
  // Checks: the token is not a unit and no limit of the plan counts it; the ability lifts no check.
  // Why nothing is validated here: a galvanize token is no unit, no command token and no component the plan holds.
  test('ability:galvanize waives nothing and modifies nothing', () => {
    const { pack } = table();
    quote(pack, id, 'they place a galvanize token beneath it if it does not have one');
    expect(effect(pack, id).modify).toBeUndefined();
  });
});
