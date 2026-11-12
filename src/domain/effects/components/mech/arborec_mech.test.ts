import { describe, expect, test } from 'vitest';
import type { Entry, GameState, UnitId } from '../../../types';
import { adjust, bench, effect, endOf, expectNone, quote, statusTokens, using, warningsOf } from '../kit';
import { id } from './arborec_mech';

/** Two infantry stand on the home planet h1 before the round's status phase. */
const status = (faction: string, entry: Entry) =>
  ({ entry, ...bench({ faction, expansions: ['pok'], entries: [adjust({ ground: { h1: { infantry: 2 } } }, 'strategy'), entry] }) });

/** The units of a type on the planets a player controls. */
const onPlanets = (state: GameState, unit: UnitId): number =>
  Object.entries(state.ground).filter(([planetId]) => state.control[planetId] === 'me').reduce((sum, [, units]) => sum + (units[unit] ?? 0), 0);

describe('mech:arborec_mech Letani Behemoth', () => {
  // "DEPLOY: When you would use your Mitosis faction ability you may replace 1 of your infantry with 1 mech from your
  //  reinforcements instead."
  // Checks: the status entry names the mech in «Used»; at the start of the status phase one of my two infantry becomes
  // a mech, instead of a third infantry being placed by Mitosis; naming the mech is not warned as a card not held.
  // Why the default does not apply: a mech is placed by production only (67); DEPLOY places it at another moment, and
  // the mech of my own faction sheet is mine to deploy without being a card in hand.
  test('mech:arborec_mech deployed by Mitosis replaces one infantry with a mech', () => {
    const table = status('arborec', using(statusTokens(2, 0, 0), id));
    quote(table.pack, id, 'you may replace 1 of your infantry with 1 mech from your reinforcements instead');
    const end = endOf(table);
    expect(onPlanets(end, 'mech')).toBe(1);
    expect(onPlanets(end, 'infantry')).toBe(1);
    expectNone(warningsOf(table, table.entry), 'componentNotHeld');
  });

  // Checks: without naming the mech the status phase deploys none.
  // Why the check is NOT redundant here: DEPLOY is "may"; it happens only when the player chooses it.
  test('mech:arborec_mech not named in the status entry deploys no mech', () => {
    const table = status('arborec', statusTokens(2, 0, 0));
    expect(onPlanets(endOf(table), 'mech')).toBe(0);
  });

  // "When you would use your Mitosis faction ability"
  // Checks: another faction naming the Arborec mech gets no mech.
  // Why the check is NOT redundant here: the deploy hangs on Mitosis, which only the Arborec have.
  test('mech:arborec_mech has no Mitosis to hang on for another faction', () => {
    const table = status('sol', using(statusTokens(2, 0, 0), id));
    expect(onPlanets(endOf(table), 'mech')).toBe(0);
    expect(onPlanets(endOf(table), 'infantry')).toBe(2);
  });

  // Checks: the mech is a play named by its entry.
  test('mech:arborec_mech is a play effect', () => {
    const { pack } = status('arborec', statusTokens(0, 0, 0));
    expect(effect(pack, id).tier).toBe('play');
  });

  test.todo('mech:arborec_mech with all four mechs on the board removes one from a system without my command token first (67.5.1): the replay does not count the mech pieces placed outside production');
});
