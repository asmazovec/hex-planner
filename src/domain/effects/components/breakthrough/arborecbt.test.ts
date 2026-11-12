import { describe, expect, test } from 'vitest';
import type { Entry, GameState } from '../../../types';
import { adjust, bench, componentAction, effect, endOf, expectNone, expectStanding, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './arborecbt';

/** The infantry of a player in a system: its space area and its planets. */
const infantryIn = (state: GameState, systemId: string, planets: string[]): number =>
  (state.systems[systemId]?.infantry ?? 0) + planets.reduce((sum, p) => sum + (state.ground[p]?.infantry ?? 0), 0);

/**
 * I activate the target, play Psychospore on it, and activate it again. With `infantry` my one infantry stands on t1
 * (which I control) from the start.
 */
const round = (infantry: boolean, breakthrough: 'held' | 'exhausted' = 'held') => {
  const first = tactical(TARGET);
  const play = componentAction(id, { choices: { systemId: TARGET } });
  const again = tactical(TARGET);
  const setup: Entry[] = infantry ? [adjust({ ground: { t1: { infantry: 1 } } }, 'strategy')] : [];
  const table = bench({
    faction: 'arborec', expansions: ['pok', 'te'], start: { breakthrough }, entries: [...setup, first, play, again],
    game: { planetControl: { t1: 'me' } },
  });
  return { play, again, ...table };
};

describe('breakthrough:arborecbt Psychospore', () => {
  // "ACTION: Exhaust this card to remove a command token from a system that contains 1 or more of your infantry and
  //  return it to your reinforcements."
  // Checks: after Psychospore the target, where my infantry stands, holds no token of mine, so activating it again is
  // not warned of.
  // Why the check is redundant here: 5.2 forbids activating a system that holds my command token; the token is gone.
  test('breakthrough:arborecbt removes my command token: the system may be activated again', () => {
    const table = round(true);
    quote(table.pack, id, 'remove a command token from a system that contains 1 or more of your infantry');
    expectNone(warningsOf(table, table.again), 'systemHasToken');
  });

  // "Then, place 1 infantry in that system."
  // Checks: one more infantry stands in the system after the action.
  // Why the default does not apply: infantry enter the board by production only (67); the card places one unpaid.
  test('breakthrough:arborecbt places 1 infantry in that system', () => {
    const table = round(true);
    quote(table.pack, id, 'Then, place 1 infantry in that system');
    expect(infantryIn(endOf(table), TARGET, ['t1', 't2'])).toBe(2);
  });

  // "... a system that contains 1 or more of your infantry"
  // Checks: with no infantry of mine in the target the token stays, and the second activation is still warned of.
  // Why the check is NOT redundant here: the card's own condition is not met, so nothing is removed.
  test('breakthrough:arborecbt does nothing in a system without my infantry: the token stays', () => {
    const table = round(false);
    expectStanding(warningsOf(table, table.again), 'systemHasToken');
    expect(infantryIn(endOf(table), TARGET, ['t1', 't2'])).toBe(0);
  });

  // "Exhaust this card" with LRR 34.4: "If a card is already exhausted, it cannot be exhausted again."
  // Checks: the breakthrough already exhausted is warned of when played.
  test('breakthrough:arborecbt exhausted is warned of when played', () => {
    const table = round(true, 'exhausted');
    expectStanding(warningsOf(table, table.play), 'componentExhausted');
  });

  test('breakthrough:arborecbt is a play effect', () => {
    expect(effect(round(true).pack, id).tier).toBe('play');
  });
});
