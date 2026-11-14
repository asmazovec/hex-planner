import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showFlight, take, uiBench } from '../../../../ui/testing/effects';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, componentAction, HOME, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './nomadhero';

uiBench();

/** The flagship and an infantry arrive in NEAR, which then holds my token; `between` stands before the move out of it. */
const table = (between: Entry[], move: Entry) => bench({
  faction: 'nomad', expansions: ['pok'], units: { [HOME]: { flagship: 1, infantry: 1 } }, start: { leaders: { [id]: 'unlocked' } },
  entries: [tactical(NEAR, { moves: [{ from: HOME, units: { flagship: 1, infantry: 1 } }] }), ...between, move],
});

// "your flagship and units it transports can move out of systems that contain your command tokens during this game
//  round."
// Checks: after the hero's component action I take the flagship and the infantry out of NEAR, which holds my token;
// both are taken, and the warning of the route reads as allowed by the hero.
// Why the check is redundant here: the flagship and what it transports may leave such a system this round (58.3.3
// forbids it otherwise).
test('leader:nomadhero the flagship and its cargo are taken out of a system with my token, and the warning reads as allowed by Ahk-Syl Siven', async () => {
  const move = tactical(TARGET, { moves: [{ from: NEAR, units: {} }] });
  const nomad = table([componentAction(id)], move);
  quote(nomad.pack, id, 'your flagship and units it transports can move out of systems that contain your command tokens');
  const live = showFlight(nomad, move, NEAR);
  await take('Flagship');
  await take('Infantry');
  expect(live.entry().moves[0].units).toEqual({ flagship: 1, infantry: 1 });
  expectShownWaived('sourceActivated', 'Ahk-Syl Siven');
});

// LRR 58.3.3: a ship cannot move out of a system that contains its own faction's command token.
// Checks: without the hero the same presses take the units all the same, and the warning stands.
// Why the check is NOT redundant here: the hero was not played.
test('leader:nomadhero not played, the flagship is still taken and its warning stands', async () => {
  const move = tactical(TARGET, { moves: [{ from: NEAR, units: {} }] });
  const live = showFlight(table([], move), move, NEAR);
  await take('Flagship');
  await take('Infantry');
  expect(live.entry().moves[0].units).toEqual({ flagship: 1, infantry: 1 });
  expectShownStanding('sourceActivated');
});
