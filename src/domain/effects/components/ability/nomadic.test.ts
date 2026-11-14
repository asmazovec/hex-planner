import { describe, expect, test } from 'vitest';
import type { ExtensionCode } from '../../../types';
import type { Entry, Game } from '../../../../testing/old/domain/types';
import { bench, effect, expectNone, expectStanding, expectWaived, quote, statusTokens, warningsOf } from '../kit';
import { id } from './nomadic';

/** The check pass 2 adds to the status step, LRR 61.16 (src/domain/rules/codes/scoreWithoutHome.ts). */
const CODE = 'scoreWithoutHome' as ExtensionCode;
const PUBLIC = 'publicObjective:develop';
const SECRET = 'secretObjective:dtgs';

/** The status phase scores `objective`; `game` decides who controls the home planets h1 and h2. */
const scoring = (faction: string, objective: string, game: Partial<Game>) => {
  const status = { ...statusTokens(2, 0, 0), scored: [objective], vp: 1 } as Entry;
  return { status, ...bench({ faction, entries: [status], game }) };
};
const homeLost: Partial<Game> = { planetControl: { h1: 'enemy' } };

describe('ability:nomadic Nomadic', () => {
  // "You can score objectives even if you do not control the planets in your home system."
  // Checks: the Saar score a public objective while an opponent holds Home One; the warning of 61.16 is listed and
  // lifted by Nomadic.
  // Why the check is redundant here: LRR 61.16 says "A player cannot score public objectives if that player does not
  // control each planet in their home system"; the ability says the Saar can.
  test('ability:nomadic scores a public objective without the home system: the warning is waived', () => {
    const saar = scoring('saar', PUBLIC, homeLost);
    quote(saar.pack, id, 'You can score objectives even if you do not control the planets in your home system.');
    expectWaived(warningsOf(saar, saar.status), CODE, id);
  });

  // LRR 61.16: "A player cannot score public objectives if that player does not control each planet in their home system."
  // Checks: another faction scoring the same objective without its home planet is warned of (the check is new: red
  // until the status step makes it).
  // Why the check is NOT redundant here: nothing this player holds speaks of scoring without the home system.
  test('ability:nomadic is the Saar\'s own: another faction without its home planet is warned of', () => {
    const sol = scoring('sol', PUBLIC, homeLost);
    expectStanding(warningsOf(sol, sol.status), CODE);
  });

  // LRR 61.16 speaks of public objectives only.
  // Checks: a secret objective scored without the home system is not warned of, for anyone.
  // Why there is nothing to lift: the rule never covered secret objectives.
  test('ability:nomadic has nothing to lift for a secret objective: none is warned of', () => {
    const sol = scoring('sol', SECRET, homeLost);
    expectNone(warningsOf(sol, sol.status), CODE);
  });

  // Checks: with every home planet held nothing is warned of, so nothing is waived either.
  test('ability:nomadic with the home system held makes no warning at all', () => {
    const saar = scoring('saar', PUBLIC, {});
    expectNone(warningsOf(saar, saar.status), CODE);
  });

  test('ability:nomadic is a passive effect that waives the home system check of scoring', () => {
    const { pack } = scoring('saar', PUBLIC, {});
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).permit?.map(w => w.code)).toEqual([CODE]);
  });
});
