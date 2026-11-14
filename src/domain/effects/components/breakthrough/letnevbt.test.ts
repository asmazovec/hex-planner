import { describe, expect, test } from 'vitest';
import type { StartHoldings, UnitCounts } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, effect, expectNone, expectStanding, FARTHER, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './letnevbt';

/** The target is two systems from home: a dreadnought (move 1) falls one short, a cruiser (move 2) reaches it. */
const table = (move: Entry, units: Record<string, UnitCounts>, start: StartHoldings = { breakthrough: 'held' }, faction = 'letnev') =>
  ({ move, ...bench({ faction, expansions: ['te'], units, start, entries: [move] }) });
const together = () => tactical(TARGET, { moves: [{ from: HOME, units: { dreadnought: 1, cruiser: 1 }, via: [NEAR] }] });

describe('breakthrough:letnevbt Gravleash Maneuvers', () => {
  // "During movement, your non-fighter ships' move values are equal to the highest move value amongst moving ships in
  //  the system they started in."
  // Checks: a dreadnought (move 1) and a cruiser (move 2) leave home together for a system two away; the dreadnought
  // moves 2 like the cruiser and no route warning is made for it.
  // Why the default check does not apply: the route check (58.2) compares the route with the ship's own move value,
  // and the breakthrough sets that value to the highest of the ships moving from its system. It changes the number,
  // so this is a `modify` and nothing is listed as waived.
  test('breakthrough:letnevbt a slow ship moves as far as the fastest one leaving its system with it', () => {
    const letnev = table(together(), { [HOME]: { dreadnought: 1, cruiser: 1 } });
    quote(letnev.pack, id, "your non-fighter ships' move values are equal to the highest move value amongst moving ships in the system they started in");
    expectNone(warningsOf(letnev, letnev.move), 'speedShort');
  });

  // LRR 58.2: a ship moves no farther than its move value.
  // Checks: without the breakthrough the same flight leaves the dreadnought short by one.
  // Why the check is NOT redundant here: the breakthrough is not held (it must be gained), so nothing changes the move value.
  test('breakthrough:letnevbt not held, the slow ship is warned of', () => {
    const letnev = table(together(), { [HOME]: { dreadnought: 1, cruiser: 1 } }, {});
    expect(warningsOf(letnev, letnev.move).find(w => w.code === 'speedShort')?.params).toMatchObject({ unit: 'dreadnought', move: 1, steps: 2 });
  });

  // "... amongst moving ships in the system they started in."
  // Checks: the cruiser flies from another system; the dreadnought from home moves alone and stays short.
  // Why the check is NOT redundant here: only the ships that start in the same system share their move value.
  test('breakthrough:letnevbt a fast ship from another system lends nothing: the slow ship is warned of', () => {
    const move = tactical(TARGET, { moves: [{ from: HOME, units: { dreadnought: 1 }, via: [NEAR] }, { from: FARTHER, units: { cruiser: 1 } }] });
    const letnev = table(move, { [HOME]: { dreadnought: 1 }, [FARTHER]: { cruiser: 1 } });
    expectStanding(warningsOf(letnev, move), 'speedShort');
  });

  // "... equal to the highest move value amongst moving ships ..."
  // Checks: a cruiser left behind at home lends nothing; only ships that move count.
  // Why the check is NOT redundant here: the dreadnought is the only moving ship, so its own move value stands.
  test('breakthrough:letnevbt a ship that stays behind lends nothing: the slow ship is warned of', () => {
    const move = tactical(TARGET, { moves: [{ from: HOME, units: { dreadnought: 1 }, via: [NEAR] }] });
    const letnev = table(move, { [HOME]: { dreadnought: 1, cruiser: 1 } });
    expectStanding(warningsOf(letnev, move), 'speedShort');
  });

  // LRR 58.2, for a faction that has no such breakthrough.
  // Checks: the breakthrough is the Letnev's: another faction holding a breakthrough of its own is still warned of.
  test('breakthrough:letnevbt is the Letnev\'s own: another faction\'s slow ship is warned of', () => {
    const sol = table(together(), { [HOME]: { dreadnought: 1, cruiser: 1 } }, { breakthrough: 'held' }, 'sol');
    expectStanding(warningsOf(sol, sol.move), 'speedShort');
  });

  // "Before you roll dice during space combat, apply +X to the results of 1 of your ship's rolls ..."
  // Checks: the effect is passive (in force once the breakthrough is held), it changes the move value and lifts
  // nothing.
  // Why the combat sentence is not validated: it is a roll of dice the plan does not make.
  test('breakthrough:letnevbt is a passive effect that changes the move value and waives nothing', () => {
    const { pack } = table(together(), {});
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify?.speed).toBeTypeOf('function');
  });
});
