import { describe, expect, test } from 'vitest';
import { componentsOf } from '../../../components';
import { bench, effect, endOf, HOME, NEAR, quote, tactical, using } from '../kit';
import { id } from './lc1';

describe('exploration:lc1 Lost Crew', () => {
  // "Draw 2 action cards."
  // Checks: the card is a reminder with no step of its own.
  // Why nothing is validated: which two cards are drawn is unknown when the plan is made; there is no count to check.
  test('exploration:lc1 is a hint with no step', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    quote(pack, id, 'Draw 2 action cards.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
  });

  // Checks: the cards drawn are entered as gains of the entry that explores, and stand in the hand after it.
  // Why nothing is automated: the gains of the entry already say what came from the deck; the card adds nothing.
  test('exploration:lc1 the two cards drawn are entered as gains and reach the hand', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    const [one, two] = componentsOf(pack).filter(c => c.kind === 'actionCard').map(c => c.id);
    const move = { ...using(tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] }), id), gains: [one, two] };
    const table = bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { carrier: 1 } }, entries: [move] });
    expect(endOf(table).holdings.hand).toEqual([one, two]);
  });
});
