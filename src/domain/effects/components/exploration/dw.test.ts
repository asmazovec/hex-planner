import { describe, expect, test } from 'vitest';
import { bench, effect, endOf, HOME, NEAR, quote, tactical, using } from '../kit';
import { id } from './dw';

describe('exploration:dw Dead World', () => {
  // "Draw 1 relic."
  // Checks: the card is a hint of the movement step, where a frontier token is explored by the ships that came.
  // Why nothing is validated: which relic is drawn is chance (and none with the deck empty: exploration notes, Dead
  // World 1); the player enters the relic drawn in «Взято и сброшено» (`gains`), as any card drawn.
  test('exploration:dw is a hint of the movement step', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    quote(pack, id, 'Draw 1 relic.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['movement']);
  });

  // Checks: naming the card with the action gives no relic by itself.
  // Why nothing is counted: the relic is the one the player enters, not one the plan could choose.
  test('exploration:dw named with the action adds no relic', () => {
    const move = using(tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] }), id);
    const table = bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { carrier: 1 } }, entries: [move] });
    expect(endOf(table).holdings.relics).toEqual([]);
  });
});
