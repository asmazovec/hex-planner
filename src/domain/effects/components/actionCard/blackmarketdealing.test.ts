import { describe, expect, test } from 'vitest';
import type { Act, DataPack, Entry, Game, Goods, Opponent, StartHoldings } from '../../../types';
import { bench, effect, endOf, expectStanding, expectWaived, NEAR, quote, tactical, using, warningsOf } from '../kit';
import { tech } from '../../../rules/kit';
import { id } from './blackmarketdealing';

const RIVAL: Opponent = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };
const RELIC = 'relic:dynamiscore';

const deal = (give: Goods, get: Goods = {}): Act => ({ kind: 'transaction', with: 'o1', give, get });
const turn = (acts: Act[]): Entry => tactical(NEAR, { acts });

/** Me and a rival with a carrier in one system: neighbours (60). */
const table = (entries: Entry[], me: StartHoldings = {}, theirs: StartHoldings = {}) => bench({
  faction: 'letnev', expansions: ['pok', 'te'], units: { [NEAR]: { carrier: 1 } }, entries,
  game: { opponents: [RIVAL], enemyUnits: { [NEAR]: { o1: { carrier: 1 } } }, start: { me: { hand: [id], ...me }, opponents: { o1: theirs } } } as Partial<Game>,
});
const secretOf = (pack: DataPack) => pack.components.find(c => c.kind === 'secretObjective')!.id;

describe('actionCard:blackmarketdealing Black Market Dealings', () => {
  // "You and the other player may include relics, action cards, and unscored secret objectives as part of the
  //  transaction."
  // Checks: I give a relic in a transaction of the turn that plays the card; the warning is listed and lifted, and the
  // relic changes hands.
  // Why the check is redundant here: LRR 94.3 lets only commodities, trade goods, promissory notes and relic fragments
  // change hands, and the card adds relics for this transaction.
  test('actionCard:blackmarketdealing lets a relic be given in the transaction: transactionKind is waived', () => {
    const mine = using(turn([deal({ components: [RELIC] })]), id);
    const market = table([mine], { relics: [RELIC] });
    quote(market.pack, id, 'may include relics, action cards, and unscored secret objectives');
    expectWaived(warningsOf(market, mine), 'transactionKind', id);
    expect(endOf(market).rivals?.o1.holdings.relics).toEqual([RELIC]);
  });

  // "You and the other player may include ... unscored secret objectives"
  // Checks: the other side gives me its unscored secret objective; that warning is lifted too.
  // Why the check is redundant here: the card speaks of both players and of unscored secret objectives by name.
  test('actionCard:blackmarketdealing lets the other player give an unscored secret objective: transactionKind is waived', () => {
    const { pack } = table([]);
    const secret = secretOf(pack);
    const mine = using(turn([deal({}, { components: [secret] })]), id);
    expectWaived(warningsOf(table([mine], {}, { secrets: [secret] }), mine), 'transactionKind', id);
  });

  // LRR 94.3: "Players can exchange commodities, trade goods, promissory notes, and relic fragments, but cannot exchange
  //  other types of cards or tokens."
  // Checks: the same relic without the card stands warned, and still changes hands, as the plan forbids nothing.
  // Why the check is NOT redundant here: the card is held, not played with this turn.
  test('actionCard:blackmarketdealing held but not played: a relic in the transaction stands warned', () => {
    const mine = turn([deal({ components: [RELIC] })]);
    const market = table([mine], { relics: [RELIC] });
    expectStanding(warningsOf(market, mine), 'transactionKind');
    expect(endOf(market).rivals?.o1.holdings.relics).toEqual([RELIC]);
  });

  // "... relics, action cards, and unscored secret objectives ..."
  // Checks: a technology is none of these and stays warned with the card played.
  // Why the check is NOT redundant here: the card names three kinds; a technology is not one of them.
  test('actionCard:blackmarketdealing does not cover a technology', () => {
    const technology = tech('carrier');
    const mine = using(turn([deal({ components: [technology] })]), id);
    expectStanding(warningsOf(table([mine], { technologies: [technology] }), mine), 'transactionKind');
  });

  // "... unscored secret objectives ..."
  // Checks: a secret objective I have scored stays warned.
  // Why the check is NOT redundant here: a scored objective is not an unscored one.
  test('actionCard:blackmarketdealing does not cover a scored secret objective', () => {
    const { pack } = table([]);
    const secret = secretOf(pack);
    const mine = using(turn([deal({ components: [secret] })]), id);
    expectStanding(warningsOf(table([mine], { scored: [secret] }), mine), 'transactionKind');
  });

  test('actionCard:blackmarketdealing waives transactionKind for its own turn only', () => {
    const { pack } = table([]);
    expect(effect(pack, id).waive?.map(w => [w.code, w.lasts])).toEqual([['transactionKind', undefined]]);
  });

  test('actionCard:blackmarketdealing keeps the reminder at the transaction', () => {
    const { pack } = table([]);
    expect(effect(pack, id).hintAt).toEqual(['transaction']);
  });
});
