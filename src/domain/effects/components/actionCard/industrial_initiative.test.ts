import { describe, expect, test } from 'vitest';
import type { DataPack, Entry } from '../../../types';
import { bench, componentAction, effect, endOf, quote } from '../kit';
import { id } from './industrial_initiative';

/** t1 and t2 of the target system are industrial; the home planets have no trait. */
const industrial = (pack: DataPack) => {
  pack.planets.t1 = { ...pack.planets.t1, traits: ['industrial'] };
  pack.planets.t2 = { ...pack.planets.t2, traits: ['industrial'] };
};
const table = (entries: Entry[], control: Record<string, 'me' | 'enemy'> = { t1: 'me', t2: 'me' }, hand: string[] = [id]) =>
  bench({ faction: 'sol', start: { hand }, entries, game: { planetControl: control }, edit: industrial });

describe('actionCard:industrial_initiative Industrial Initiative', () => {
  // "Gain 1 trade good for each industrial planet you control."
  // Checks: the component action that plays the card gains 2 trade goods for t1 and t2, and none for the home
  // planets, which have no trait.
  // Why no check is lifted: the card adds trade goods, it breaks no rule; the play itself is what the plan counts.
  test('actionCard:industrial_initiative gains 1 trade good for each industrial planet I control', () => {
    const play = componentAction(id);
    const card = table([play]);
    quote(card.pack, id, 'Gain 1 trade good for each industrial planet you control');
    expect(endOf(card).tradeGoods).toBe(2);
  });

  // "... each industrial planet you control."
  // Checks: an industrial planet of another player does not count: t2 is the enemy's, so 1 trade good.
  // Why the count is NOT wider here: the card counts only the planets the player controls (LRR 25, control).
  test('actionCard:industrial_initiative counts only the industrial planets I control', () => {
    expect(endOf(table([componentAction(id)], { t1: 'me', t2: 'enemy' })).tradeGoods).toBe(1);
  });

  // tirules2, Industrial Initiative 1: "A player with zero industrial planets may play Industrial Initiative."
  // Checks: with no industrial planet the card is played, leaves the hand and gains nothing.
  // Why nothing is warned of: the play is legal and its effect is zero.
  test('actionCard:industrial_initiative with no industrial planet is played and gains nothing', () => {
    const card = table([componentAction(id)], {});
    const end = endOf(card);
    expect(end.tradeGoods).toBe(0);
    expect(end.holdings.hand).not.toContain(id);
  });

  // Checks: the card only held gains nothing.
  // Why the gain is NOT made: the card is an ACTION; it acts only when played (LRR 2.6.1).
  test('actionCard:industrial_initiative held but not played gains nothing', () => {
    expect(endOf(table([])).tradeGoods).toBe(0);
  });

  test('actionCard:industrial_initiative is a play effect that waives nothing', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
