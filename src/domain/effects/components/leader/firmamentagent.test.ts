import { describe, expect, test } from 'vitest';
import type { UnitCounts } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, effect, expectStanding, expectWaived, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET, using, warningsOf } from '../kit';
import { id } from './firmamentagent';

/** A rival destroyer stands in the system between my home and the target. */
const BLOCKED = { enemyUnits: { [NEAR]: { o1: { destroyer: 1 } } } };
/** The ships fly from home to the target through the system next to it. */
const through = (units: UnitCounts): Entry => tactical(TARGET, { moves: [{ from: HOME, units, via: [NEAR] }] });
const firmament = (entries: Entry[], units: UnitCounts, game: Parameters<typeof bench>[0]['game'] = BLOCKED) =>
  bench({ faction: 'firmament', expansions: ['pok', 'te'], units: { [HOME]: units }, start: { leaders: { [id]: 'unlocked' } }, entries, game });

describe('leader:firmamentagent Myru Vos', () => {
  // "When a player moves ships: You may exhaust this card; if you do, SPACE CANNON cannot be used against those ships.
  //  If they are not transporting units, they can also move through other players' ships."
  // Checks: a cruiser flies through a system holding a rival destroyer with the agent used; the route warning is
  // listed and lifted by the agent.
  // Why the check is redundant here: LRR 58.3.2 says "The ship cannot move through a system that contains ships that
  // are controlled by another player", and the card says ships that transport nothing can, once it is exhausted.
  test('leader:firmamentagent used lets ships that transport nothing move through other players\' ships', () => {
    const move = using(through({ cruiser: 1 }), id);
    const table = firmament([move], { cruiser: 1 });
    quote(table.pack, id, 'If they are not transporting units, they can also move through other players\' ships.');
    expectWaived(warningsOf(table, move), 'routeBlocked', id);
  });

  // LRR 58.3.2: "The ship cannot move through a system that contains ships that are controlled by another player."
  // Checks: the same flight without the agent named in the entry is warned of, and nothing lifts it.
  // Why the check is NOT redundant here: the agent acts only when exhausted for this move ("You may exhaust this
  // card; if you do"); held and ready is not used.
  test('leader:firmamentagent not used leaves the route through other players\' ships standing', () => {
    const move = through({ cruiser: 1 });
    expectStanding(warningsOf(firmament([move], { cruiser: 1 }), move), 'routeBlocked');
  });

  // "If they are not transporting units, they can also move through other players' ships."
  // Checks: a carrier with an infantry on board flies the same route with the agent used: the route warning stands.
  // Why the check is NOT redundant here: the card lifts the rule only for ships that transport nothing.
  test('leader:firmamentagent does not let ships that transport units move through other players\' ships', () => {
    const move = using(through({ carrier: 1, infantry: 1 }), id);
    expectStanding(warningsOf(firmament([move], { carrier: 1, infantry: 1 }), move), 'routeBlocked');
  });

  // LRR 11.1: "A ship cannot move through an asteroid field."
  // Checks: the agent used on a route through an asteroid field (no other player's ships there) lifts nothing.
  // Why the check is NOT redundant here: the card speaks of other players' ships only; an anomaly still blocks.
  test('leader:firmamentagent does not open an asteroid field', () => {
    const move = using(through({ cruiser: 1 }), id);
    const map = { [HOME]: 'r-home', [NEAR]: 'r-asteroid', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };
    expectStanding(warningsOf(firmament([move], { cruiser: 1 }, { map }), move), 'routeBlocked');
  });

  // "You may exhaust this card; if you do".
  // Checks: the agent used a second time in the round, already exhausted, is warned of, and the second route through
  // other players' ships stays warned of.
  // Why the check is NOT redundant here: an exhausted card cannot be exhausted again, so its ability is not resolved
  // (LRR 34.3, an agent readies in the status phase).
  test('leader:firmamentagent already exhausted does not lift the route of a second move', () => {
    const first = using(through({ cruiser: 1 }), id);
    const second = using(tactical(FAR, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR, TARGET] }] }), id);
    const warnings = warningsOf(firmament([first, second], { cruiser: 2 }), second);
    expectStanding(warnings, 'componentExhausted');
    expectStanding(warnings, 'routeBlocked');
  });

  test.todo('leader:firmamentagent exhausted on another player\'s move: a component of another player is named in that entry\'s uses, and its exhaustion on my card is not replayed');

  test('leader:firmamentagent waives the route check, and only that', () => {
    const { pack } = firmament([], {});
    expect(effect(pack, id).permit?.map(w => w.code)).toEqual(['routeBlocked']);
  });
});
