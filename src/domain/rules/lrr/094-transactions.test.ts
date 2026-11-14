/** LRR 94 Transactions. Source: tirules2 rules-reference/transactions.md. A transaction is an act of the active player's turn. */
import { describe, expect, test } from 'vitest';
import { CARD } from '../../strategy';
import type { Act, Entry, Game, Goods } from '../../types';
import type { Player } from '../../players';
import { FACTION, NEAR, adjust, codesOf, forecast, rulesGame, rulesPack, secondary, tactical, tech } from '../kit';

const pack = rulesPack();
const RIVAL: Player = { id: 'o1', faction: FACTION, vp: 0, seat: 2, color: 2 };
const OTHER: Player = { id: 'o2', faction: FACTION, vp: 0, seat: 3, color: 3 };

/** Me and both rivals with a ship in one system: all neighbours (60). */
const table = (entries: Entry[], start: Game['start'] = { me: {}, opponents: {} }) => rulesGame({
  units: { [NEAR]: { carrier: 1 } },
  entries,
  game: { opponents: [RIVAL, OTHER], enemyUnits: { [NEAR]: { o1: { carrier: 1 }, o2: { carrier: 1 } } }, start },
});
const NOTE = 'promissory:war_funding';
const OTHER_NOTE = 'promissory:ragh';
const CARD_IN_HAND = 'actionCard:sabo1';
const deal = (withId: string, give: Goods, get: Goods = {}): Act => ({ kind: 'transaction', with: withId, give, get });
const turn = (acts: Act[], extra: Partial<Entry> = {}): Entry => ({ ...tactical(NEAR, { acts }), ...extra } as Entry);
const theirs = (delta: Parameters<typeof adjust>[0], owner = 'o1'): Entry => ({ ...adjust(delta), owner } as Entry);

