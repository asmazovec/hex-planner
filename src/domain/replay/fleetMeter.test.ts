import { expect, test } from 'vitest';
import { bench, HOME, TARGET, tactical, warningsOf } from '../effects/components/kit';
import { before } from '../rules/kit';
import type { Opponent } from '../types';
import { tacticalMeters } from './tactical';

// Neuroglaive: "After another player activates a system that contains 1 or more of your ships, that player removes 1 token from their fleet pool".
// Checks: I activate the system where the Naalu's ship stands; the fleet pool of the flight screen (`tacticalMeters`) is the one
// the warning of the entry counts against, one token less than the pool before the action.
// Why the check is not redundant: the two numbers came from different states (before and after the activation).
test('the fleet pool of the flight screen is the pool after Neuroglaive, as the warning has it', () => {
  const naalu: Opponent = { id: 'o1', faction: 'naalu', vp: 0, seat: 2, color: 2 };
  const move = tactical(TARGET, { moves: [{ from: HOME, units: { carrier: 2 } }] });
  const table = bench({
    faction: 'sol', units: { [HOME]: { carrier: 2 } }, entries: [move],
    game: { opponents: [naalu], enemyUnits: { [TARGET]: { o1: { carrier: 1 } } }, start: { me: {}, opponents: { o1: { technologies: ['technology:ng'] } } } },
  });
  const start = before(table.game, table.pack, move);
  const meters = tacticalMeters(table.game, move as never, HOME, start, table.pack);
  expect(meters.fleet).toBe(start.fleet - 1);
  const pool = warningsOf(table, move).filter(w => w.code === 'fleetPool').map(w => w.params.fleet);
  for (const fleet of pool) expect(fleet).toBe(meters.fleet);
});
