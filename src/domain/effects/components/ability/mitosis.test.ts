import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, GameState, UnitCounts } from '../../../types';
import { bench, effect, endOf, expectNone, expectStanding, HOME, quote, statusTokens, tactical, warningsOf } from '../kit';
import { id } from './mitosis';

/** The check pass 2 adds to the production step for everyone: infantry produced by space docks that may not produce them. */
const DOCK_INFANTRY = 'dockInfantry' as AnyWarningCode;

/** A production in the home system, whose planet h1 holds my space dock (3 resources + 2: Production 5). */
const build = (faction: string, production: UnitCounts) => {
  const move = tactical(HOME, { production });
  return { move, ...bench({ faction, expansions: ['pok'], entries: [move], game: { docks: ['h1'] } }) };
};

/** The infantry on the planets a player controls. */
const infantryOnPlanets = (state: GameState): number =>
  Object.entries(state.ground).filter(([planetId]) => state.control[planetId] === 'me').reduce((sum, [, units]) => sum + (units.infantry ?? 0), 0);

describe('ability:mitosis Mitosis', () => {
  // "Your space docks cannot produce infantry"
  // LRR 68.1 note 4: "Production value from Arborec space docks cannot be used to produce infantry, even if the Arborec
  //  player controls other units that have Production in the same system."
  // Checks: the Arborec dock produces two infantry; the production step warns that the dock cannot produce them.
  // Why the check is NOT redundant here: this is the reverse of a waiver; the ability adds a limit the rules do not
  // have for anyone else, so the warning stands and nothing lifts it.
  test('ability:mitosis an Arborec space dock producing infantry is warned of', () => {
    const table = build('arborec', { infantry: 2 });
    quote(table.pack, id, 'Your space docks cannot produce infantry');
    expectStanding(warningsOf(table, table.move), DOCK_INFANTRY);
  });

  // LRR 68.1: "This value is the maximum number of units that this unit can produce."
  // Checks: another faction's dock produces infantry with no warning.
  // Why the check is NOT redundant here: a space dock produces infantry for everyone but the Arborec (79, 68.1).
  test('ability:mitosis is the Arborec\'s own: another faction\'s dock produces infantry freely', () => {
    const table = build('sol', { infantry: 2 });
    expectNone(warningsOf(table, table.move), DOCK_INFANTRY);
    expectNone(warningsOf(table, table.move), 'productionOver');
  });

  // Arborec note 2: "The Arborec player may produce Letani Behemoth with their space docks."
  // Checks: a mech and ships from the Arborec dock make no warning of the dock.
  // Why the check is NOT redundant here: the ability names infantry only; a mech is a ground force but not infantry.
  test('ability:mitosis an Arborec space dock still produces a mech and ships', () => {
    const table = build('arborec', { mech: 1, cruiser: 1 });
    expectNone(warningsOf(table, table.move), DOCK_INFANTRY);
    expectNone(warningsOf(table, table.move), 'productionOver');
  });

  // "At the start of the status phase: Place 1 infantry from your reinforcements on any planet you control."
  // Checks: after a status phase the Arborec have one more infantry on a planet they control.
  // Why the default does not apply: the status phase places no units for anyone (81); the ability adds one, and the
  // placing is mandatory (Arborec note 3), so the replay makes it without a choice of the player.
  test('ability:mitosis places 1 infantry on a planet I control at the start of the status phase', () => {
    const table = bench({ faction: 'arborec', expansions: ['pok'], entries: [statusTokens(2, 0, 0)] });
    quote(table.pack, id, 'At the start of the status phase: Place 1 infantry from your reinforcements on any planet you control');
    expect(infantryOnPlanets(endOf(table))).toBe(1);
  });

  // Checks: one infantry per status phase: two rounds give two.
  // Why the check is NOT redundant here: "at the start of the status phase" is once a round, not once per entry.
  test('ability:mitosis places one infantry each round, not more', () => {
    const table = bench({ faction: 'arborec', expansions: ['pok'], rounds: [[statusTokens(2, 0, 0)], [statusTokens(1, 0, 0), statusTokens(1, 0, 0)]] });
    expect(infantryOnPlanets(endOf(table))).toBe(2);
  });

  // Checks: another faction's status phase places nothing.
  // Why the check is NOT redundant here: the ability is printed on the Arborec sheet.
  test('ability:mitosis another faction gets no infantry in the status phase', () => {
    const table = bench({ faction: 'sol', entries: [statusTokens(2, 0, 0)] });
    expect(infantryOnPlanets(endOf(table))).toBe(0);
  });

  // Checks: the ability is passive and changes the count (the dock's infantry, the status placement); it lifts nothing.
  test('ability:mitosis is a passive effect that changes the count and waives nothing', () => {
    const { pack } = build('arborec', {});
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify).toBeDefined();
  });

  // "At the start of the status phase: Place 1 infantry" - once, whatever else the round holds.
  // Checks: a round with a tactical action and a status entry gives one infantry, not two.
  // Why the check is NOT redundant here: the moment is fired from the status entry and from the end of the phase.
  test('ability:mitosis a round with an action and a status entry places one infantry', () => {
    const table = bench({ faction: 'arborec', expansions: ['pok'], entries: [tactical(HOME, {}), statusTokens(2, 0, 0)] });
    expect(infantryOnPlanets(endOf(table))).toBe(1);
  });

  test('ability:mitosis a round with only an action (no status entry) places none yet', () => {
    const table = bench({ faction: 'arborec', expansions: ['pok'], entries: [tactical(HOME, {})] });
    expect(infantryOnPlanets(endOf(table))).toBe(0);
  });
});
