import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry } from '../../../types';
import { adjust, bench, componentAction, effect, endOf, expectStanding, quote, warningsOf } from '../kit';
import { id } from './refit';

/** Three infantry on Home One, Refit Troops in hand. */
const table = (entries: Entry[]) => bench({
  faction: 'sol', expansions: ['pok'], start: { hand: [id] },
  entries: [adjust({ ground: { h1: { infantry: 3 } } }), ...entries], game: { planetControl: { h1: 'me' } },
});
const refit = (choices: Record<string, number>) => componentAction(id, { choices });

describe('actionCard:refit Refit Troops', () => {
  // "Choose 1 or 2 of your infantry on the game board. Replace each of those infantry with mechs."
  // Checks: the component action with two infantry chosen on Home One leaves one infantry and two mechs there.
  // Why the check is redundant here: nothing is lifted; the card changes the board, which the replay must do itself
  // (a mech is otherwise only produced, LRR 67, or deployed by an ability).
  test.fails('actionCard:refit replaces two infantry with two mechs on the chosen planet', () => {
    const refitted = table([refit({ h1: 2 })]);
    quote(refitted.pack, id, 'Replace each of those infantry with mechs.');
    expect(endOf(refitted).ground.h1).toEqual({ infantry: 1, mech: 2 });
  });

  // "Choose 1 or 2 of your infantry on the game board."
  // Checks: one infantry chosen where none stands is reported missing, and no mech appears there.
  // Why the check is NOT redundant here: the card replaces infantry that are on the board; it makes none.
  test.fails('actionCard:refit an infantry chosen where there is none is missing and nothing is replaced', () => {
    const entry = refit({ h2: 1 });
    const refitted = table([entry]);
    expectStanding(warningsOf(refitted, entry), 'unitsMissing');
    expect(endOf(refitted).ground.h2?.mech ?? 0).toBe(0);
  });

  // "Choose 1 or 2 ..."
  // Checks: three infantry chosen is beyond the card's limit and warned of (a new code), the plan forbidding nothing.
  // Why the check is NOT redundant here: the card names at most two infantry.
  test.fails('actionCard:refit three infantry are more than the card allows: warned', () => {
    const entry = refit({ h1: 3 });
    expectStanding(warningsOf(table([entry]), entry), 'choiceOverLimit' as AnyWarningCode);
  });

  // Checks: the card only held changes nothing on the board.
  // Why the check is NOT redundant here: the card is an ACTION; until it is played the infantry stay.
  test('actionCard:refit held but not played changes nothing', () => {
    expect(endOf(table([])).ground.h1).toEqual({ infantry: 3 });
  });

  test.fails('actionCard:refit is a play effect', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
  });
});
