import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry } from '../../../types';
import { bench, componentAction, effect, endOf, expectStanding, NEAR, quote, warningsOf } from '../kit';
import { id } from './stellarconverter';

/** The check pass 2 adds for a planet the card does not allow; written as a string, as the code does not exist yet. */
const CODE = 'converterTarget' as AnyWarningCode;
const OPPONENTS = [{ id: 'o1', faction: 'hacan', vp: 0, seat: 2, color: 2 }];
const convert = (planetId: string) => componentAction(id, { choices: { planetId } });
/** My dreadnought (BOMBARDMENT) in NEAR, beside the target; t1 is held by o1 with two infantry, h1 and h2 are mine. */
const table = (entries: Entry[]) => bench({
  faction: 'sol', expansions: ['pok'], start: { relics: [id] }, entries, units: { [NEAR]: { dreadnought: 1 } },
  game: {
    opponents: OPPONENTS, enemyGround: { t1: { o1: { infantry: 2 } } },
    planetControl: { h1: 'me', h2: 'me', t1: 'enemy' }, planetOwner: { t1: 'o1' },
  },
});

describe('relic:stellarconverter Stellar Converter', () => {
  // "destroy all units on that planet and purge its attachments and its planet card."
  // Checks: t1, beside my dreadnought, is converted: o1's infantry there are gone and nobody controls it; the relic is
  // purged.
  // Why it is counted here: a play; the units and the control of the planet are the board's.
  test('relic:stellarconverter destroys the units on the planet and its control', () => {
    const converter = table([convert('t1')]);
    quote(converter.pack, id, 'destroy all units on that planet and purge its attachments and its planet card');
    const end = endOf(converter);
    expect(end.rivals?.o1?.ground.t1 ?? {}).toEqual({});
    expect(end.control.t1).toBeUndefined();
    expect(end.holdings.relics).not.toContain(id);
  });

  // "Choose 1 non-home, non-legendary planet other than Mecatol Rex"; Stellar Converter note 3: "A player cannot target
  //  a planet they control with Stellar Converter."
  // Checks: aiming it at h1, a planet of my home system that I control, is warned of.
  // Why the check is NOT redundant here: the card names the planets it may destroy, and a home planet is not one.
  test('relic:stellarconverter aimed at a home planet of mine is warned of', () => {
    const play = convert('h1');
    expectStanding(warningsOf(table([play]), play), CODE);
  });

  test.todo('relic:stellarconverter "adjacent to 1 or more of your units that have BOMBARDMENT": the check of the target\'s neighbours waits for the target code');
  test.todo('relic:stellarconverter "place the destroyed planet token": no state of the plan keeps a destroyed planet');

  test('relic:stellarconverter is a play effect', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
