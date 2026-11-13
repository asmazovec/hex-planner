import { describe, expect, test } from 'vitest';
import type { Act, Entry, Goods, Opponent, StartHoldings } from '../../../types';
import { bench, componentAction, effect, endOf, expectStanding, expectWaived, NEAR, quote, tactical, warningsOf } from '../kit';
import { id } from './thesilverflame';

const RIVAL: Opponent = { id: 'o1', faction: 'hacan', vp: 0, seat: 2, color: 2 };
const deal = (give: Goods, get: Goods = {}, withId = 'o1'): Act => ({ kind: 'transaction', with: withId, give, get });
/** A turn with a ship in the system where the rival has one too: neighbours (60). */
const turn = (acts: Act[], extra: Partial<Entry> = {}): Entry => ({ ...tactical(NEAR, { acts }), ...extra } as Entry);
const table = (entries: Entry[], me: StartHoldings, rival: StartHoldings = {}) => bench({
  faction: 'sol', expansions: ['te'], units: { [NEAR]: { carrier: 1 } }, entries, start: me,
  game: { opponents: [RIVAL], enemyUnits: { [NEAR]: { o1: { carrier: 1 } } }, start: { me, opponents: { o1: rival } } },
});

describe('relic:thesilverflame The Silver Flame', () => {
  // "The Silver Flame may be exchanged as part of a transaction."
  // Checks: I give the Silver Flame to a neighbour; the warning that a relic is not exchanged is listed and lifted by
  // the card, and the relic changes hands.
  // Why the check is redundant here: LRR 94.3 lets only commodities, trade goods, promissory notes and relic fragments
  // change hands (Transactions note 1: "Relics themselves cannot be"); the card names itself as the exception.
  test('relic:thesilverflame given in a transaction: the warning is waived and the relic changes hands', () => {
    const give = turn([deal({ components: [id] })]);
    const flame = table([give], { relics: [id] });
    quote(flame.pack, id, 'The Silver Flame may be exchanged as part of a transaction.');
    expectWaived(warningsOf(flame, give), 'transactionKind', id);
    const end = endOf(flame);
    expect(end.holdings.relics).not.toContain(id);
    expect(end.rivals?.o1.holdings.relics).toContain(id);
  });

  // "The Silver Flame may be exchanged ..." read from the other side: the rival's turn gives it to me.
  // Checks: the rival holds the card and gives it in their turn; the warning of their entry is lifted.
  // Why the check is redundant here: the card held by the giver says it may be exchanged.
  test('relic:thesilverflame given to me in a rival\'s turn: their warning is waived', () => {
    const theirs = turn([deal({ components: [id] }, {}, 'me')], { owner: 'o1' });
    const flame = table([theirs], {}, { relics: [id] });
    expectWaived(warningsOf(flame, theirs), 'transactionKind', id);
    expect(endOf(flame).holdings.relics).toContain(id);
  });

  // LRR 94.3 and Transactions note 1: "Relic fragments may be traded. Relics themselves cannot be."
  // Checks: another relic in the same transaction is warned of, though I hold the Silver Flame too.
  // Why the check is NOT redundant here: the card speaks of itself only ("The Silver Flame may be exchanged").
  test('relic:thesilverflame does not let another relic be exchanged', () => {
    const give = turn([deal({ components: ['relic:heartofixth'] })]);
    const flame = table([give], { relics: [id, 'relic:heartofixth'] });
    expectStanding(warningsOf(flame, give), 'transactionKind');
  });

  // "ACTION: Roll 1 die and purge this card; ..."
  // Checks: the component action purges the relic whatever the die says; the plan rolls no die.
  // Why the check is NOT redundant here: there is no check to lift; the purge is the replay's own rule for a relic
  // whose text purges it (70), and it already holds.
  test('relic:thesilverflame played as an action is purged', () => {
    const play = componentAction(id);
    expect(endOf(table([play], { relics: [id] })).holdings.relics).not.toContain(id);
  });

  test.todo('relic:thesilverflame a 10 gains 1 victory point, any other result purges the home system and puts the Fracture into play: the plan rolls no die');
  test.todo('relic:thesilverflame received in my own turn from a rival who holds it: a waiver is asked of the owner of the entry only, who does not hold the card yet (foundation limit)');

  test('relic:thesilverflame is a passive effect that waives the exchange of itself', () => {
    const { pack } = table([], {});
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).permit?.map(w => w.code)).toEqual(['transactionKind']);
  });
});
