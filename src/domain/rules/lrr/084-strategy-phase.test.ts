/** LRR 84 Strategy Phase. Source: tirules2 rules-reference/strategy-phase.md. */
import { describe, expect, test } from 'vitest';
import { cardsHeld, CARD, heldCards } from '../../strategy';
import { codesOf, primary, rulesGame, rulesPack } from '../kit';

const pack = rulesPack();

describe('LRR 84 Strategy Phase', () => {
  test('84.1: in the first step each player takes one card: with five or more players a second marked card is no card of theirs', () => {
    expect(heldCards({ number: 1, strategyCard: CARD.warfare, backupCard: CARD.trade, entries: [] }, 5)).toEqual([CARD.warfare]);
  });

  test.todo('84.1.1: trade goods lying on a chosen card go to the player — not modelled: the bonus goods on cards are not kept; an adjustment records them');

  test('84.1.2 / 82.2: a card\'s primary is resolved once a round', () => {
    const again = primary(CARD.trade);
    const game = rulesGame({ entries: [primary(CARD.trade), again] });
    expect(codesOf(game, pack, again)).toContain('primaryRepeated');
  });

  test.todo('84.1.2: a card another player already chose cannot be chosen — not modelled: other players\' cards are not planned');

  test('84.1.3: with three or four players each takes two strategy cards, otherwise one', () => {
    expect([3, 4, 5, 6, 7, 8].map(cardsHeld)).toEqual([2, 2, 1, 1, 1, 1]);
  });

  test('84.1.3: a five-player game allows one primary a round, a four-player game two', () => {
    const second = primary(CARD.imperial);
    expect(codesOf(rulesGame({ playerCount: 5, entries: [primary(CARD.trade), second] }), pack, second)).toContain('primaryRepeated');
    expect(codesOf(rulesGame({ playerCount: 4, entries: [primary(CARD.trade), second] }), pack, second)).not.toContain('primaryRepeated');
  });

  test.todo('84.2: the speaker puts a trade good on each card not chosen — not modelled: the bonus goods on cards are not kept');
  test.todo('84.2.1: with four or eight players every card is chosen — not modelled: the bonus goods on cards are not kept');
  test.todo('84 note 1: goods taken with a card stay when the card is lost — not modelled: the bonus goods on cards are not kept');
});
