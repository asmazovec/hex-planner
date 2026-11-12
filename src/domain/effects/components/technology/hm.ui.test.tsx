import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { bench, quote, statusTokens } from '../kit';
import { id } from './hm';

uiBench();

const status = (tactic: number, fleet: number, strategy: number, technologies: string[]) => {
  const entry = statusTokens(tactic, fleet, strategy);
  return { entry, table: bench({ faction: 'arborec', start: { technologies }, entries: [entry] }) };
};

// "During the status phase, gain 3 command tokens instead of 2."
// Checks: the warnings of a status entry that takes three tokens show nothing about tokens gained.
// Why the check is redundant here: with the card the status phase gives three tokens; the number changes (a modify),
// so the warning is not made at all rather than shown as allowed.
test('technology:hm three tokens of the status phase show no warning', () => {
  const { entry, table } = status(1, 1, 1, [id]);
  quote(table.pack, id, 'gain 3 command tokens instead of 2');
  showWarnings(table, entry);
  expectNotShown('tokensOver');
});

// LRR 81.5: "Each player gains two command tokens."
// Checks: the same entry without the card shows the warning, standing.
// Why the check is NOT redundant here: nothing this player holds changes the tokens of the status phase.
test('technology:hm not held, three tokens show the warning standing', () => {
  const { entry, table } = status(1, 1, 1, []);
  showWarnings(table, entry);
  expectShownStanding('tokensOver');
});

// Checks: with the card a fourth token is still shown as a warning that stands.
// Why the check is NOT redundant here: the card gives three, not four.
test('technology:hm a fourth token is shown standing even with the card', () => {
  const { entry, table } = status(2, 1, 1, [id]);
  showWarnings(table, entry);
  expectShownStanding('tokensOver');
});
