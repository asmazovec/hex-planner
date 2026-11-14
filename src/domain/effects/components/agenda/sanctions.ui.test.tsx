import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, shown, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { componentsOf } from '../../../components';
import type { AnyWarningCode } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { adjust, bench, quote } from '../kit';
import { id } from './sanctions';

uiBench();

/** The check pass 2 adds for everyone (LRR 2.4): not in the app yet. */
const HAND = 'handOverLimit' as AnyWarningCode;

function drawing(n: number, passed: boolean) {
  const { pack } = bench({ faction: 'sol' });
  const draw: Entry = { ...adjust({}), gains: componentsOf(pack).filter(c => c.kind === 'actionCard').slice(0, n).map(c => c.id) };
  return { draw, ...bench({ faction: 'sol', rounds: [passed ? [{ ...adjust({}, 'agenda'), gains: [id] }] : [], [draw]] }) };
}

// "For: Each player can have a maximum of 3 action cards in their hand."
// Checks: under the law the entry that brings a fourth action card shows the hand limit warning, standing, naming 3.
// Why the default limit does not apply: the law changes the number of the hand limit (2.4.1); it does not lift it.
test('agenda:sanctions a fourth action card under the law shows the hand limit of 3', () => {
  const table = drawing(4, true);
  quote(table.pack, id, 'a maximum of 3 action cards');
  showWarnings(table, table.draw);
  expectShownStanding(HAND);
  expect(shown(HAND)[0].textContent).toContain('3');
});

// LRR 2.4: "Each player's hand can have a maximum of seven action cards."
// Checks: without the law four action cards show no hand limit warning.
// Why the check is NOT redundant here: the law is not in play; the limit is seven.
test('agenda:sanctions not in play, four action cards show no hand limit warning', () => {
  const table = drawing(4, false);
  showWarnings(table, table.draw);
  expectNotShown(HAND);
});
