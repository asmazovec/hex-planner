import { describe, expect, test } from 'vitest';
import type { Opponent } from '../../../types';
import { bench, componentAction, effect, endOf, expectStanding, quote, warningsOf } from '../kit';
import { id } from './ra';

const JOLNAR: Opponent = { id: 'o1', faction: 'jolnar', vp: 0, seat: 2, color: 2 };

describe('promissory:ra Research Agreement', () => {
  // "After the Jol-Nar player researches a technology that is not a faction technology: Gain that technology."
  // Checks: the note is a reminder of the strategy card, where research is entered.
  // Why nothing is validated here: the trigger is the research of the Jol-Nar player, an opponent whose strategy
  // cards the plan does not replay; the holder enters the gain, and a gain ignores prerequisites (90.5), so no check of
  // the plan stands in its way.
  test('promissory:ra is a reminder of research', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, 'After the Jol-Nar player researches a technology that is not a faction technology: Gain that technology.');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['card'] });
  });

  // "... Gain that technology. Then, return this card to the Jol-Nar player."
  // Checks: the holder plays the note (in `spends`) and gains the technology (in `gains`): they own it afterwards and
  // no longer hold the note.
  // Why nothing is validated here: the plan records the gain as entered; there is no rule of its own to check.
  test('promissory:ra played with the technology gained: the technology is owned, the note is gone', () => {
    const play = componentAction(`${id}@o1`, { spends: [`${id}@o1`], gains: ['technology:gd'] });
    const table = bench({ faction: 'sol', start: { promissory: [`${id}@o1`] }, entries: [play], game: { opponents: [JOLNAR] } });
    const end = endOf(table);
    expect(end.holdings.technologies).toContain('technology:gd');
    expect(end.holdings.promissory).not.toContain(`${id}@o1`);
  });

  // LRR 69.2: a player cannot play their own promissory note.
  // Checks: the Jol-Nar player playing their own Research Agreement is warned of.
  // Why the check is NOT redundant here: the card is written for the other players.
  test('promissory:ra the Jol-Nar player cannot play their own note', () => {
    const play = componentAction(`${id}@me`);
    const table = bench({ faction: 'jolnar', start: { promissory: [`${id}@me`] }, entries: [play] });
    expectStanding(warningsOf(table, play), 'ownPromissory');
  });
});
