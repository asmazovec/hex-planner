import { describe, expect, test } from 'vitest';
import type { Entry, UnitCounts } from '../../../types';
import { bench, componentAction, effect, expectStanding, expectWaived, HOME, NEAR, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './nomadhero';

/** The first action puts my command token in NEAR, where `units` arrive from the home system. */
const intoNear = (units: UnitCounts): Entry => tactical(NEAR, { moves: [{ from: HOME, units }] });
/** A later action moves `units` out of NEAR, which holds my token, into the target. */
const outOfNear = (units: UnitCounts): Entry => tactical(TARGET, { moves: [{ from: NEAR, units }] });
const nomad = (rounds: Entry[][], home: UnitCounts = { flagship: 1, cruiser: 1, infantry: 2 }) =>
  bench({ faction: 'nomad', expansions: ['pok'], units: { [HOME]: home }, start: { leaders: { [id]: 'unlocked' } }, rounds });

describe('leader:nomadhero Ahk-Syl Siven — Probability Matrix', () => {
  // "your flagship and units it transports can move out of systems that contain your command tokens during this game
  //  round."
  // Checks: after the hero's component action the flagship and the infantry it carries leave a system with my command
  // token; the warning is listed and lifted by the hero.
  // Why the check is redundant here: LRR 58.3.3 forbids moving a ship out of a system with one's own command token,
  // and the card says the flagship and what it transports can, this round.
  test('leader:nomadhero played, the flagship and its cargo move out of a system with my token: the warning is waived', () => {
    const move = outOfNear({ flagship: 1, infantry: 1 });
    const table = nomad([[intoNear({ flagship: 1, infantry: 1 }), componentAction(id), move]]);
    quote(table.pack, id, 'your flagship and units it transports can move out of systems that contain your command tokens during this game round');
    expectWaived(warningsOf(table, move), 'sourceActivated', id);
  });

  // LRR 58.3.3: a ship cannot move out of a system that contains its own faction's command token.
  // Checks: without the hero's action the same move stands warned of.
  // Why the check is NOT redundant here: the hero is an ACTION and was not played.
  test('leader:nomadhero not played, the flagship leaving a system with my token is warned of', () => {
    const move = outOfNear({ flagship: 1, infantry: 1 });
    expectStanding(warningsOf(nomad([[intoNear({ flagship: 1, infantry: 1 }), move]]), move), 'sourceActivated');
  });

  // "your flagship and units it transports ..."
  // Checks: a cruiser leaving with the flagship keeps the warning standing.
  // Why the check is NOT redundant here: the cruiser is a ship of its own, not a unit the flagship transports.
  test('leader:nomadhero another ship leaving with the flagship is still warned of', () => {
    const move = outOfNear({ flagship: 1, cruiser: 1 });
    expectStanding(warningsOf(nomad([[intoNear({ flagship: 1, cruiser: 1 }), componentAction(id), move]]), move), 'sourceActivated');
  });

  // "... during this game round. At the end of that game round, purge this card."
  // Checks: played in round 1, the hero does not cover the same move in round 2.
  // Why the check is NOT redundant here: the next round is outside the card's "this game round".
  test('leader:nomadhero played in round 1 no longer covers round 2', () => {
    const move = outOfNear({ flagship: 1, infantry: 1 });
    expectStanding(warningsOf(nomad([[componentAction(id)], [intoNear({ flagship: 1, infantry: 1 }), move]]), move), 'sourceActivated');
  });

  // Ruling (Nomad, Ahk-Syl Siven 2): "The Memoria may transport ground forces from systems containing one of the Nomad
  //  player's command tokens while the ability of Ahk-Syl Siven is active."
  // Checks: the flagship flies from the home system through NEAR, which holds my token, and picks up the infantry left
  // there; the pickup's warning is lifted by the hero.
  // Why the check is redundant here: the transport rule (58.4) forbids picking up in a system with my token, and the
  // flagship's units may move out of such a system this round.
  test('leader:nomadhero played, the flagship picks up ground forces in a system with my token', () => {
    const pickup = tactical(TARGET, { moves: [{ from: HOME, units: { flagship: 1 }, via: [NEAR] }, { from: NEAR, units: { infantry: 1 }, pickupOf: HOME }] });
    const table = nomad([[intoNear({ carrier: 1, infantry: 1 }), componentAction(id), pickup]], { flagship: 1, carrier: 1, infantry: 1 });
    expectWaived(warningsOf(table, pickup), 'sourceActivated', id);
  });

  // Checks: the same pickup without the hero is warned of.
  test('leader:nomadhero not played, the pickup in a system with my token is warned of', () => {
    const pickup = tactical(TARGET, { moves: [{ from: HOME, units: { flagship: 1 }, via: [NEAR] }, { from: NEAR, units: { infantry: 1 }, pickupOf: HOME }] });
    const table = nomad([[intoNear({ carrier: 1, infantry: 1 }), pickup]], { flagship: 1, carrier: 1, infantry: 1 });
    expectStanding(warningsOf(table, pickup), 'sourceActivated');
  });

  test('leader:nomadhero is a play effect that waives the move out of a system with my token for the round', () => {
    const { pack } = nomad([[]]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).waive?.map(w => [w.code, w.lasts])).toEqual([['sourceActivated', 'round']]);
  });
});
