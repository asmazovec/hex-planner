/** LRR 83 Strategy Card. Source: tirules2 rules-reference/strategy-card.md. */
import { describe, expect, test } from 'vitest';
import { strategyCards } from '../../../data/loadPack';
import { cardsHeld, CARD, costsStrategyToken, heldCards } from '../../strategy';
import type { Entry } from '../../../testing/old/domain/types';
import { codesOf, forecast, primary, rulesGame, rulesPack, secondary } from '../kit';
import { holding } from './kit-83-101';

const pack = rulesPack();
const card = (e: Entry) => e as Extract<Entry, { type: 'strategic' | 'secondary' }>;
const round = (strategyCard: number | null, backupCard: number | null = null) => ({ number: 1, strategyCard, backupCard, entries: [] });

describe('LRR 83 Strategy Card', () => {
  test('83.1: the card taken in the strategy phase is the one the player holds that round; with five or more players a backup is not held', () => {
    expect(heldCards(round(CARD.trade, CARD.imperial), 6)).toEqual([CARD.trade]);
    expect(heldCards(round(CARD.trade, CARD.imperial), 4)).toEqual([CARD.trade, CARD.imperial]);
  });

  test('83.2: once its primary is resolved the card is exhausted, so a second primary of it that round is warned about', () => {
    const again = primary(CARD.trade);
    const game = holding(rulesGame({ entries: [primary(CARD.trade), again] }), CARD.trade);
    expect(codesOf(game, pack, again)).toContain('primaryRepeated');
  });

  test.todo('83.2.1: the readied side shows name, initiative and abilities — not modelled: printed card faces, nothing to compute');
  test.todo('83.2.2: the exhausted side shows the initiative only — not modelled: printed card faces, nothing to compute');

  test('83.3: the primary of one\'s own card costs no token', () => {
    expect(costsStrategyToken(card(primary(CARD.trade)))).toBe(false);
  });

  test('83.3: the primary of the card the player holds is free even if the entry was planned while it was not held', () => {
    // The entry was made before Trade became my card, so it still carries forToken; the projection must follow the round.
    const play = primary(CARD.trade, {}, { forToken: true });
    const game = holding(rulesGame({ entries: [play] }), CARD.trade);
    expect(forecast(game, pack).state.strategy).toBe(2);
  });

  test('83.3: a primary of a card the player does not hold is flagged, even if the entry was planned while it was held', () => {
    // Planned on Trade while Trade was my card; then I took Imperial instead. The entry carries no forToken.
    const play = primary(CARD.trade);
    const game = holding(rulesGame({ entries: [play] }), CARD.imperial);
    expect(codesOf(game, pack, play)).not.toEqual([]);
  });

  test('83.3: only the holder resolves a primary: one of another player\'s card, even paid with a strategy token, is warned about', () => {
    const play = primary(CARD.trade, {}, { forToken: true });
    const game = holding(rulesGame({ entries: [play] }), CARD.imperial);
    expect(codesOf(game, pack, play)).not.toEqual([]);
  });

  test('83.4: the secondary of a card the player holds is warned about', () => {
    const play = secondary(CARD.trade);
    const game = holding(rulesGame({ entries: [play] }), CARD.trade);
    expect(codesOf(game, pack, play)).not.toEqual([]);
  });

  test('83.4: the secondary of a card another player chose is allowed and spends a strategy token, except Leadership', () => {
    const play = secondary(CARD.trade);
    const game = holding(rulesGame({ entries: [play] }), CARD.imperial);
    expect(codesOf(game, pack, play)).toEqual([]);
    expect(forecast(game, pack).state.strategy).toBe(1);
    expect(costsStrategyToken(card(secondary(CARD.leadership)))).toBe(false);
  });

  test('83.5: every card set has eight cards with the initiatives 1 to 8', () => {
    for (const expansions of [[], ['pok'], ['te'], ['pok', 'te']] as const) {
      expect(strategyCards([...expansions]).map(c => c.initiative)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    }
    expect(strategyCards([]).map(c => c.name)).toEqual(['Leadership', 'Diplomacy', 'Politics', 'Construction', 'Trade', 'Warfare', 'Technology', 'Imperial']);
  });

  test.todo('83.6: the initiative number orders the action and status phases — not modelled: the plan keeps one player\'s order by hand');

  test('83.7: a secondary is resolved during the card\'s one strategic action, so a second secondary of the same card in a round is warned about', () => {
    const again = secondary(CARD.trade);
    const game = holding(rulesGame({ entries: [secondary(CARD.trade), again] }), CARD.imperial);
    expect(codesOf(game, pack, again)).not.toEqual([]);
  });

  test('83.3 / 83.7: a primary of a card not held is a foreignPrimary, a second secondary of a card a secondaryRepeated', () => {
    const foreign = primary(CARD.trade);
    const again = secondary(CARD.politics);
    const game = holding(rulesGame({ entries: [foreign, secondary(CARD.politics), again] }), CARD.imperial);
    expect(codesOf(game, pack, foreign)).toEqual(['foreignPrimary']);
    expect(codesOf(game, pack, again)).toContain('secondaryRepeated');
  });

  test.todo('83.8: a card lies in the common area or in a player\'s area — not modelled: only my own choice per round is kept');
  test.todo('83.8.1: cards in the common area can be chosen — not modelled: the common area and other players\' choices are not kept');

  test('83.8.2: the card returns in the status phase: the next round its primary can be resolved again', () => {
    const next = primary(CARD.trade);
    const game = rulesGame({ rounds: [[primary(CARD.trade)], [next]] });
    expect(codesOf(game, pack, next)).not.toContain('primaryRepeated');
  });

  test('83 note 1: with three or four players each player takes two cards', () => {
    expect([3, 4].map(cardsHeld)).toEqual([2, 2]);
  });

  test.todo('83 note 1.1: the lower of the two initiatives orders the player — not modelled: initiative order is not computed');
});
