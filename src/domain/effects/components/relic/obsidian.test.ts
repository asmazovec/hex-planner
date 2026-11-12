import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry } from '../../../types';
import { adjust, bench, effect, expectNone, expectStanding, quote, warningsOf } from '../kit';
import { id } from './obsidian';

/**
 * The check pass 2 adds: more secret objectives, scored and unscored, than the limit (61.21, 45.4). Written as a
 * string, as the code does not exist yet.
 */
const CODE = 'secretsOverLimit' as AnyWarningCode;
const SECRETS = ['secretObjective:ans', 'secretObjective:btgk', 'secretObjective:ctr', 'secretObjective:csl', 'secretObjective:dtgs'];
/** The entry that draws the n-th secret objective, three being held before it. */
const draw = (n: number): Entry => ({ ...adjust({}), gains: SECRETS.slice(3, n) });
const table = (entry: Entry, relics = [id]) =>
  bench({ faction: 'sol', expansions: ['pok'], start: { relics, secrets: SECRETS.slice(0, 2), scored: SECRETS.slice(2, 3) }, entries: [entry] });

describe('relic:obsidian The Obsidian', () => {
  // "You can have 1 additional scored or unscored secret objective."
  // Checks: two unscored and one scored secret objective, and a fourth drawn: no warning with the relic.
  // Why the default limit does not apply: the limit of three (61.21) is raised by one, a modify of the number; the
  // check runs against four and nothing is listed as waived.
  test('relic:obsidian lets a fourth secret objective be held', () => {
    const entry = draw(4);
    const obsidian = table(entry);
    quote(obsidian.pack, id, 'You can have 1 additional scored or unscored secret objective.');
    expectNone(warningsOf(obsidian, entry), CODE);
  });

  // LRR 45.4: "If a player has more than three secret objective cards after drawing a secret objective, they must
  //  choose one of their unscored secret objectives and return it to the secret objective deck."
  // Checks: the same fourth objective without the relic is warned of.
  // Why the check is NOT redundant here: no component of this player raises the limit.
  test('relic:obsidian not held, a fourth secret objective is warned of', () => {
    const entry = draw(4);
    expectStanding(warningsOf(table(entry, []), entry), CODE);
  });

  // Checks: a fifth objective is beyond the raised limit of four.
  // Why the check is NOT redundant here: the relic adds one objective, not any number.
  test('relic:obsidian a fifth secret objective is warned of', () => {
    const entry = draw(5);
    expectStanding(warningsOf(table(entry), entry), CODE);
  });

  test.todo('relic:obsidian "When you gain this card, draw 1 secret objective": the objective is entered as a gain of the same entry');

  test('relic:obsidian is a passive effect that changes the secret objective limit', () => {
    const { pack } = table(draw(4));
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify).toBeDefined();
  });
});
