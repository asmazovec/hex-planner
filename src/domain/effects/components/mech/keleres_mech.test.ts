import { describe, expect, test } from 'vitest';
import type { Opponent, Warning } from '../../../types';
import { bench, effect, expectNone, expectStanding, HOME, NEAR, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './keleres_mech';

/** My carrier brings two infantry to the target and lands them on t1, where the opponent o1 stands with `ground`. */
const invade = (faction: string, rival: string, ground: Record<string, number>) => {
  const move = tactical(TARGET, {
    moves: [{ from: HOME, units: { carrier: 1, infantry: 2 }, via: [NEAR] }],
    landings: [{ planetId: 't1', units: { infantry: 2 } }],
  });
  const opponent: Opponent = { id: 'o1', faction: rival, vp: 0, seat: 2, color: 2 };
  return {
    move,
    ...bench({
      faction, expansions: ['pok'], units: { [HOME]: { carrier: 1, infantry: 2 } }, entries: [move],
      game: { opponents: [opponent], enemyGround: { t1: { o1: ground } }, planetControl: { t1: 'enemy' }, planetOwner: { t1: 'o1' } },
    }),
  };
};

/** The influence the landing is short of, over every warning of it. */
const influenceShort = (warnings: Warning[]): number =>
  warnings.filter(w => w.code === 'shortInfluence').reduce((total, w) => total + Number(w.params.needed ?? 0), 0);

describe('mech:keleres_mech Omniopiares', () => {
  // "Other players must spend 1 influence to commit ground forces to the planet that contains this unit."
  // Checks: I land on a planet that holds a Keleres mech; the plan records no influence spent on a landing, so the
  // influence owed is warned of at the invasion, as the six influence of the custodians token are (27.2).
  // Why the default check does not apply: the rules ask nothing to commit ground forces (49.2); this mech adds a cost
  // for everyone but its owner, so the check is made only while it stands on the planet.
  test('mech:keleres_mech landing on its planet owes 1 influence, warned of at the invasion', () => {
    const table = invade('letnev', 'keleresm', { mech: 1, infantry: 1 });
    quote(table.pack, id, 'Other players must spend 1 influence to commit ground forces to the planet that contains this unit.');
    const warnings = warningsOf(table, table.move);
    expectStanding(warnings, 'shortInfluence');
    expect(influenceShort(warnings)).toBe(1);
  });

  // Ruling (Keleres, Omniopiares 1): "If a planet contains multiple mechs, the invading player must pay one influence
  //  for each, as separate payments."
  // Checks: two Keleres mechs on the planet make 2 influence owed.
  // Why the number is right: each mech imposes its own cost.
  test('mech:keleres_mech two mechs on the planet owe 1 influence each', () => {
    const table = invade('letnev', 'keleresm', { mech: 2 });
    expect(influenceShort(warningsOf(table, table.move))).toBe(2);
  });

  // LRR 49.2: the active player may commit ground forces to land on planets of the active system.
  // Checks: the mech of another faction on the planet asks for no influence.
  // Why the check is NOT redundant here: the cost is printed on the Keleres mech alone.
  test('mech:keleres_mech another faction\'s mech asks for no influence', () => {
    const table = invade('letnev', 'sol', { mech: 1 });
    expectNone(warningsOf(table, table.move), 'shortInfluence');
  });

  // Checks: Keleres infantry alone on the planet ask for no influence.
  // Why the check is NOT redundant here: "the planet that contains this unit": only the mech imposes the cost.
  test('mech:keleres_mech Keleres infantry without a mech ask for no influence', () => {
    const table = invade('letnev', 'keleresm', { infantry: 2 });
    expectNone(warningsOf(table, table.move), 'shortInfluence');
  });

  test('mech:keleres_mech is a passive effect', () => {
    const { pack } = invade('letnev', 'keleresm', { mech: 1 });
    expect(effect(pack, id).tier).toBe('passive');
  });
});
