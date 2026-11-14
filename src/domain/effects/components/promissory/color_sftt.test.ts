import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, effect, endOf, HOME, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './color_sftt';

const RIVAL = { id: 'a', faction: 'letnev', vp: 0, seat: 2, color: 2 };
const NOTE = `${id}@a`;
/** A turn in which the opponent hands me their Support for the Throne in a transaction. */
const receive = (): Entry => tactical(NEAR, {
  moves: [{ from: HOME, units: { carrier: 1 } }],
  acts: [{ kind: 'transaction', with: 'a', give: {}, get: { components: [NOTE] } }],
});
/** An activation of the target system, where the opponent has an infantry on t1 when `theirs`. */
const activate = (): Entry => tactical(TARGET);
const table = (entries: Entry[], options: { mine?: string[]; theirs?: boolean } = {}) => bench({
  faction: 'sol', units: { [HOME]: { carrier: 1 } }, entries,
  game: {
    opponents: [RIVAL], start: { me: { promissory: options.mine ?? [] }, opponents: { a: { promissory: [NOTE] } } },
    enemyGround: options.theirs ? { t1: { a: { infantry: 1 } } } : {},
  },
});

describe('promissory:<color>_sftt Support for the Throne', () => {
  // "When you receive this card, if you are not the <color> player, you must place it faceup in your play area and
  //  gain 1 victory point."
  // Checks: the note received in a transaction gives me 1 victory point.
  // Why this is automated: the plan counts victory points, and the note gives the point by itself, at once (promissory
  // notes, Support for the Throne 1: it cannot be kept secret).
  test('promissory:<color>_sftt received from another player gives 1 victory point', () => {
    const sftt = table([receive()]);
    quote(sftt.pack, id, 'place it faceup in your play area and gain 1 victory point');
    expect(endOf(sftt).holdings.promissory).toContain(NOTE);
    expect(endOf(sftt).vp).toBe(1);
  });

  // "When you activate a system that contains 1 or more of the <color> player's units, ... lose 1 victory point and
  //  return this card to the <color> player."
  // Checks: activating the system where the owner has an infantry takes the point back and returns the card.
  test('promissory:<color>_sftt activating a system with the owner\'s units loses the point and returns the card', () => {
    const sftt = table([receive(), activate()], { theirs: true });
    const end = endOf(sftt);
    expect(end.vp).toBe(0);
    expect(end.holdings.promissory).not.toContain(NOTE);
    expect(end.rivals?.a.holdings.promissory).toContain(NOTE);
  });

  // Checks: activating a system with none of the owner's units keeps the card and the point.
  // Why the return does NOT apply here: the card names the owner's units only.
  test('promissory:<color>_sftt activating a system without the owner\'s units keeps the point', () => {
    const end = endOf(table([receive(), activate()]));
    expect(end.vp).toBe(1);
    expect(end.holdings.promissory).toContain(NOTE);
  });

  // "... if you are not the <color> player ..."
  // Checks: my own Support for the Throne, held from the start, gives me no point.
  // Why the point does NOT apply here: the note gives a point to another player only.
  test('promissory:<color>_sftt my own note gives no point', () => {
    expect(endOf(table([tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] })], { mine: [`${id}@me`] })).vp).toBe(0);
  });

  // Checks: holding my own copy does not double the point: one card received is 1 victory point.
  // Why the check is NOT redundant here: the effect runs once for the card received, not once per copy in play.
  test('promissory:<color>_sftt received while holding my own copy gives 1 victory point', () => {
    expect(endOf(table([receive()], { mine: [`${id}@me`] })).vp).toBe(1);
  });

  test('promissory:<color>_sftt is not a hint any more', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).not.toBe('hint');
  });
});
