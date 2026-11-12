import { describe, expect, test } from 'vitest';
import { CARD } from '../../../strategy';
import type { AnyWarningCode } from '../../../types';
import { bench, effect, expectNone, expectStanding, NO_PAYMENT, quote, secondary, warningsOf } from '../kit';
import { id } from './analytical';

/** The new check of pass 2: a technology researched without its prerequisites (90.12). */
const CODE = 'prerequisitesMissing' as AnyWarningCode;

/** The secondary of Technology researches one technology; the player owns `technologies` before. */
const run = (faction: string, technology: string, technologies: string[] = []) => {
  const entry = secondary(CARD.technology, { researched: [technology], payment: NO_PAYMENT });
  return { entry, ...bench({ faction, start: { technologies }, entries: [entry] }) };
};

describe('ability:analytical Analytical', () => {
  // "When you research a technology that is not a unit upgrade technology: You may ignore 1 prerequisite."
  // Checks: the Jol-Nar research Instinct Training (one biotic prerequisite) without a biotic technology: no warning
  // of prerequisites.
  // Why the default check does not apply: the technology lacks one prerequisite and the ability ignores one; a
  // `modify` of the point `prerequisites`, so nothing is made, nothing is listed as waived.
  test('ability:analytical a technology that lacks one prerequisite is researched without a warning', () => {
    const table = run('jolnar', 'technology:it');
    quote(table.pack, id, 'When you research a technology that is not a unit upgrade technology: You may ignore 1 prerequisite.');
    expectNone(warningsOf(table, table.entry), CODE);
  });

  // LRR 90.12 (90.8.1): "A technology card's prerequisites indicate the number and color of technologies a player must
  //  own to research that technology card."
  // Checks: another faction researching Instinct Training without a biotic technology is warned of.
  // Why the check is NOT redundant here: Analytical is the Jol-Nar's own.
  test('ability:analytical another faction lacking one prerequisite is warned of', () => {
    const table = run('sol', 'technology:it');
    expectStanding(warningsOf(table, table.entry), CODE);
  });

  // Checks: Hyper Metabolism needs two biotic technologies; the Jol-Nar own none and are still one short.
  // Why the check is NOT redundant here: the ability ignores one prerequisite, not two.
  test('ability:analytical a technology that lacks two prerequisites is still warned of', () => {
    const table = run('jolnar', 'technology:hm');
    expectStanding(warningsOf(table, table.entry), CODE);
  });

  // "... a technology that is not a unit upgrade technology ..."
  // Checks: Destroyer II needs two warfare technologies; with Plasma Scoring owned it lacks one, and is warned of.
  // Why the check is NOT redundant here: unit upgrades are excluded by the ability's own words.
  test('ability:analytical a unit upgrade that lacks one prerequisite is still warned of', () => {
    const table = run('jolnar', 'technology:dd2', ['technology:ps']);
    expectStanding(warningsOf(table, table.entry), CODE);
  });

  test('ability:analytical is a passive effect that lowers the prerequisites of a technology', () => {
    const { pack } = run('jolnar', 'technology:it');
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify?.prerequisites?.(2, { technology: 'technology:hm' })).toBe(1);
    expect(effect(pack, id).modify?.prerequisites?.(1, { technology: 'technology:dd2', upgrade: true })).toBe(1);
  });
});
