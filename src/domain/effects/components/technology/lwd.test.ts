import { describe, expect, test } from 'vitest';
import { bench, effect, expectNone, expectStanding, expectWaived, FAR, FARTHER, HOME, NEAR, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './lwd';

/** Another player's cruiser stands in the system next to home. */
const RIVAL_SHIPS = { [NEAR]: { rival: { cruiser: 1 } } };

/** A cruiser flies from home into the target through the system next to it, which is `near`. */
const flight = (options: { near?: string; technologies?: string[]; ships?: boolean } = {}) => {
  const move = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
  const table = bench({
    faction: 'sol', units: { [HOME]: { cruiser: 1 } }, start: { technologies: options.technologies ?? [id] }, entries: [move],
    game: {
      map: { [HOME]: 'r-home', [NEAR]: options.near ?? 'r-empty', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' },
      enemyUnits: options.ships === false ? {} : RIVAL_SHIPS,
    },
  });
  return { move, ...table };
};

describe('technology:lwd Light/Wave Deflector', () => {
  // "Your ships can move through systems that contain other players' ships."
  // Checks: a cruiser passes a system holding another player's cruiser; the route warning is listed and lifted.
  // Why the check is redundant here: LRR 58.3.2 says "The ship cannot move through a system that contains ships that
  // are controlled by another player", and the card says this player's ships can.
  test.fails('technology:lwd lets a ship move through other players\' ships: the route warning is waived', () => {
    const table = flight();
    quote(table.pack, id, 'Your ships can move through systems that contain other players\' ships.');
    expectWaived(warningsOf(table, table.move), 'routeBlocked', id);
  });

  // LRR 58.3.2, as above.
  // Checks: without the card the same route is warned of.
  // Why the check is NOT redundant here: nothing this player holds lets ships pass other players' ships.
  test('technology:lwd not held: the route through other players\' ships stands', () => {
    const table = flight({ technologies: [] });
    expectStanding(warningsOf(table, table.move), 'routeBlocked');
  });

  // LRR 59.1: "A ship can only move into a nebula if it is the active system."
  // Checks: a nebula on the way, empty or holding another player's ships, still blocks.
  // Why the check is NOT redundant here: the card speaks of other players' ships, not of anomalies.
  test('technology:lwd does not open a nebula on the way', () => {
    for (const ships of [false, true]) {
      const table = flight({ near: 'r-nebula', ships });
      expectStanding(warningsOf(table, table.move), 'routeBlocked');
    }
  });

  // LRR 11.1: "A ship cannot move through or into an asteroid field."
  // Checks: an asteroid field on the way still blocks.
  // Why the check is NOT redundant here: that is Antimass Deflectors' rule, not this card's.
  test('technology:lwd does not open an asteroid field', () => {
    const table = flight({ near: 'r-asteroid', ships: false });
    expectStanding(warningsOf(table, table.move), 'routeBlocked');
  });

  // Checks: the active system may hold other players' ships for anyone, so nothing is warned of there.
  test('technology:lwd other players\' ships in the active system are no breach at all', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] });
    const table = bench({ faction: 'sol', units: { [HOME]: { cruiser: 1 } }, entries: [move], game: { enemyUnits: RIVAL_SHIPS } });
    expectNone(warningsOf(table, move), 'routeBlocked');
  });

  test.fails('technology:lwd is a passive effect that waives the route check', () => {
    const { pack } = flight();
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual(['routeBlocked']);
  });
});
