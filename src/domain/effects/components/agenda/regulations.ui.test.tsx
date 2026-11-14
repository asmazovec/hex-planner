import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, shown, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { AnyWarningCode } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { adjust, bench, quote, statusTokens } from '../kit';
import { id } from './regulations';

uiBench();

/** The check pass 2 adds (the fleet pool against `fleetPoolMax`): not in the app yet. */
const TOKENS = 'fleetPoolTokens' as AnyWarningCode;

function gaining(passed: boolean) {
  const status = statusTokens(0, 2, 0);
  const law: Entry = { ...adjust({}, 'agenda'), gains: [id] };
  return { status, ...bench({ faction: 'sol', rounds: [passed ? [law] : [], [status]] }) };
}

// "For: Each player cannot have more than 4 tokens in their fleet pool."
// Checks: under the law the status phase that brings the fleet pool to 5 shows the warning, standing, naming 4.
// Why the default does not apply: the rules have no limit here; the law sets the number 4.
test('agenda:regulations a fifth token in the fleet pool under the law shows the limit of 4', () => {
  const table = gaining(true);
  quote(table.pack, id, 'cannot have more than 4 tokens in their fleet pool');
  showWarnings(table, table.status);
  expectShownStanding(TOKENS);
  expect(shown(TOKENS)[0].textContent).toContain('4');
});

// Checks: without the law the same five tokens show no warning.
// Why the check is NOT redundant here: there is no limit on the fleet pool without the law.
test('agenda:regulations not in play, five tokens show no warning', () => {
  const table = gaining(false);
  showWarnings(table, table.status);
  expectNotShown(TOKENS);
});
