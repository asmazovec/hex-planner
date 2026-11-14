import { describe, expect, test } from 'vitest';
import { isWaived } from '../../../rules/registry';
import type { Warning } from '../../../types';
import type { Entry, Game } from '../../../../testing/old/domain/types';
import { bench, effect, expectStanding, expectWaived, FAR, FARTHER, HOME, NEAR, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './circletofthevoid';

const MAP = (near: string): Game['map'] => ({ [HOME]: 'r-home', [NEAR]: near, [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' });
const table = (near: string, units: Record<string, Record<string, number>>, move: Entry, relics: string[] = [id], game: Partial<Game> = {}) =>
  bench({ faction: 'sol', expansions: ['pok'], units, start: { relics }, entries: [move], game: { map: MAP(near), ...game } });
const standing = (warnings: Warning[], code: string) => warnings.filter(w => w.code === code && !isWaived(w));

/** A cruiser (move 2) from home through NEAR into the target. */
const through = () => tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });

describe('relic:circletofthevoid Circlet of the Void', () => {
  // "you ignore the effects of all other anomalies on movement."
  // Checks: the cruiser flies through an asteroid field; the route warning is listed and lifted by the relic.
  // Why the check is redundant here: LRR 11.1 forbids moving through or into an asteroid field; that is an effect of an
  // anomaly on movement, which the holder of the Circlet ignores (Circlet note 1).
  test('relic:circletofthevoid lifts the route through an asteroid field', () => {
    const move = through();
    const circlet = table('r-asteroid', { [HOME]: { cruiser: 1 } }, move);
    quote(circlet.pack, id, 'you ignore the effects of all other anomalies on movement');
    expectWaived(warningsOf(circlet, move), 'routeBlocked', id);
  });

  // Checks: the cruiser moves into a supernova as the active system; the warning is lifted.
  // Why the check is redundant here: LRR 86.1 forbids moving into a supernova; the holder may (Circlet note 1).
  test('relic:circletofthevoid lifts the move into a supernova', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] });
    expectWaived(warningsOf(table('r-supernova', { [HOME]: { cruiser: 1 } }, move), move), 'routeBlocked', id);
  });

  // Checks: the cruiser flies through a nebula on its way to the target; the warning is lifted.
  // Why the check is redundant here: LRR 59.1 lets a ship enter a nebula only as the active system; the holder may
  // move through nebulae (Circlet note 2).
  test('relic:circletofthevoid lifts the route through a nebula', () => {
    const move = through();
    expectWaived(warningsOf(table('r-nebula', { [HOME]: { cruiser: 1 } }, move), move), 'routeBlocked', id);
  });

  // Checks: a cruiser that starts in a nebula moves two systems with its move value of 2: no shortfall stands.
  // Why the check is redundant here: LRR 59.2 sets the move value of a ship starting in a nebula to 1; the holder's
  // ships "in nebulae do not have their movement values reduced" (Circlet note 2).
  test('relic:circletofthevoid a ship leaving a nebula keeps its move value', () => {
    const move = tactical(FAR, { moves: [{ from: NEAR, units: { cruiser: 1 }, via: [TARGET] }] });
    expect(standing(warningsOf(table('r-nebula', { [NEAR]: { cruiser: 1 } }, move), move), 'speedShort')).toEqual([]);
  });

  // LRR 59.2: a ship that starts its movement in a nebula has a move value of 1.
  // Checks: without the relic the same two systems out of the nebula leave the cruiser short.
  // Why the check is NOT redundant here: nothing of this player removes the nebula's effect.
  test('relic:circletofthevoid not held, a ship leaving a nebula is short', () => {
    const move = tactical(FAR, { moves: [{ from: NEAR, units: { cruiser: 1 }, via: [TARGET] }] });
    expectStanding(warningsOf(table('r-nebula', { [NEAR]: { cruiser: 1 } }, move, []), move), 'speedShort');
  });

  // Checks: the same cruiser out of the nebula three systems away is short even of its printed move value.
  // Why the check is NOT redundant here: the Circlet removes the nebula's effect, not the move value itself (58.3.6).
  test('relic:circletofthevoid a ship short of its own move value is still warned of', () => {
    const move = tactical(FARTHER, { moves: [{ from: NEAR, units: { cruiser: 1 }, via: [TARGET, FAR] }] });
    expectStanding(warningsOf(table('r-nebula', { [NEAR]: { cruiser: 1 } }, move), move), 'speedShort');
  });

  // LRR 58.3.2: "The ship cannot move through a system that contains ships that are controlled by another player."
  // Checks: the route through a system holding another player's destroyer stands as a breach for the holder.
  // Why the check is NOT redundant here: other players' ships are no anomaly; the Circlet speaks of anomalies only.
  test('relic:circletofthevoid does not lift a route through another player\'s ships', () => {
    const move = through();
    const opponents = [{ id: 'o1', faction: 'hacan', vp: 0, seat: 2, color: 2 }];
    const blocked = table('r-empty', { [HOME]: { cruiser: 1 } }, move, [id], { opponents, enemyUnits: { [NEAR]: { o1: { destroyer: 1 } } } });
    expectStanding(warningsOf(blocked, move), 'routeBlocked');
  });

  // LRR 11.1: "A ship cannot move through or into an asteroid field."
  // Checks: without the relic the route through the asteroid field stands.
  // Why the check is NOT redundant here: no component of this player speaks of anomalies.
  test('relic:circletofthevoid not held, the asteroid field blocks the route', () => {
    const move = through();
    expectStanding(warningsOf(table('r-asteroid', { [HOME]: { cruiser: 1 } }, move, []), move), 'routeBlocked');
  });

  // Circlet note 3: the holder "still applies the movement bonus to their ships that will move through gravity rifts."
  // Checks: a carrier (move 1) out through a gravity rift reaches the target two systems away.
  // Why nothing is waived here: the rift's +1 (41.1) is kept; the roll the card speaks of is not counted by the plan.
  test('relic:circletofthevoid a gravity rift still adds 1 to the move', () => {
    const move = tactical(TARGET, { moves: [{ from: HOME, units: { carrier: 1 }, via: [NEAR] }] });
    const warnings = warningsOf(table('r-rift', { [HOME]: { carrier: 1 } }, move), move);
    expect(standing(warnings, 'speedShort')).toEqual([]);
  });

  test.todo('relic:circletofthevoid ACTION "explore a frontier token": the plan does not explore');

  test('relic:circletofthevoid is a passive effect that waives anomalies on routes', () => {
    const { pack } = table('r-empty', {}, through());
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).permit?.map(w => w.code)).toEqual(['routeBlocked']);
    // The nebula's slowing of a ship that starts in it is a modify of the `nebulaStart` point, not a waiver of `speedShort`.
    expect(effect(pack, id).modify?.nebulaStart).toBeDefined();
  });
});
