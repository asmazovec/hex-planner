import { describe, expect, test } from 'vitest';
import type { Entry, UnitCounts } from '../../../types';
import { bench, effect, endOf, FAR, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './ng';

const RIVAL = 'o1';

/**
 * A rival's cruiser starts in the target system; my cruiser stands in `mine`. The rival's entries are `entries`;
 * I hold Neuroglaive unless `held` is false.
 */
const table = (entries: Entry[], mine: string = NEAR, held = true, units: UnitCounts = { cruiser: 1 }) => bench({
  faction: 'naalu', units: { [mine]: units }, start: { technologies: held ? [id] : [] }, entries,
  game: { opponents: [{ id: RIVAL, faction: 'rules-tester', vp: 0, seat: 2, color: 2 }], enemyUnits: { [TARGET]: { [RIVAL]: { cruiser: 1 } } } },
});
/** The rival's tactical action: its cruiser flies from the target into `systemId`. */
const rivalMove = (systemId: string) => tactical(systemId, { moves: [{ from: TARGET, units: { cruiser: 1 } }] }, { owner: RIVAL });
const rivalFleet = (game: ReturnType<typeof table>) => endOf(game).rivals?.[RIVAL]?.fleet;

describe('technology:ng Neuroglaive', () => {
  // "After another player activates a system that contains 1 or more of your ships, that player removes 1 token from
  //  their fleet pool and returns it to their reinforcements."
  // Checks: the rival activates the system where my cruiser stands; its fleet pool goes from 3 to 2.
  // Why the default count does not apply: an activation spends a tactic token only (LRR 5.1); the card takes a fleet
  // token from the activating player as well.
  test.fails('technology:ng a rival activating a system with my ships loses a fleet token', () => {
    const game = table([rivalMove(NEAR)]);
    quote(game.pack, id, 'that player removes 1 token from their fleet pool and returns it to their reinforcements');
    expect(rivalFleet(game)).toBe(2);
  });

  // Checks: without the card the same activation leaves the rival's fleet pool at 3.
  // Why the check is NOT redundant here: the loss is the card's, not the rules'.
  test('technology:ng not held: the rival keeps its fleet pool', () => {
    expect(rivalFleet(table([rivalMove(NEAR)], NEAR, false))).toBe(3);
  });

  // "... activates a system that contains 1 or more of your ships ..."
  // Checks: the rival activates a system without my ships; nothing is taken.
  // Why the check is NOT redundant here: the card answers only an activation where my ships stand.
  test('technology:ng a system without my ships costs the rival nothing', () => {
    expect(rivalFleet(table([rivalMove(FAR)]))).toBe(3);
  });

  // Checks: ground forces alone in a system are not ships: activating it costs the rival nothing.
  // Why the check is NOT redundant here: the card speaks of ships.
  test('technology:ng ground forces in space are not ships: the rival keeps its fleet pool', () => {
    expect(rivalFleet(table([rivalMove(NEAR)], NEAR, true, { infantry: 1 }))).toBe(3);
  });

  // "After another player activates ..."
  // Checks: my own activation of a system where my ships stand leaves my fleet pool at 3.
  // Why the check is NOT redundant here: the card speaks of another player.
  test('technology:ng my own activation costs me nothing', () => {
    const mine = tactical(NEAR);
    expect(endOf(table([mine])).fleet).toBe(3);
  });

  test.fails('technology:ng is a passive effect', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('passive');
  });
});
