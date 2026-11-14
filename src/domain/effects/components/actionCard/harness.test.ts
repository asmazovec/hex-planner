import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { bench, effect, endOf, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET, using, warningsOf } from '../kit';
import { id } from './harness';

/** The test row with a nebula in the near system: an anomaly a cruiser from home can activate. */
const MAP = { [HOME]: 'r-home', [NEAR]: 'r-nebula', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };
const intoNebula = () => tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] });
const table = (entries: Entry[], hand: string[] = [id]) =>
  bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { cruiser: 1 } }, start: { hand }, entries, game: { map: MAP } });

describe('actionCard:harness Harness Energy', () => {
  // "Replenish your commodities."
  // Checks: the tactical action that activates the nebula uses the card; the Sol commodities, 0 at the start, are 4 at
  // the end: the value on their faction sheet.
  // Why it is counted: commodities are part of the plan (what a transaction can give); LRR 21.2 caps them at the
  // faction's value, and to replenish is to fill them to it.
  test('actionCard:harness fills the commodities up to the faction value', () => {
    const entry = using(intoNebula(), id);
    const sol = table([entry]);
    quote(sol.pack, id, 'Replenish your commodities.');
    expect(endOf(sol).commodities).toBe(sol.pack.factions.sol.commodities);
    expect(sol.pack.factions.sol.commodities).toBe(4);
  });

  // LRR 21.2: "The commodity value on a player's faction sheet indicates the maximum number of commodities that player
  //  can have."
  // Checks: the same action without the card leaves the commodities at 0.
  // Why nothing changes here: activating an anomaly replenishes nothing by itself.
  test('actionCard:harness not used, the commodities stay at 0', () => {
    expect(endOf(table([intoNebula()])).commodities).toBe(0);
  });

  // Ruling 1: "If a player has their maximum number of commodities, they may still play Harness Energy."
  // Checks: two actions that each replenish leave the commodities at the faction value, not above it.
  // Why the limit is NOT lifted here: the card replenishes up to the value of 21.2; it gives nothing beyond.
  test('actionCard:harness at the maximum already, the commodities stay at the faction value', () => {
    const first = using(intoNebula(), id);
    const second = using(tactical(TARGET, { moves: [{ from: NEAR, units: { cruiser: 1 } }] }), 'actionCard:harness');
    const sol = table([first, second], [id, id]);
    expect(endOf(sol).commodities).toBe(4);
  });

  // Checks: the card is discarded from the hand when it is used, and makes no warning of its own.
  // Why nothing is validated here: it is held and played as any action card is.
  test('actionCard:harness used from the hand leaves it with no warning', () => {
    const entry = using(intoNebula(), id);
    const sol = table([entry]);
    expect(warningsOf(sol, entry).filter(w => w.code === 'componentNotHeld')).toEqual([]);
    expect(endOf(sol).holdings.hand).not.toContain(id);
  });

  test.todo('actionCard:harness used in an action whose system is not an anomaly is warned of: the replay checks no window of an action card yet');

  test('actionCard:harness is a play effect that lifts no check', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
  });
});
