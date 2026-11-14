import { describe, expect, test } from 'vitest';
import { componentsOf } from '../../../components';
import type { AnyWarningCode, DataPack, Entry } from '../../../types';
import { adjust, bench, effect, expectNone, expectStanding, quote, warningsOf } from '../kit';
import { id } from './sanctions';

/** The check pass 2 adds for everyone (LRR 2.4, at the step of the entry that brings the cards): not in the app yet. */
const HAND = 'handOverLimit' as AnyWarningCode;

const law = (): Entry => ({ ...adjust({}, 'agenda'), gains: [id] });
const cards = (pack: DataPack, n: number): string[] => componentsOf(pack).filter(c => c.kind === 'actionCard').slice(0, n).map(c => c.id);
/** Round 1 passes the law when `passed`; round 2 draws `n` action cards into an empty hand. */
function drawing(n: number, passed: boolean) {
  const { pack } = bench({ faction: 'sol' });
  const draw: Entry = { ...adjust({}), gains: cards(pack, n) };
  return { draw, ...bench({ faction: 'sol', rounds: [passed ? [law()] : [], [draw]] }) };
}

describe('agenda:sanctions Executive Sanctions', () => {
  // "For: Each player can have a maximum of 3 action cards in their hand."
  // Checks: under the law a fourth action card in hand is warned of against a limit of 3.
  // Why the default limit does not apply: LRR 2.4.1 "A game effect can increase or decrease the number of cards a
  // player's hand can have"; the law changes the number (a `modify` of `handLimit`), it does not lift the check, so
  // nothing is listed as waived and the warning names 3.
  test('agenda:sanctions in play warns of a fourth action card against the limit of 3', () => {
    const table = drawing(4, true);
    quote(table.pack, id, 'Each player can have a maximum of 3 action cards in their hand.');
    const warnings = warningsOf(table, table.draw);
    expectStanding(warnings, HAND);
    expect(warnings.find(w => w.code === HAND)?.params).toMatchObject({ cards: 4, limit: 3 });
  });

  // Checks: three action cards are within the law.
  test('agenda:sanctions in play allows three action cards', () => {
    const table = drawing(3, true);
    expectNone(warningsOf(table, table.draw), HAND);
  });

  // LRR 2.4: "Each player's hand can have a maximum of seven action cards."
  // Checks: without the law four cards are nothing to warn of, and an eighth is warned of against 7.
  // Why the check is NOT redundant here: the law is not in play, so the limit is the rules' seven; this is the check
  // pass 2 must add for everyone before the law can change its number.
  test('agenda:sanctions not in play, four action cards are within the limit', () => {
    const table = drawing(4, false);
    expectNone(warningsOf(table, table.draw), HAND);
  });

  test('agenda:sanctions not in play, an eighth action card is warned of against the limit of 7', () => {
    const table = drawing(8, false);
    const warnings = warningsOf(table, table.draw);
    expectStanding(warnings, HAND);
    expect(warnings.find(w => w.code === HAND)?.params).toMatchObject({ cards: 8, limit: 7 });
  });

  test.todo('agenda:sanctions "Against": each player discards 1 random action card: entered by the player, the plan draws no card at random');

  test('agenda:sanctions is a passive effect that changes the hand limit to 3', () => {
    const { pack } = bench({ faction: 'sol' });
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify?.handLimit?.(7, { faction: 'sol' })).toBe(3);
  });
});
