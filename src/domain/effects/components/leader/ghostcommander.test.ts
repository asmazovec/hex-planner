import { describe, expect, test } from 'vitest';
import type { Entry, UnitCounts } from '../../../types';
import { bench, effect, endOf, expectStanding, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET, using, warningsOf } from '../kit';
import { id } from './ghostcommander';

/** Alpha wormholes in NEAR and FARTHER: a step between them goes through a wormhole (6.1). */
const MAP = { [HOME]: 'r-home', [NEAR]: 'r-alpha', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-alpha' };
const table = (move: Entry, units: Record<string, UnitCounts>, leaders: Record<string, 'unlocked'> = { [id]: 'unlocked' }) =>
  ({ move, ...bench({ faction: 'ghost', expansions: ['pok'], units, start: { leaders }, entries: [move], game: { map: MAP } }) });

describe('leader:ghostcommander Sai Seravus', () => {
  // "After your ships move: For each ship that has a capacity value and moved through 1 or more wormholes, you may place
  //  1 fighter from your reinforcements with that ship if you have unused capacity in the active system."
  // Checks: a carrier goes through the alpha wormholes from NEAR to FARTHER with the commander named; a fighter stands
  // with it at the end.
  // Why the check is redundant here: units come onto the board by production (67) or by an ability that says where;
  // the commander places the fighter itself, with no unit with Production and no payment.
  test('leader:ghostcommander places a fighter with a carrier that moved through a wormhole', () => {
    const t = table(using(tactical(FARTHER, { moves: [{ from: NEAR, units: { carrier: 1 } }] }), id), { [NEAR]: { carrier: 1 } });
    quote(t.pack, id, 'you may place 1 fighter from your reinforcements with that ship if you have unused capacity in the active system');
    expect(endOf(t).systems[FARTHER]).toEqual({ carrier: 1, fighter: 1 });
  });

  // "For each ship that has a capacity value and moved through 1 or more wormholes"
  // Checks: a carrier that moves from TARGET to FAR, neighbours with no wormhole, gets no fighter.
  // Why the check is NOT redundant here: the ship did not go through a wormhole.
  test('leader:ghostcommander a ship that moved through no wormhole gets no fighter', () => {
    const t = table(using(tactical(FAR, { moves: [{ from: TARGET, units: { carrier: 1 } }] }), id), { [TARGET]: { carrier: 1 } });
    expect(endOf(t).systems[FAR]).toEqual({ carrier: 1 });
  });

  // "... if you have unused capacity in the active system."
  // Checks: a carrier full of four infantry gets no fighter.
  // Why the check is NOT redundant here: the fighter needs a free place on board (Creuss notes, Sai Seravus 1).
  test('leader:ghostcommander a full carrier gets no fighter', () => {
    const t = table(using(tactical(FARTHER, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 4 } }] }), id), { [NEAR]: { carrier: 1, infantry: 4 } });
    expect(endOf(t).systems[FARTHER]?.fighter ?? 0).toBe(0);
  });

  // LRR 51.6: a commander is used once it is unlocked.
  // Checks: the commander named while still locked is warned of.
  // Why the check is NOT redundant here: the leader is not unlocked.
  test('leader:ghostcommander named while locked is warned of', () => {
    const move = using(tactical(FARTHER, { moves: [{ from: NEAR, units: { carrier: 1 } }] }), id);
    const t = table(move, { [NEAR]: { carrier: 1 } }, {});
    expectStanding(warningsOf(t, move), 'componentNotHeld');
  });

  // Checks: the commander places units when named by the entry: a `play`.
  test('leader:ghostcommander is a play effect', () => {
    expect(effect(table(tactical(NEAR), {}).pack, id).tier).toBe('play');
  });
});
