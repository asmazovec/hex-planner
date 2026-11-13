import { describe, expect, test } from 'vitest';
import type { Game } from '../../../types';
import { bench, effect, expectStanding, expectWaived, FAR, FARTHER, HOME, NEAR, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './amd';

/** The test row with `near` in place of the empty system between home and target. */
const row = (near: string): Record<string, string> => ({ [HOME]: 'r-home', [NEAR]: near, [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' });

/** A cruiser flies from home through the system next to it into the target, or into that system itself. */
const flight = (near: string, options: { into?: string; technologies?: string[]; game?: Partial<Game> } = {}) => {
  const into = options.into ?? TARGET;
  const move = tactical(into, { moves: [{ from: HOME, units: { cruiser: 1 }, via: into === TARGET ? [NEAR] : [] }] });
  const table = bench({
    faction: 'sol', units: { [HOME]: { cruiser: 1 } }, start: { technologies: options.technologies ?? [id] }, entries: [move],
    game: { map: row(near), ...options.game },
  });
  return { move, ...table };
};

describe('technology:amd Antimass Deflectors', () => {
  // "Your ships can move into and through asteroid fields."
  // Checks: a cruiser passes through an asteroid field on its way; the route warning is listed and lifted by the card.
  // Why the check is redundant here: LRR 11.1 says "A ship cannot move through or into an asteroid field", and the
  // card says this player's ships can.
  test('technology:amd lets a ship move through an asteroid field: the route warning is waived', () => {
    const table = flight('r-asteroid');
    quote(table.pack, id, 'Your ships can move into and through asteroid fields.');
    expectWaived(warningsOf(table, table.move), 'routeBlocked', id);
  });

  // "... move into ... asteroid fields."
  // Checks: the asteroid field is the active system itself; the warning is lifted too.
  // Why the check is redundant here: the card speaks of moving into an asteroid field as well as through it.
  test('technology:amd lets a ship move into an asteroid field as the active system', () => {
    const table = flight('r-asteroid', { into: NEAR });
    expectWaived(warningsOf(table, table.move), 'routeBlocked', id);
  });

  // LRR 11.1: "A ship cannot move through or into an asteroid field."
  // Checks: without the card the same route is warned of.
  // Why the check is NOT redundant here: nothing this player holds speaks of asteroid fields.
  test('technology:amd not held: the route through an asteroid field stands', () => {
    const table = flight('r-asteroid', { technologies: [] });
    expectStanding(warningsOf(table, table.move), 'routeBlocked');
  });

  // LRR 86.1: "A ship cannot move through or into a supernova."
  // Checks: with the card a supernova on the way still blocks the route.
  // Why the check is NOT redundant here: the card names asteroid fields only.
  test('technology:amd does not open a supernova', () => {
    const table = flight('r-supernova');
    expectStanding(warningsOf(table, table.move), 'routeBlocked');
  });

  // LRR 58.3.2: "The ship cannot move through a system that contains ships that are controlled by another player."
  // Checks: with the card, other players' ships on the way still block the route.
  // Why the check is NOT redundant here: that is Light/Wave Deflector's rule, not this card's.
  test('technology:amd does not let a ship through other players\' ships', () => {
    const table = flight('r-empty', { game: { enemyUnits: { [NEAR]: { rival: { cruiser: 1 } } } } });
    expectStanding(warningsOf(table, table.move), 'routeBlocked');
  });

  test('technology:amd is a passive effect that waives the route check', () => {
    const { pack } = flight('r-asteroid');
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).permit?.map(w => w.code)).toEqual(['routeBlocked']);
  });
});
