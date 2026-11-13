import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { bench, effect, endOf, expectStanding, expectWaived, NEAR, quote, TARGET, tactical, using, warningsOf } from '../kit';
import { id } from './crashlanding';

/** A carrier with `infantry` on board flies into the target, is lost in the battle, and one infantry lands on t1. */
const crash = (infantry = 1, landed = 1) => tactical(TARGET, {
  moves: [{ from: NEAR, units: { carrier: 1, infantry } }], losses: { carrier: 1 },
  landings: [{ planetId: 't1', units: { infantry: landed } }],
});
const table = (move: Entry, hand = [id]) =>
  bench({ faction: 'sol', expansions: ['te'], units: { [NEAR]: { carrier: 1, infantry: 2 } }, start: { hand }, entries: [move] });

describe('actionCard:crashlanding Crash Landing', () => {
  // "Place 1 of your ground forces from the space area of the active system onto a planet in that system other than
  //  Mecatol Rex"
  // Checks: the carrier is lost in the battle, the card is played in «Used», and its infantry lands on t1: the warning
  // that ground forces stand in space without a ship to hold them is listed and lifted by the card.
  // Why the check is redundant here: LRR 16.3 removes ground forces in a space area beyond the capacity there, so with
  // the last ship gone the infantry could not stay to land; the card places that one ground force on the planet.
  test('actionCard:crashlanding lets one ground force land after the last ship is lost', () => {
    const move = using(crash(), id);
    const card = table(move);
    quote(card.pack, id, 'Place 1 of your ground forces from the space area of the active system onto a planet');
    expectWaived(warningsOf(card, move), 'capacitySystem', id);
    expect(endOf(card).ground.t1).toEqual({ infantry: 1 });
  });

  // LRR 16.3: the ground forces in a space area beyond the capacity of the ships there are removed.
  // Checks: the same landing without the card is warned of, and the infantry lands all the same, as the plan forbids
  // nothing.
  // Why the check is NOT redundant here: without the card nothing holds the infantry once the carrier is gone.
  test('actionCard:crashlanding not played, the landing after the last ship is lost is warned of', () => {
    const move = crash();
    const plain = table(move);
    expectStanding(warningsOf(plain, move), 'capacitySystem');
    expect(endOf(plain).ground.t1).toEqual({ infantry: 1 });
  });

  // "Place 1 of your ground forces ..."
  // Checks: two infantry landed after the carrier is lost leave the warning standing, the card played or not.
  // Why the check is NOT redundant here: the card places one ground force, not two.
  test('actionCard:crashlanding does not cover a second ground force', () => {
    const move = using(crash(2, 2), id);
    expectStanding(warningsOf(table(move), move), 'capacitySystem');
  });

  // Checks: the card's reminder stands in the combat block, its window ("When your last ship in the active system is
  // destroyed") read from the data.
  // Why nothing more is validated: the plan fights no battle, and coexistence on a planet with other players' units
  // is not modelled.
  test('actionCard:crashlanding is shown in the combat step', () => {
    const { pack } = table(crash());
    expect(effect(pack, id).hintAt).toEqual(['combat']);
  });

  test.todo('actionCard:crashlanding "other than Mecatol Rex" and "into coexistence": the plan models neither');

  test('actionCard:crashlanding waives the ground forces left in space for the entry that plays it', () => {
    const { pack } = table(crash());
    expect(effect(pack, id).permit?.map(w => [w.code, w.lasts])).toEqual([['capacitySystem', undefined]]);
  });
});
