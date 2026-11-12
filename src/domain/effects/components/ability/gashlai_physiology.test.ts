import { describe, expect, test } from 'vitest';
import type { Entry, Warning } from '../../../types';
import { bench, effect, expectStanding, expectWaived, FAR, FARTHER, HOME, NEAR, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './gashlai_physiology';

/** The test row with a supernova (or another anomaly) in the second slot. */
const mapWith = (tile: string) => ({ [HOME]: 'r-home', [NEAR]: tile, [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' });
const table = (faction: string, move: Entry, tile = 'r-supernova', technologies: string[] = []) =>
  ({ move, ...bench({ faction, units: { [HOME]: { cruiser: 1 } }, entries: [move], start: { technologies }, game: { map: mapWith(tile) } }) });
/** A cruiser (move 2) flies from home through the second slot to the target. */
const through = () => tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
/** A cruiser flies into the second slot and ends there. */
const into = () => tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] });
const blocked = (warnings: Warning[]) => warnings.filter(w => w.code === 'routeBlocked');

describe('ability:gashlai_physiology Gashlai Physiology', () => {
  // "Your ships can move through supernovas"
  // Checks: a Muaat cruiser flies through a supernova to the target; the route warning is listed and lifted by the
  // ability.
  // Why the check is redundant here: LRR 86.1 says "A ship cannot move through or into a supernova", and the ability
  // allows the Muaat's ships exactly the "through".
  test.fails('ability:gashlai_physiology lets a ship move through a supernova: the route warning is waived', () => {
    const muaat = table('muaat', through());
    quote(muaat.pack, id, 'Your ships can move through supernovas');
    expectWaived(warningsOf(muaat, muaat.move), 'routeBlocked', id);
  });

  // LRR 86.1: "A ship cannot move through or into a supernova."
  // Checks: the same flight of another faction is warned of.
  // Why the check is NOT redundant here: nothing this player holds speaks of supernovas.
  test('ability:gashlai_physiology is the Muaat\'s own: another faction\'s route through a supernova stands', () => {
    const sol = table('sol', through());
    expectStanding(warningsOf(sol, sol.move), 'routeBlocked');
  });

  // Checks: a supernova as the active system, a move into it, stays warned of.
  // Why the check is NOT redundant here: the ability says "through"; moving into a supernova is Magmus Reactor's.
  test('ability:gashlai_physiology does not let a ship end its move in a supernova', () => {
    const muaat = table('muaat', into());
    expect(blocked(warningsOf(muaat, muaat.move))).toHaveLength(1);
    expectStanding(warningsOf(muaat, muaat.move), 'routeBlocked');
  });

  // LRR 11.1 / 9.2.1: an asteroid field cannot be moved through either.
  // Checks: a route through an asteroid field stays warned of.
  // Why the check is NOT redundant here: the ability speaks of supernovas only.
  test('ability:gashlai_physiology does not open an asteroid field', () => {
    const muaat = table('muaat', through(), 'r-asteroid');
    expectStanding(warningsOf(muaat, muaat.move), 'routeBlocked');
  });

  test.fails('ability:gashlai_physiology is a passive effect that waives the route check', () => {
    const { pack } = table('muaat', through());
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual(['routeBlocked']);
  });
});
