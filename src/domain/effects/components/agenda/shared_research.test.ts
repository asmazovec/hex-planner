import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { adjust, bench, effect, expectStanding, expectWaived, FAR, FARTHER, HOME, NEAR, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './shared_research';

/** The row of the bench with a nebula between home and the target. */
const NEBULA_MAP = { [HOME]: 'r-home', [NEAR]: 'r-nebula', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };

/** The law comes into play in the strategy phase, before the tactical action. */
const law = (): Entry => ({ ...adjust({}, 'strategy'), gains: [id] });

/** A cruiser (move 2) flies from home through the nebula to the target. */
const through = () => tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });

const table = (entries: Entry[], extra: Parameters<typeof bench>[0]['game'] = {}, units: Parameters<typeof bench>[0]['units'] = { [HOME]: { cruiser: 1 } }) =>
  bench({ faction: 'sol', units, entries, game: { map: NEBULA_MAP, ...extra } });

describe('agenda:shared_research Shared Research', () => {
  // "For: Each player's units can move through nebulae."
  // Checks: with the law in play a cruiser passes through the nebula on its way to the target; the warning that the
  // route is blocked is still listed and lifted by the law.
  // Why the check is redundant here: LRR 59.1 lets a ship enter a nebula only as the active system, so a route
  // through it is blocked; the law says every player's units can move through nebulae.
  test('agenda:shared_research in play lifts the blocked route through a nebula', () => {
    const move = through();
    const shared = table([law(), move]);
    quote(shared.pack, id, "Each player's units can move through nebulae.");
    expectWaived(warningsOf(shared, move), 'routeBlocked', id);
  });

  // LRR 59.1: "A ship can move into a nebula only if that nebula is the active system."
  // Checks: the same flight without the law is warned of.
  // Why the check is NOT redundant here: the agenda is not in play, so the rule stands as written.
  test('agenda:shared_research not in play leaves the route through a nebula blocked', () => {
    const move = through();
    expectStanding(warningsOf(table([move]), move), 'routeBlocked');
  });

  // Shared Research note 2: "a ship that begins the Movement step of a tactical action in a nebula still treats its
  //  move value as one for the duration of that step."
  // Checks: a cruiser starting in the nebula flies two systems to the far one; it is too slow even with the law.
  // Why the check is NOT redundant here: the law speaks of moving through nebulae, not of the move value of a ship
  // that starts in one (59.2), so the speed check stands.
  test('agenda:shared_research a ship starting in a nebula still moves 1', () => {
    const move = tactical(FAR, { moves: [{ from: NEAR, units: { cruiser: 1 }, via: [TARGET] }] });
    const shared = table([law(), move], {}, { [NEAR]: { cruiser: 1 } });
    expectStanding(warningsOf(shared, move), 'speedShort');
  });

  // LRR 58.3.2 with the bench's opponent: a system holding another player's ships ends a move.
  // Checks: with the law, a route through a system blocked by another player's ships is still warned of.
  // Why the check is NOT redundant here: the law lifts nebulae only; other players' ships still stop a move.
  test('agenda:shared_research does not lift a route through other players\' ships', () => {
    const move = tactical(FAR, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [TARGET] }] });
    const shared = bench({
      faction: 'sol', units: { [HOME]: { carrier: 1, cruiser: 1 } }, entries: [law(), move],
      game: { map: { ...NEBULA_MAP, [NEAR]: 'r-empty' }, opponents: [{ id: 'x', faction: 'letnev', vp: 0, seat: 2, color: 2 }], enemyUnits: { [TARGET]: { x: { destroyer: 1 } } } },
    });
    const warnings = warningsOf(shared, move);
    expectStanding(warnings, 'routeBlocked');
    expect(warnings.find(w => w.code === 'routeBlocked')?.params).toMatchObject({ systemId: TARGET });
  });

  test('agenda:shared_research is a passive effect that waives the blocked route', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).permit?.map(w => w.code)).toEqual(['routeBlocked']);
  });
});
