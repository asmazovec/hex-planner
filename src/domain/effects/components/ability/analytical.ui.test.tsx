import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { CARD } from '../../../strategy';
import type { AnyWarningCode } from '../../../types';
import { bench, NO_PAYMENT, quote, secondary } from '../kit';
import { id } from './analytical';

uiBench();

const CODE = 'prerequisitesMissing' as AnyWarningCode;
const run = (faction: string, technology: string) => {
  const entry = secondary(CARD.technology, { researched: [technology], payment: NO_PAYMENT });
  return { entry, table: bench({ faction, entries: [entry] }) };
};

// "When you research a technology that is not a unit upgrade technology: You may ignore 1 prerequisite."
// Checks: the Jol-Nar research of Instinct Training (one biotic prerequisite, none owned) shows no warning of
// prerequisites.
// Why the default check does not apply: the one prerequisite lacking is the one the ability ignores (a `modify`).
test('ability:analytical a technology lacking one prerequisite shows no warning', () => {
  const { entry, table } = run('jolnar', 'technology:it');
  quote(table.pack, id, 'You may ignore 1 prerequisite.');
  showWarnings(table, entry);
  expectNotShown(CODE);
});

// LRR 90.12: research must satisfy every prerequisite.
// Checks: Hyper Metabolism (two biotic, none owned) shows its warning standing for the Jol-Nar.
// Why the check is NOT redundant here: one prerequisite is ignored, the second still lacks.
test.fails('ability:analytical a technology lacking two prerequisites shows its warning standing', () => {
  const { entry, table } = run('jolnar', 'technology:hm');
  showWarnings(table, entry);
  expectShownStanding(CODE);
});

// Checks: another faction researching Instinct Training without a biotic technology sees the warning standing.
// Why the check is NOT redundant here: Analytical is the Jol-Nar's own.
test.fails('ability:analytical another faction lacking one prerequisite sees its warning standing', () => {
  const { entry, table } = run('sol', 'technology:it');
  showWarnings(table, entry);
  expectShownStanding(CODE);
});
