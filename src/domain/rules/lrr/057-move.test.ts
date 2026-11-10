/** LRR 57 Move (Attribute). Source: tirules2 rules-reference/move.md. */
import { describe, expect, test } from 'vitest';
import { CARD } from '../../strategy';
import { codesOf, HOME, NEAR, primary, rulesGame, rulesPack, tactical, TARGET, tech } from '../kit';

const pack = rulesPack();
const twoSteps = () => tactical(TARGET, { moves: [{ from: HOME, units: { carrier: 1 }, via: [NEAR] }] });

describe('LRR 57 Move', () => {
  test('57.1: the move value is how far a ship goes: a carrier I (move 1) falls one system short of two', () => {
    const move = twoSteps();
    const game = rulesGame({ units: { [HOME]: { carrier: 1 } }, entries: [move] });
    expect(codesOf(game, pack, move)).toContain('speedShort');
  });

  test('57.1: an upgrade researched earlier in the plan raises the move value: a carrier II goes two systems', () => {
    const move = twoSteps();
    const game = rulesGame({ units: { [HOME]: { carrier: 1 } }, entries: [primary(CARD.technology, { researched: [tech('carrier')] }), move] });
    expect(codesOf(game, pack, move)).not.toContain('speedShort');
  });

  test('57.1: an upgrade researched later in the plan does not help an earlier move', () => {
    const move = twoSteps();
    const game = rulesGame({ units: { [HOME]: { carrier: 1 } }, entries: [move, primary(CARD.technology, { researched: [tech('carrier')] })] });
    expect(codesOf(game, pack, move)).toContain('speedShort');
  });

  test('57.1: a unit with no move value does not fly by itself: infantry carried by a carrier II get no speed warning', () => {
    const move = tactical(TARGET, { moves: [{ from: HOME, units: { carrier: 1, infantry: 2 }, via: [NEAR] }] });
    const game = rulesGame({ units: { [HOME]: { carrier: 1, infantry: 2 } }, entries: [move], game: { start: { me: { technologies: [tech('carrier')] }, opponents: {} } } });
    expect(codesOf(game, pack, move)).toEqual([]);
  });

  test.todo('57 note 1: a move modifier does nothing to an effect that moves a unit to an adjacent system — not modelled: ability movement goes in by hand');
});
