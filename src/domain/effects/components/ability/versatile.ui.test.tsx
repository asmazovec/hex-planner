import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, shown, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { bench, quote, statusTokens } from '../kit';
import { id } from './versatile';

uiBench();

const status = (faction: string, tokens: number) => {
  const entry = statusTokens(tokens, 0, 0);
  const table = bench({ faction, entries: [entry] });
  showWarnings(table, entry);
  return table;
};

// "When you gain command tokens during the status phase: Gain 1 additional command token."
// Checks: the Sol player's status entry with three tokens shows no warning.
// Why the default limit does not apply: the ability makes the tokens of the status phase three (a modify).
test('ability:versatile three tokens in the status phase show no warning for the Sol player', () => {
  const table = status('sol', 3);
  quote(table.pack, id, 'Gain 1 additional command token.');
  expectNotShown('tokensOver');
});

// Checks: four tokens show the warning standing, naming three free.
// Why the check is NOT redundant here: one more token than the ability gives.
test('ability:versatile a fourth token shows the warning against three', () => {
  status('sol', 4);
  expectShownStanding('tokensOver');
  expect(shown('tokensOver')[0].textContent).toContain('with 3 free');
});

// LRR 81.5.
// Checks: another faction's three tokens show the warning standing.
// Why the check is NOT redundant here: the ability is the Sol player's own.
test('ability:versatile another faction\'s three tokens show the warning standing', () => {
  status('letnev', 3);
  expectShownStanding('tokensOver');
});
