import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import type { Player } from '../../../players';
import { bench, effect, endOf, expectNone, expectStanding, quote, statusTokens, using, warningsOf } from '../kit';
import { id } from './ce';

/** The L1Z1X at the table, whose note I hold under its address. */
const L1Z1X: Player = { id: 'o1', faction: 'l1z1x', vp: 0, seat: 2, color: 2 };
const NOTE = `${id}@o1`;

/** I play the Arborec (not the Sol: its Versatile already gives a third token) and hold the L1Z1X note; the status entry gives out `tokens` command tokens. */
const status = (tokens: [number, number, number], uses: string[] = [NOTE]) => using(statusTokens(...tokens), ...uses);
const table = (entry: Entry, faction = 'arborec', promissory = [NOTE]) =>
  bench({ faction, game: { opponents: [L1Z1X] }, start: { promissory }, rounds: [[entry]] });

describe('promissory:ce Cybernetic Enhancements', () => {
  // "When you gain command tokens during the status phase: Gain 1 additional command token."
  // Checks: the note named in the status entry lets it give out three tokens, and no warning of too many is made.
  // Why the check is redundant here: LRR 81.5 gives two tokens, and the note one more; the check then counts against
  // three. It changes the number, so nothing is listed as waived.
  test('promissory:ce used at the status phase gives a third command token', () => {
    const entry = status([2, 1, 0]);
    const sol = table(entry);
    quote(sol.pack, id, 'Gain 1 additional command token');
    expectNone(warningsOf(sol, entry), 'tokensOver');
  });

  // Checks: a fourth token is still too many, and the warning names three free tokens.
  // Why the check is NOT redundant here: the note adds exactly one token.
  test('promissory:ce a fourth token is still warned of, against three', () => {
    const entry = status([2, 2, 0]);
    const warnings = warningsOf(table(entry), entry);
    expectStanding(warnings, 'tokensOver');
    expect(warnings.find(w => w.code === 'tokensOver')?.params).toMatchObject({ given: 4, free: 3 });
  });

  // LRR 81.5: "Each player gains two command tokens."
  // Checks: the note held but not named in the entry gives nothing: three tokens are too many.
  // Why the check is NOT redundant here: a promissory note acts when it is played (69.1), and this one was not.
  test('promissory:ce held but not played leaves three tokens too many', () => {
    const entry = status([2, 1, 0], []);
    expectStanding(warningsOf(table(entry), entry), 'tokensOver');
  });

  // "Then, return this card to the L1Z1X player."
  // Checks: once played the note leaves my hand for the L1Z1X player's.
  // Why: LRR 69.3, a note whose text returns it goes back to its owner after it is resolved.
  test('promissory:ce goes back to the L1Z1X player once played', () => {
    const end = endOf(table(status([1, 1, 0])));
    expect(end.holdings.promissory).not.toContain(NOTE);
    expect(end.rivals?.o1.holdings.promissory).toContain(NOTE);
  });

  // LRR 69.2: "A player cannot play their own promissory note."
  // Checks: the L1Z1X player playing their own note is warned of, and gains no token.
  // Why the check is NOT redundant here: the note is written for the other players.
  test('promissory:ce the L1Z1X player cannot play their own note', () => {
    const entry = using(statusTokens(2, 1, 0), `${id}@me`);
    const warnings = warningsOf(table(entry, 'l1z1x', [`${id}@me`]), entry);
    expectStanding(warnings, 'ownPromissory');
    expectStanding(warnings, 'tokensOver');
  });

  test('promissory:ce is a play effect that waives nothing', () => {
    const { pack } = table(status([1, 1, 0]));
    expect(effect(pack, id).tier).toBe('play');
  });
});
