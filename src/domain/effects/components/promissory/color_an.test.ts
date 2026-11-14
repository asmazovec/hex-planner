import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { bench, effect, endOf, HOME, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './color_an';
import { inForce } from '../../../../testing/old/domain/effects/registry';

const RIVAL = { id: 'a', faction: 'letnev', vp: 0, seat: 2, color: 2 };
const NOTE = `${id}@a`;
const COMMANDER = 'leader:letnevcommander';
const idle = (): Entry => tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] });
/** I hold the opponent's Alliance (or `mine`) from the start; the Letnev commander is unlocked unless `unlocked` is false (a locked leader is not held); they have an infantry on t1 when `theirs`. */
const table = (entries: Entry[], options: { mine?: string[]; unlocked?: boolean; theirs?: boolean } = {}) => bench({
  faction: 'sol', expansions: ['pok'], units: { [HOME]: { carrier: 1 } }, entries,
  game: {
    opponents: [RIVAL],
    start: { me: { promissory: options.mine ?? [NOTE] }, opponents: { a: { leaders: options.unlocked === false ? {} : { [COMMANDER]: 'unlocked' } } } },
    enemyGround: options.theirs ? { t1: { a: { infantry: 1 } } } : {},
  },
});

describe('promissory:<color>_an Alliance', () => {
  // "While this card is in your play area, you can use the <color> player's commander ability, if it is unlocked."
  // Checks: holding the Letnev player's Alliance, with their commander unlocked, the commander is in force for me, so
  // whatever it changes or lifts holds for my entries.
  // Why this matters for the checks: a commander that lifts a check lifts it only for the player it is in force for;
  // the note makes me that player too.
  test('promissory:<color>_an puts the owner\'s unlocked commander in force for me', () => {
    const an = table([idle()]);
    quote(an.pack, id, 'you can use the <color> player\'s commander ability, if it is unlocked');
    expect(inForce(an.pack, an.game, endOf(an))).toContain(COMMANDER);
  });

  // "... if it is unlocked."
  // Checks: with the commander still locked, nothing of it is in force for me.
  // Why it does NOT apply here: the card shares an unlocked commander only.
  test('promissory:<color>_an a locked commander of the owner is not in force for me', () => {
    const an = table([idle()], { unlocked: false });
    expect(inForce(an.pack, an.game, endOf(an))).not.toContain(COMMANDER);
  });

  // "... if you are not the <color> player ..."
  // Checks: without the note, another player's commander is never mine.
  test('promissory:<color>_an without the note the owner\'s commander is not in force for me', () => {
    const an = table([idle()], { mine: [] });
    expect(inForce(an.pack, an.game, endOf(an))).not.toContain(COMMANDER);
  });

  // "When you activate a system that contains 1 or more of the <color> player's units, return this card to the
  //  <color> player."
  // Checks: activating the system where the owner has an infantry returns the card, and the commander is mine no more.
  test('promissory:<color>_an activating a system with the owner\'s units returns the card', () => {
    const an = table([tactical(TARGET)], { theirs: true });
    const end = endOf(an);
    expect(end.holdings.promissory).not.toContain(NOTE);
    expect(end.rivals?.a.holdings.promissory).toContain(NOTE);
  });

  test('promissory:<color>_an is not a hint any more', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).not.toBe('hint');
  });
});
