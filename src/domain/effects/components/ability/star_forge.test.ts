import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, UnitCounts } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { adjust, bench, componentAction, effect, endOf, expectNone, expectStanding, HOME, NEAR, quote, warningsOf } from '../kit';
import { id } from './star_forge';

/** The code pass 2 adds for a Star Forge aimed at a system without a war sun of mine. */
const NO_WAR_SUN = 'warSunAbsent' as AnyWarningCode;

const forge = (systemId: string, unit: 'fighter' | 'destroyer') => componentAction(id, { choices: { systemId, unit } });
const table = (faction: string, entries: Entry[], units: Record<string, UnitCounts> = { [HOME]: { warsun: 1 } }) =>
  bench({ faction, expansions: ['pok'], units, entries });

describe('ability:star_forge Star Forge', () => {
  // "ACTION: Spend 1 token from your strategy pool to place either 2 fighters or 1 destroyer from your reinforcements
  //  in a system that contains 1 or more of your war suns."
  // Checks: a destroyer is placed beside the war sun and the strategy pool goes from 2 to 1.
  // Why the check is redundant here: units otherwise reach the board by production (67), paid for and from a space
  // dock; the ability places them for a strategy token, with no dock and no payment, so no production check is made.
  test('ability:star_forge places a destroyer beside the war sun for one strategy token', () => {
    const play = forge(HOME, 'destroyer');
    const muaat = table('muaat', [play]);
    quote(muaat.pack, id, 'Spend 1 token from your strategy pool to place either 2 fighters or 1 destroyer');
    const end = endOf(muaat);
    expect(end.systems[HOME]).toEqual({ warsun: 1, destroyer: 1 });
    expect(end.strategy).toBe(1);
    expectNone(warningsOf(muaat, play), 'noProduction');
  });

  // Checks: the other choice of the card, two fighters.
  test('ability:star_forge places two fighters when they are chosen', () => {
    const muaat = table('muaat', [forge(HOME, 'fighter')]);
    expect(endOf(muaat).systems[HOME]).toEqual({ warsun: 1, fighter: 2 });
  });

  // "... in a system that contains 1 or more of your war suns." Ruling (Embers of Muaat, Star Forge 1): "The Muaat
  //  player cannot use Star Forge if the do not have a war sun on the game board."
  // Checks: aimed at a system without a war sun, the play is warned of, and the destroyer is placed all the same.
  // Why the check is NOT redundant here: the war sun is the ability's own condition.
  test('ability:star_forge aimed at a system without a war sun is warned of', () => {
    const play = forge(NEAR, 'destroyer');
    const muaat = table('muaat', [play]);
    expectStanding(warningsOf(muaat, play), NO_WAR_SUN);
    expect(endOf(muaat).systems[NEAR]).toEqual({ destroyer: 1 });
  });

  // "Spend 1 token from your strategy pool ..."
  // Checks: with an empty strategy pool the play is warned of as a token not there.
  // Why the check is NOT redundant here: the token is the ability's price.
  test('ability:star_forge with an empty strategy pool is warned of', () => {
    const play = forge(HOME, 'destroyer');
    const muaat = table('muaat', [adjust({ strategy: -2 }), play]);
    expectStanding(warningsOf(muaat, play), 'shortStrategy');
  });

  // Checks: the ability is the Muaat's: another faction's component action naming it places nothing.
  // Why the check is NOT redundant here: Star Forge is printed on the Muaat sheet only.
  test('ability:star_forge is the Muaat\'s own: another faction places nothing with it', () => {
    const sol = table('sol', [forge(HOME, 'destroyer')]);
    expect(endOf(sol).systems[HOME]).toEqual({ warsun: 1 });
  });

  test('ability:star_forge is a play effect', () => {
    expect(effect(table('muaat', []).pack, id).tier).toBe('play');
  });
});