describe('LRR 94 Transactions', () => {
  test('94.1: one transaction with each neighbour in a turn is allowed', () => {
    const mine = turn([deal('o1', { tradeGoods: 1 }), deal('o2', { tradeGoods: 1 })]);
    expect(codesOf(table([adjust({ tradeGoods: 2 }), mine]), pack, mine)).toEqual([]);
  });

  test('94.1: a second transaction with the same player in one turn warns', () => {
    const mine = turn([deal('o1', { tradeGoods: 1 }), deal('o1', { tradeGoods: 1 })]);
    expect(codesOf(table([adjust({ tradeGoods: 2 }), mine]), pack, mine)).toContain('transactionRepeated');
  });

  test.todo('94.1.1: a transaction may come at any time of the turn, even in combat — not modelled: the acts of a turn come after its action');

  test('94.2: the trade goods I give leave me and reach them', () => {
    const game = table([adjust({ tradeGoods: 3 }), turn([deal('o1', { tradeGoods: 2 })])]);
    const { state } = forecast(game, pack);
    expect(state.tradeGoods).toBe(1);
    expect(state.rivals?.o1.tradeGoods).toBe(2);
  });

  test('94.2 / 21.5: the commodities I give leave my sheet and reach them as trade goods', () => {
    // The Trade secondary fills my commodities to the faction's 3 (21.3).
    const game = table([secondary(CARD.trade), turn([deal('o1', { commodities: 2 })])]);
    const { state } = forecast(game, pack);
    expect(state.commodities).toBe(1);
    expect(state.rivals?.o1.tradeGoods).toBe(2);
    expect(state.rivals?.o1.commodities).toBe(0);
  });

  test('94.2: giving commodities I do not have warns and gives nothing', () => {
    const mine = turn([deal('o1', { commodities: 2 })]);
    const game = table([mine]);
    expect(codesOf(game, pack, mine)).toContain('shortCommodities');
    expect(forecast(game, pack).state.rivals?.o1.tradeGoods).toBe(0);
  });

  test('94.2: what I get comes from them: their trade goods reach me', () => {
    const game = table([theirs({ tradeGoods: 3 }), turn([deal('o1', {}, { tradeGoods: 2 })])]);
    const { state } = forecast(game, pack);
    expect(state.tradeGoods).toBe(2);
    expect(state.rivals?.o1.tradeGoods).toBe(1);
  });

  test('94.2: giving more trade goods than I hold warns and never goes below zero', () => {
    const mine = turn([deal('o1', { tradeGoods: 5 })]);
    const game = table([adjust({ tradeGoods: 2 }), mine]);
    expect(codesOf(game, pack, mine)).toContain('shortTradeGoods');
    const { state } = forecast(game, pack);
    expect(state.tradeGoods).toBe(0);
    expect(state.rivals?.o1.tradeGoods).toBe(2);
  });

  test('94.2: a rival\'s transaction with me changes my trade goods', () => {
    const rivalTurn = turn([deal('me', { tradeGoods: 2 })], { owner: 'o1' });
    const game = table([theirs({ tradeGoods: 2 }), rivalTurn]);
    expect(forecast(game, pack).state.tradeGoods).toBe(2);
  });

  test('94.2: a promissory note I give leaves my hand and reaches theirs', () => {
    const mine = turn([deal('o1', { components: [NOTE] })]);
    const game = table([mine], { me: { promissory: [NOTE] }, opponents: {} });
    expect(codesOf(game, pack, mine)).toEqual([]);
    const { state } = forecast(game, pack);
    expect(state.holdings.promissory).toEqual([]);
    expect(state.rivals?.o1.holdings.promissory).toEqual([NOTE]);
  });

  test('94.2: a promissory note I get leaves their hand and reaches mine', () => {
    const mine = turn([deal('o1', {}, { components: [NOTE] })]);
    const game = table([mine], { me: {}, opponents: { o1: { promissory: [NOTE] } } });
    expect(codesOf(game, pack, mine)).toEqual([]);
    const { state } = forecast(game, pack);
    expect(state.holdings.promissory).toEqual([NOTE]);
    expect(state.rivals?.o1.holdings.promissory).toEqual([]);
  });

  test('94.2: giving a component I do not hold warns and gives nothing, as with goods', () => {
    const mine = turn([deal('o1', { components: [NOTE] })]);
    const game = table([mine]);
    const { state, warnings } = forecast(game, pack);
    expect(warnings[mine.id]).toEqual([{ code: 'componentNotHeld', params: { id: NOTE, name: 'War Funding', context: 'transaction' } }]);
    expect(warnings[mine.id][0].step).toBe('transaction');
    expect(state.rivals?.o1.holdings.promissory).toEqual([]);
  });

  test('94.2: a rival\'s transaction with me moves components the same way: what they give reaches me, what they get leaves me', () => {
    const rivalTurn = turn([deal('me', { components: [NOTE] }, { components: [OTHER_NOTE] })], { owner: 'o1' });
    const game = table([rivalTurn], { me: { promissory: [OTHER_NOTE] }, opponents: { o1: { promissory: [NOTE] } } });
    expect(codesOf(game, pack, rivalTurn)).toEqual([]);
    const { state } = forecast(game, pack);
    expect(state.holdings.promissory).toEqual([NOTE]);
    expect(state.rivals?.o1.holdings.promissory).toEqual([OTHER_NOTE]);
  });

  test('94.3: only commodities, trade goods, promissory notes and relic fragments change hands: a technology in a transaction warns', () => {
    const mine = turn([deal('o1', { components: [tech('carrier')] })]);
    const game = table([mine], { me: { technologies: [tech('carrier')] }, opponents: {} });
    expect(codesOf(game, pack, mine)).toEqual(['transactionKind']);
  });

  test('94.3: a secret objective or an agenda in a transaction warns as well', () => {
    const secret = pack.components.find(c => c.kind === 'secretObjective')!.id;
    const agenda = pack.components.find(c => c.kind === 'agenda')!.id;
    const mine = turn([deal('o1', {}, { components: [secret, agenda] })]);
    const game = table([mine], { me: {}, opponents: { o1: { secrets: [secret] } } });
    expect(codesOf(game, pack, mine)).toEqual(['transactionKind', 'transactionKind']);
  });

  test.todo('94.3 / 35.9.2: relic fragments change hands — not modelled: a relic fragment is an exploration card and no player\'s holdings keep those');

  test('94.3.1: an action card given in a transaction warns, for only an ability lets it be traded, and still leaves the hand for the other player\'s, one copy', () => {
    const mine = turn([deal('o1', { components: [CARD_IN_HAND] })]);
    const game = table([mine], { me: { hand: [CARD_IN_HAND, CARD_IN_HAND] }, opponents: {} });
    expect(codesOf(game, pack, mine)).toEqual(['transactionKind']);
    const { state } = forecast(game, pack);
    expect(state.holdings.hand).toEqual([CARD_IN_HAND]);
    expect(state.rivals?.o1.holdings.hand).toEqual([CARD_IN_HAND]);
  });

  // The Emirates of Hacan (Arbiters) and Black Market Dealings lift this warning: their files, src/domain/effects/components.
  test.todo('94.4: a transaction need not be even — nothing to check: any amounts are accepted');
  test.todo('94.5: a transaction may be part of a deal — not modelled: deals are not planned');
  test.todo('94.6: during each agenda one transaction with each player, neighbours or not — not modelled: the agenda phase is not planned');
});
