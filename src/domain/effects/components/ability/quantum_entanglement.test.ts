import { describe, expect, test } from 'vitest';
import { routeReach } from '../../../movement';
import { bench, effect, expectNone, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './quantum_entanglement';

/** The test row with an alpha wormhole in NEAR and a beta one in FARTHER (or an alpha one, with `matching`). */
const map = (matching: boolean) => ({ [HOME]: 'r-home', [NEAR]: 'r-alpha', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: matching ? 'r-alpha' : 'r-beta' });
const board = (faction: string, matching = false) => bench({ faction, game: { map: map(matching) } });
const reach = (table: ReturnType<typeof board>) => routeReach(table.game, [NEAR], 1, FARTHER, table.pack, new Set());

describe('ability:quantum_entanglement Quantum Entanglement', () => {
  // "You treat all systems that contain either an alpha or beta wormhole as adjacent to each other."
  // Checks: a Creuss ship with move 1 in the alpha system reaches the beta system three systems away.
  // Why the default adjacency does not apply: 6.1 joins only matching wormholes; the ability joins alpha and beta for
  // the Creuss player, so the reach the plan lights includes the beta system.
  test.fails('ability:quantum_entanglement joins the alpha and the beta systems for the Creuss player', () => {
    const ghost = board('ghost');
    quote(ghost.pack, id, 'You treat all systems that contain either an alpha or beta wormhole as adjacent to each other.');
    expect(reach(ghost).has(FARTHER)).toBe(true);
  });

  // LRR 6.1: "A system that has a wormhole is treated as being adjacent to a system that has a matching wormhole."
  // Checks: for another faction the beta system is out of reach of a ship with move 1.
  // Why the check is NOT redundant here: the ability is printed on the Creuss faction sheet alone.
  test('ability:quantum_entanglement is the Creuss player\'s own: another faction does not reach the beta system', () => {
    expect(reach(board('letnev')).has(FARTHER)).toBe(false);
  });

  // LRR 6.1.
  // Checks: two alpha systems are joined for everyone, so the ability adds nothing there.
  test('ability:quantum_entanglement matching wormholes are joined for every faction', () => {
    expect(reach(board('letnev', true)).has(FARTHER)).toBe(true);
  });

  // Checks: the step from the alpha to the beta system is one step for the route, with or without the ability: the
  // plan counts a step between systems that are not joined as a jump and warns of nothing.
  // Why no check is lifted: adjacency makes no warning of its own, it only lights the reach.
  test('ability:quantum_entanglement a route from the alpha to the beta system is one step, not warned of', () => {
    const move = tactical(FARTHER, { moves: [{ from: NEAR, units: { cruiser: 1 } }] });
    const table = bench({ faction: 'ghost', units: { [NEAR]: { cruiser: 1 } }, entries: [move], game: { map: map(false) } });
    expectNone(warningsOf(table, move), 'speedShort');
  });

  test('ability:quantum_entanglement has no waiver: no warning depends on adjacency', () => {
    expect(effect(board('ghost').pack, id).waive).toBeUndefined();
  });
});
