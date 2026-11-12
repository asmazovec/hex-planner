import { describe, expect, test } from 'vitest';
import type { UnitCounts } from '../../../types';
import { bench, effect, endOf, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './liberate';

/**
 * A carrier waits next to the target with `aboard`; it flies in and lands `landed` on t1 (resources 2, influence 1).
 * `control` gives planets already held when the plan begins.
 */
const invade = (faction: string, aboard: UnitCounts, landed: UnitCounts, planetId = 't1', control: Record<string, 'me'> = {}) => {
  const move = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, ...aboard } }], landings: [{ planetId, units: landed }] });
  return { move, ...bench({ faction, expansions: ['pok', 'te'], units: { [NEAR]: { carrier: 1, ...aboard } }, entries: [move], game: { planetControl: control } }) };
};

describe('ability:liberate Liberate', () => {
  // "When you gain control of a planet: ready that planet if it contains a number of your infantry equal to or greater
  //  than that planet's resource value"
  // Checks: two infantry take t1, whose resource value is 2; the planet is mine and ready at the end of the plan.
  // Why the check is redundant here: a planet gained enters exhausted (49.5.2), and the ability readies it at once
  // when its infantry reach its resources.
  test.fails('ability:liberate readies a planet gained with as many infantry as its resources', () => {
    const table = invade('bastion', { infantry: 2 }, { infantry: 2 });
    quote(table.pack, id, 'ready that planet if it contains a number of your infantry equal to or greater than that planet\'s resource value');
    const end = endOf(table);
    expect(end.control.t1).toBe('me');
    expect(end.exhausted).not.toContain('t1');
  });

  // "... otherwise, place 1 infantry on that planet."
  // Checks: one infantry takes t1 (resources 2): the planet stays exhausted, and one more infantry stands on it.
  // Why the check is NOT redundant here: too few infantry, so the planet is not readied; the ability gives the infantry
  // instead.
  test.fails('ability:liberate places one infantry on a planet gained with fewer infantry than its resources', () => {
    const table = invade('bastion', { infantry: 1 }, { infantry: 1 });
    quote(table.pack, id, 'otherwise, place 1 infantry on that planet.');
    const end = endOf(table);
    expect(end.exhausted).toContain('t1');
    expect(end.ground.t1).toEqual({ infantry: 2 });
  });

  // Ruling (Last Bastion, Liberate 2): "The number of mechs is irrelevant for determining which effect to resolve."
  // Checks: one infantry and one mech take t1 (resources 2); only the infantry count, so the planet is not readied and
  // an infantry is placed.
  // Why the check is NOT redundant here: the mech does not count towards the resource value.
  test.fails('ability:liberate does not count mechs: an infantry and a mech on a planet of 2 resources get one more infantry', () => {
    const table = invade('bastion', { infantry: 1, mech: 1 }, { infantry: 1, mech: 1 });
    const end = endOf(table);
    expect(end.exhausted).toContain('t1');
    expect(end.ground.t1).toEqual({ infantry: 2, mech: 1 });
  });

  // LRR 49.5.2 (a planet newly gained is exhausted).
  // Checks: another faction takes t1 with two infantry: the planet enters exhausted, and nothing is placed.
  // Why the check is NOT redundant here: Liberate is the Last Bastion's own ability.
  test('ability:liberate is the Last Bastion\'s own: another faction\'s planet enters exhausted with no extra infantry', () => {
    const table = invade('sol', { infantry: 2 }, { infantry: 2 });
    const end = endOf(table);
    expect(end.control.t1).toBe('me');
    expect(end.exhausted).toContain('t1');
    expect(end.ground.t1).toEqual({ infantry: 2 });
  });

  // "When you gain control of a planet: ..."
  // Checks: one infantry lands on t1 that the Last Bastion already controls; no control is gained, so no infantry is
  // placed.
  // Why the check is NOT redundant here: the ability triggers on gaining control, not on every landing.
  test('ability:liberate does nothing on a planet already controlled', () => {
    const table = invade('bastion', { infantry: 1 }, { infantry: 1 }, 't1', { t1: 'me' });
    expect(endOf(table).ground.t1).toEqual({ infantry: 1 });
  });

  // Checks: the ability is applied by itself, not shown only: its effect is no longer a mere hint.
  test.fails('ability:liberate is applied by the replay, not a hint', () => {
    const { pack } = invade('bastion', { infantry: 1 }, { infantry: 1 });
    expect(effect(pack, id).tier).not.toBe('hint');
  });
});
