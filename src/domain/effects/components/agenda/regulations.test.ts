import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry } from '../../../types';
import { adjust, bench, effect, expectNone, expectStanding, HOME, NEAR, quote, statusTokens, tactical, warningsOf } from '../kit';
import { id } from './regulations';

/** The check pass 2 adds (the fleet pool against `fleetPoolMax`, step `status`): not in the app yet. */
const TOKENS = 'fleetPoolTokens' as AnyWarningCode;

const law = (): Entry => ({ ...adjust({}, 'agenda'), gains: [id] });
/** Round 1 passes the law when `passed`; round 2 puts `fleet` new tokens in the fleet pool of 3. */
function gaining(fleet: number, passed: boolean, faction = 'sol') {
  const status = statusTokens(2 - Math.min(fleet, 2), Math.min(fleet, 2), 0);
  return { status, ...bench({ faction, rounds: [passed ? [law()] : [], [status]] }) };
}

describe('agenda:regulations Fleet Regulations', () => {
  // "For: Each player cannot have more than 4 tokens in their fleet pool."
  // Checks: under the law the status phase puts two tokens in a fleet pool of 3; the fifth is warned of against 4.
  // Why the default does not apply: the rules put no limit on the fleet pool; the law sets one. It is a number (a
  // `modify` of a new point, `fleetPoolMax`), so the warning names 4 and nothing is listed as waived.
  test('agenda:regulations in play warns of a fifth token in the fleet pool', () => {
    const table = gaining(2, true);
    quote(table.pack, id, 'Each player cannot have more than 4 tokens in their fleet pool.');
    const warnings = warningsOf(table, table.status);
    expectStanding(warnings, TOKENS);
    expect(warnings.find(w => w.code === TOKENS)?.params).toMatchObject({ fleet: 5, limit: 4 });
  });

  // Checks: four tokens are within the law.
  test('agenda:regulations in play allows four tokens', () => {
    const table = gaining(1, true);
    expectNone(warningsOf(table, table.status), TOKENS);
  });

  // LRR 37: the fleet pool holds any number of tokens.
  // Checks: without the law five tokens are nothing to warn of.
  // Why the check is NOT redundant here: there is no limit without the law; the check must not fire for everyone.
  test('agenda:regulations not in play, five tokens in the fleet pool are fine', () => {
    const table = gaining(2, false);
    expectNone(warningsOf(table, table.status), TOKENS);
  });

  // Fleet Regulations note 1: "The effect of the Fleet Regulations law does not prevent the Letnev player from using
  //  their Armada faction ability. They may have up to six non-fighter ships in a system if they have four command
  //  tokens in their fleet pool."
  // Checks: under the law, the Letnev with four tokens move six cruisers into one system with no fleet pool warning.
  // Why the check is NOT redundant here: the law limits the tokens, not the ships a system holds (37.1); Armada adds
  // its 2 to the four tokens as always.
  test('agenda:regulations leaves Armada its two more ships', () => {
    const status = statusTokens(1, 1, 0);
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 6 } }] });
    const table = bench({ faction: 'letnev', units: { [HOME]: { cruiser: 6 } }, rounds: [[law()], [status], [move]] });
    expectNone(warningsOf(table, move), 'fleetPool');
  });

  test.todo('agenda:regulations "Against": each player places 1 token from reinforcements in the fleet pool: a one-off outcome, entered by the player');

  test('agenda:regulations is a passive effect that sets the most tokens of a fleet pool to 4', () => {
    const { pack } = bench({ faction: 'sol' });
    const modify = effect(pack, id).modify as Record<string, ((value: number, ctx: unknown) => number) | undefined> | undefined;
    expect(effect(pack, id).tier).toBe('passive');
    expect(modify?.fleetPoolMax?.(Number.POSITIVE_INFINITY, { faction: 'sol' })).toBe(4);
    expect(modify?.fleetLimit).toBeUndefined();
  });
});
