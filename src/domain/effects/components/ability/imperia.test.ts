import { describe, test } from 'vitest';
import type { LeaderState } from '../../../types';
import type { Player } from '../../../players';
import { bench, expectStanding, expectWaived, NEAR, quote, tactical, using, warningsOf } from '../kit';
import { id } from './imperia';

const SOL: Player = { id: 'sol1', faction: 'sol', vp: 0, seat: 2, color: 2 };
const COMMANDER = 'leader:solcommander';

/** My action names a leader of the Sol player in «Used»; the Sol player's leaders are `theirs`. */
const table = (faction: string, used: string, theirs: Record<string, LeaderState> = { [COMMANDER]: 'unlocked' }) => {
  const move = using(tactical(NEAR), used);
  return { move, ...bench({ faction, expansions: ['pok'], entries: [move], game: { opponents: [SOL], start: { me: {}, opponents: { sol1: { leaders: theirs } } } } }) };
};

describe('ability:imperia Imperia', () => {
  // "While another player's command token is in your fleet pool, you can use the ability of that player's commander,
  //  if it is unlocked."
  // Checks: the Mahact player uses Claire Gibson, the Sol commander, unlocked by the Sol player; the warning that the
  // component is not held is listed and lifted by Imperia.
  // Why the check is redundant here: LRR 22.1 lets a player play their own components only, and the ability lets
  // the Mahact player use another player's commander.
  test('ability:imperia lets the Mahact player use another player\'s unlocked commander: the warning is waived', () => {
    const mahact = table('mahact', COMMANDER);
    quote(mahact.pack, id, 'you can use the ability of that player\'s commander, if it is unlocked');
    expectWaived(warningsOf(mahact, mahact.move), 'componentNotHeld', id);
  });

  // "... if it is unlocked."
  // Checks: the Sol commander is still locked: the warning stands.
  // Why the check is NOT redundant here: the ability reaches only a commander its owner has unlocked.
  test('ability:imperia does not reach a commander its owner has not unlocked', () => {
    const mahact = table('mahact', COMMANDER, {});
    expectStanding(warningsOf(mahact, mahact.move), 'componentNotHeld');
  });

  // "... the ability of that player's commander ..."
  // Checks: the Sol agent is not a commander: the warning stands.
  // Why the check is NOT redundant here: only commanders are named by the ability.
  test('ability:imperia does not reach another player\'s agent', () => {
    const mahact = table('mahact', 'leader:solagent', { 'leader:solagent': 'unlocked' });
    expectStanding(warningsOf(mahact, mahact.move), 'componentNotHeld');
  });

  // LRR 22.1: a player plays the components they hold.
  // Checks: another faction using the Sol commander is warned of.
  // Why the check is NOT redundant here: Imperia is printed on the Mahact sheet.
  test('ability:imperia is the Mahact\'s own: another faction using a rival\'s commander is warned', () => {
    const letnev = table('letnev', COMMANDER);
    expectStanding(warningsOf(letnev, letnev.move), 'componentNotHeld');
  });

  test.todo('ability:imperia only while that player\'s command token is in my fleet pool: whose tokens are in a pool is not tracked');
});
