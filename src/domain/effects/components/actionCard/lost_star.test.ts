import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../../../testing/old/domain/effects/registry';
import { bench, effect, endOf, expectNone, FARTHER, HOME, NEAR, quote, TARGET, FAR, tactical, warningsOf } from '../kit';
import { id } from './lost_star';

/** An alpha wormhole one system from home and a beta wormhole three systems further: not joined on this board. */
const MAP = { [HOME]: 'r-home', [NEAR]: 'r-alpha', [TARGET]: 'r-empty', [FAR]: 'r-empty', [FARTHER]: 'r-beta' };
const table = (entries = [] as ReturnType<typeof tactical>[], hand: string[] = [id]) =>
  bench({ faction: 'sol', units: { [NEAR]: { carrier: 1 } }, start: { hand }, entries, game: { map: MAP } });

describe('actionCard:lost_star Lost Star Chart', () => {
  // "During this tactical action, systems that contain alpha and beta wormholes are adjacent to each other."
  // Checks: a carrier (move 1) flies from the alpha wormhole straight to the beta wormhole with the card named in
  // the entry's `uses`: no speed or route warning is made.
  // Why the check is redundant here: the plan already takes two marked systems that are not joined as a jump of one
  // step (src/domain/movement.ts, `fullPath`), the Fracture, a portal or an ability of this kind, and warns of none
  // of it: there is no warning for the card to lift, so it stays a hint.
  test('actionCard:lost_star a flight from an alpha to a beta wormhole raises no warning to lift', () => {
    const move = tactical(FARTHER, { moves: [{ from: NEAR, units: { carrier: 1 } }] }, { uses: [id] });
    const lost = table([move]);
    quote(lost.pack, id, 'systems that contain alpha and beta wormholes are adjacent to each other');
    const warnings = warningsOf(lost, move);
    expectNone(warnings, 'speedShort');
    expectNone(warnings, 'routeBlocked');
  });

  // LRR 6.1 (adjacency): systems that share a wormhole of the same type are adjacent; alpha and beta are not.
  // Checks: the same flight without the card is the same jump and is not warned of either.
  // Why the check is NOT made either way: a jump is the player's mark of a move the plan does not count; the card
  // only names one more reason for it.
  test('actionCard:lost_star without the card the same jump is not warned of: the card changes no count', () => {
    const move = tactical(FARTHER, { moves: [{ from: NEAR, units: { carrier: 1 } }] });
    const warnings = warningsOf(table([move], []), move);
    expectNone(warnings, 'speedShort');
    expectNone(warnings, 'routeBlocked');
  });

  // Checks: the card is a reminder in the block of the activation, as its window says ("After you activate a system").
  // Why nothing is validated here: see above; the highlight of reachable systems ignores the card, which the plan
  // does not count.
  test('actionCard:lost_star is a hint at the activation step, reminded of while it is in hand', () => {
    const lost = table();
    expect(effect(lost.pack, id).tier).toBe('hint');
    expect(effect(lost.pack, id).hintAt).toEqual(['activation']);
    expect(hintsAt(lost.pack, endOf(lost), 'activation', ['me']).map(def => def.id)).toContain(id);
  });
});
