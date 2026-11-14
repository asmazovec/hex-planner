import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { bench, componentAction, effect, endOf, quote } from '../kit';
import { id } from './messiah';

/** My home planets h1 and h2 are mine from the start; t1 is taken by hand, t2 is the enemy's. */
const table = (entries: Entry[], hand: string[] = [id]) =>
  bench({ faction: 'sol', start: { hand }, entries, game: { planetControl: { t1: 'me', t2: 'enemy' } } });

describe('actionCard:messiah Rise of a Messiah', () => {
  // "Place 1 infantry from your reinforcements on each planet you control."
  // Checks: the component action puts one infantry on h1, h2 and t1.
  // Why no check is lifted: placing units from the reinforcements by a card breaks no rule; the plan counts the board.
  test('actionCard:messiah places 1 infantry on each planet I control', () => {
    const card = table([componentAction(id)]);
    quote(card.pack, id, 'Place 1 infantry from your reinforcements on each planet you control');
    const { ground } = endOf(card);
    expect([ground.h1?.infantry, ground.h2?.infantry, ground.t1?.infantry]).toEqual([1, 1, 1]);
  });

  // "... on each planet you control."
  // Checks: the enemy's planet t2 gets none.
  // Why the placement is NOT wider: only the planets the player controls are named.
  test('actionCard:messiah places nothing on a planet of another player', () => {
    expect(endOf(table([componentAction(id)])).ground.t2?.infantry ?? 0).toBe(0);
  });

  // Checks: the card only held places nothing.
  // Why nothing is placed: the card is an ACTION and acts only when played (LRR 2.6.1).
  test('actionCard:messiah held but not played places nothing', () => {
    expect(endOf(table([])).ground.h1?.infantry ?? 0).toBe(0);
  });

  test('actionCard:messiah is a play effect that waives nothing', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
  });
});
