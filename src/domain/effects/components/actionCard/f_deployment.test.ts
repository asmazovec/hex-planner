import { describe, expect, test } from 'vitest';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, quote, warningsOf } from '../kit';
import placeNotControlled from '../../../rules/codes/placeNotControlled';
import { id } from './f_deployment';

/**
 * The code pass 2 declares (src/domain/rules/codes/placeNotControlled.ts, made by placeOnPlanet): units are placed only on a planet
 * the player controls.
 */
const TARGET_CODE = placeNotControlled.code;

const deploy = (planet: string) => componentAction(id, { choices: { planet } } as never);
const table = (play = deploy('h1'), hand: string[] = [id]) => ({ play, ...bench({ faction: 'sol', start: { hand }, entries: [play] }) });

describe('actionCard:f_deployment Frontline Deployment', () => {
  // "Place 3 infantry from your reinforcements on 1 planet you control."
  // Checks: played on h1, a planet I control, three infantry stand on it and nothing is warned of.
  // Why nothing is waived: units placed by an ability break no rule; the board changes.
  test('actionCard:f_deployment places 3 infantry on the chosen planet', () => {
    const table1 = table();
    quote(table1.pack, id, 'Place 3 infantry from your reinforcements on 1 planet you control.');
    expect(endOf(table1).ground.h1).toEqual({ infantry: 3 });
    expectNone(warningsOf(table1, table1.play), TARGET_CODE);
  });

  // "... on 1 planet you control."
  // Checks: a planet I do not control (t1) is warned of; the infantry are placed all the same.
  // Why the check is NOT redundant here: the card places on a planet the player controls only.
  test('actionCard:f_deployment on a planet I do not control is warned of, and still placed', () => {
    const away = table(deploy('t1'));
    expectStanding(warningsOf(away, away.play), TARGET_CODE);
    expect(endOf(away).ground.t1).toEqual({ infantry: 3 });
  });

  // LRR 22.1 / 2.7: an action card is played from the hand.
  // Checks: without the card in hand the play is warned of.
  // Why the check is NOT redundant here: the card is not held.
  test('actionCard:f_deployment played without being in hand is warned of', () => {
    const none = table(deploy('h1'), []);
    expectStanding(warningsOf(none, none.play), 'componentNotHeld');
  });

  test('actionCard:f_deployment is a play effect', () => {
    const { pack } = table();
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
  });
});
