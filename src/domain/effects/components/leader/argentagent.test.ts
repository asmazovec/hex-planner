import { describe, expect, test } from 'vitest';
import type { Entry, UnitCounts } from '../../../types';
import { bench, effect, endOf, expectStanding, expectWaived, FAR, FARTHER, HOME, NEAR, quote, TARGET, tactical, using, warningsOf } from '../kit';
import { id } from './argentagent';

/** The test row with the planets t1 and t2 in the system next to home: `near` puts them there, otherwise two systems away. */
const map = (near: boolean) => ({
  [HOME]: 'r-home', [NEAR]: near ? 'r-target' : 'r-empty', [TARGET]: near ? 'r-empty' : 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty',
});

/** Infantry produced by my space dock on h1 in the home system, placed on the planets of `ground`; t1 is mine too. */
const produce = (ground: Record<string, UnitCounts>, near = true, uses: string[] = [id], leaders: Record<string, 'unlocked' | 'exhausted'> = { [id]: 'unlocked' }) => {
  const units = Object.values(ground).reduce<UnitCounts>((sum, u) => ({ infantry: (sum.infantry ?? 0) + (u.infantry ?? 0) }), {});
  const move: Entry = using(tactical(HOME, { production: units, productionGround: ground }), ...uses);
  return {
    move, ...bench({
      faction: 'argent', expansions: ['pok'], start: { leaders }, entries: [move],
      game: { docks: ['h1'], planetControl: { t1: 'me' }, map: map(near) },
    }),
  };
};

describe('leader:argentagent Trilossa Aun Mirik', () => {
  // "When a player produces ground forces in a system: You may exhaust this card: that player may place those units on
  //  any planets they control in that system and any adjacent systems."
  // Checks: the agent named in «Used» of the production lets an infantry go on t1, a planet I control in the system
  // next to the active one; the placement warning is listed and lifted by the agent, and the infantry stands on t1.
  // Why the check is redundant here: 68.3 puts ground forces on the planets of the producing units; the agent opens
  // every planet the producer controls in that system and the adjacent ones.
  test.fails('leader:argentagent lets produced infantry go on a planet I control in an adjacent system', () => {
    const table = produce({ t1: { infantry: 1 } });
    quote(table.pack, id, 'place those units on any planets they control in that system and any adjacent systems');
    expectWaived(warningsOf(table, table.move), 'productionPlace', id);
    expect(endOf(table).ground.t1).toEqual({ infantry: 1 });
  });

  // Checks: the same with h2, a planet of the active system without a space dock.
  // Why the check is redundant here: "any planets they control in that system".
  test.fails('leader:argentagent lets produced infantry go on a planet without a dock in the same system', () => {
    const table = produce({ h2: { infantry: 1 } });
    expectWaived(warningsOf(table, table.move), 'productionPlace', id);
  });

  // LRR 68.3: "When a player produces ground forces, that player must place those units on planets that contain a unit
  //  that used its Production ability."
  // Checks: without the agent the infantry on t1 is warned of, and stands there all the same.
  // Why the check is NOT redundant here: the agent is used ("you may exhaust this card"), not passive.
  test('leader:argentagent not used leaves the placement warning standing', () => {
    const table = produce({ t1: { infantry: 1 } }, true, []);
    expectStanding(warningsOf(table, table.move), 'productionPlace');
  });

  // Checks: t1 two systems away from the active system is beyond the agent's reach.
  // Why the check is NOT redundant here: the agent covers "that system and any adjacent systems" only.
  test('leader:argentagent does not reach a planet two systems away', () => {
    const table = produce({ t1: { infantry: 1 } }, false);
    expectStanding(warningsOf(table, table.move), 'productionPlace');
  });

  // LRR 51.4: an agent is exhausted by resolving its ability and readies in the status phase.
  // Checks: used while exhausted, the agent is warned of.
  test('leader:argentagent exhausted is warned of when used', () => {
    const table = produce({ t1: { infantry: 1 } }, true, [id], { [id]: 'exhausted' });
    expectStanding(warningsOf(table, table.move), 'componentExhausted');
  });

  test.fails('leader:argentagent is a play effect that waives the placement of produced ground forces', () => {
    const { pack } = produce({ t1: { infantry: 1 } });
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual(['productionPlace']);
  });

  test.todo('leader:argentagent used on another player\'s production: a waiver is asked of the owner of the entry, so my agent would have to be named in the rival\'s entry');
});
