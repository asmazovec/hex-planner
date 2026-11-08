/** LRR 15 Bombardment. Source: tirules2 rules-reference/bombardment.md. Dice are not rolled: losses are entered by hand. */
import { describe, expect, test } from 'vitest';
import { unitStats } from '../../unitStats';
import { FACTION, rulesPack } from '../kit';

const pack = rulesPack();

describe('LRR 15 Bombardment', () => {
  test.todo('15.1: the active player picks a planet for each bombarding unit and rolls — not modelled: dice are not rolled');

  test('15.1.1: bombardment is given with the unit\'s attributes: dreadnoughts and war suns have it, carriers do not', () => {
    expect(unitStats(FACTION, 'dreadnought', false, pack)?.bombard).toBeDefined();
    expect(unitStats(FACTION, 'dreadnought', true, pack)?.bombard).toBeDefined();
    expect(unitStats(FACTION, 'warsun', false, pack)?.bombard).toBeDefined();
    expect(unitStats(FACTION, 'carrier', false, pack)?.bombard).toBeUndefined();
  });

  test('15.1.2: bombardment X (xY) hits on X or more with Y dice, one die without a Y: a dreadnought has 5, a war sun 3 (x3)', () => {
    expect(unitStats(FACTION, 'dreadnought', false, pack)?.bombard).toEqual({ hit: 5, dice: 1 });
    expect(unitStats(FACTION, 'warsun', false, pack)?.bombard).toEqual({ hit: 3, dice: 3 });
  });

  test.todo('15.1.3: effects on combat rolls do not touch bombardment rolls — not modelled: dice are not rolled');
  test.todo('15.1.4: several planets may be bombarded, each unit\'s planet declared before rolling — not modelled: dice are not rolled');
  test.todo('15.1.5: L1Z1X\'s Harrow spares their own ground forces — not modelled: faction abilities are shown only');
  test.todo('15.1.6: a planet with a Planetary Shield unit cannot be bombarded — not modelled: bombardment is not, and PDS carry no stats');
  test.todo('15.2: the planet\'s controller destroys a ground force per hit — not modelled: other players\' losses in an action are not entered');
  test.todo('15.2.1: hits beyond the ground forces have no effect — not modelled: hits are not counted');
  test.todo('15 note 1: bombardment is outside combat, and wins no combat objective — not modelled: combat is not');
  test.todo('15 note 2: mechs may sustain damage against bombardment — not modelled: hits are not counted');
  test.todo('15 note 3: only the active player bombards — not modelled: bombardment is not');
  test.todo('15 note 4: points to the L1Z1X notes — nothing to test');
  test.todo('15 note 5: the 0 of a d10 is a 10 — not modelled: dice are not rolled');
  test.todo('15 note 6: all of a unit\'s dice, extra dice included, go at one planet — not modelled: dice are not rolled');
  test.todo('15 note 7: bombarding is optional, but then every unit in the system bombards — not modelled: bombardment is not');
});
