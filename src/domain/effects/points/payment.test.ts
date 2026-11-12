/**
 * The infrastructure of payment, tried with effects that exist only here (`throwaway`): the planet's value with
 * what is attached to it, the worth of a trade good, planet cards, the commodity value, the hook of a transaction and
 * the cost of a component action. A component's own file is never touched.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { autoPay, paymentValue } from '../../payment';
import { applyPayment, checkPayment, commoditiesForShortfall, pay, readyInfluence, readyResources, spendTradeGoods } from '../../replay/payment';
import { commodityValueOf, gainCommodities, replenish } from '../../replay/cards/trade';
import { forecast, rulesGame, rulesPack, tactical } from '../../rules/kit';
import type { Entry, GameState, Opponent, Warning } from '../../types';
import { componentAction } from '../components/kit';
import { alwaysInForce, throwaway } from './throwaway';
import { violation } from '../../rules/registry';

vi.mock('../registry', async original => (await import('./throwaway')).mockRegistry(await original()));

const pack = rulesPack();
const view = { faction: 'rules-tester' };
const NEAR = '1,0';

const freshState = (): GameState => {
  const state = forecast(rulesGame({ entries: [] }), pack).state;
  state.control = { h1: 'me', h2: 'me' };
  state.exhausted = [];
  state.tradeGoods = 0;
  return state;
};

beforeEach(() => {
  for (const key of Object.keys(throwaway)) delete throwaway[key];
  alwaysInForce.length = 0;
});

describe('payment: the value of a planet with what is attached to it', () => {
  test('an attached card is asked at planetResources with the planet, and a law of the game only counts where it is attached', () => {
    throwaway['exploration:att'] = { tier: 'passive', rule: 'x', modify: { planetResources: (v, ctx) => (ctx.attached?.includes('exploration:att') ? v + 2 : v) } };
    throwaway['agenda:law'] = { tier: 'passive', rule: 'x', modify: { planetResources: (v, ctx) => (ctx.attached?.includes('agenda:law') ? v + 1 : v) } };
    alwaysInForce.push('agenda:law');
    const state = freshState();
    state.attachments = { h1: ['exploration:att', 'agenda:law'] };
    expect(applyPayment(state, { planets: ['h1'], tradeGoods: 0 }, 'resources', pack, { ...view })).toBe(3 + 2 + 1);
    expect(applyPayment(state, { planets: ['h2'], tradeGoods: 0 }, 'resources', pack, { ...view })).toBe(1);
    expect(applyPayment(freshState(), { planets: ['h1'], tradeGoods: 0 }, 'resources', pack, { ...view })).toBe(3);
  });

  test('the ready planets, the manual value and the automatic payment all see it', () => {
    throwaway['exploration:att'] = { tier: 'passive', rule: 'x', modify: { planetInfluence: v => v + 2 } };
    const state = freshState();
    state.attachments = { h2: ['exploration:att'] };
    expect(readyInfluence(state, pack, view)).toBe(1 + 2 + 2);
    expect(readyInfluence(state, pack)).toBe(3);
    expect(paymentValue({ planets: ['h2'], tradeGoods: 0 }, 'influence', pack, { ...view, state })).toBe(4);
    expect(autoPay(state, 4, 'influence', pack, view)).toEqual({ planets: ['h2'], tradeGoods: 0 });
  });
});

describe('payment: the worth of a trade good', () => {
  test('a modifier of tradeGoodValue makes each trade good worth more, and the shortfall is counted in that worth', () => {
    throwaway['technology:mc'] = { tier: 'passive', rule: 'x', modify: { tradeGoodValue: v => v * 2 } };
    alwaysInForce.push('technology:mc');
    const state = freshState();
    state.tradeGoods = 2;
    expect(applyPayment(state, { planets: [], tradeGoods: 2 }, 'resources', pack, view)).toBe(4);
    expect(state.tradeGoods).toBe(0);
    const again = freshState();
    again.tradeGoods = 2;
    expect(paymentValue({ planets: [], tradeGoods: 1 }, 'influence', pack, { ...view, state: again })).toBe(2);
    again.control = {};
    expect(autoPay(again, 4, 'resources', pack, view)).toEqual({ planets: [], tradeGoods: 2 });
    expect(autoPay(again, 2, 'resources', pack, view)).toEqual({ planets: [], tradeGoods: 1 });
  });

  test('without the modifier a trade good is worth 1', () => {
    const state = freshState();
    state.tradeGoods = 2;
    expect(applyPayment(state, { planets: [], tradeGoods: 2 }, 'resources', pack, view)).toBe(2);
  });
});

describe('payment: a planet card', () => {
  const card = 'relic:thetriad';
  test('a held Triad pays 3 and is exhausted in the holdings; the check still says it is no planet of mine', () => {
    const state = freshState();
    state.holdings.relics = [card];
    const payment = { planets: [card], tradeGoods: 0 };
    expect(checkPayment(state, payment).map(w => w.code)).toEqual(['planetNotControlled']);
    expect(readyResources(state, pack)).toBe(4 + 3);
    expect(applyPayment(state, payment, 'resources', pack, view)).toBe(3);
    expect(state.holdings.exhausted).toContain(card);
    expect(state.exhausted).not.toContain(card);
    expect(checkPayment(state, payment).map(w => w.code)).toEqual(['planetNotControlled', 'planetExhausted']);
    expect(readyResources(state, pack)).toBe(4);
  });

  test('a Triad that is not held pays nothing', () => {
    const state = freshState();
    expect(applyPayment(state, { planets: [card], tradeGoods: 0 }, 'resources', pack, view)).toBe(0);
    expect(state.holdings.exhausted).toEqual([]);
  });
});

describe('payment: the step of the warnings, trade goods and commodities', () => {
  test('a payment made in the status phase carries that step', () => {
    const warnings: Warning[] = [];
    pay(freshState(), { planets: ['h1'], tradeGoods: 1 }, 'resources', pack, warnings, { ...view, step: 'status' });
    expect(warnings.map(w => [w.code, w.step])).toEqual([['shortTradeGoods', 'status']]);
  });

  test('spendTradeGoods takes what is there, warns for the rest and never goes below zero', () => {
    const state = freshState();
    state.tradeGoods = 2;
    const warnings: Warning[] = [];
    spendTradeGoods(state, 3, warnings, 'component');
    expect(state.tradeGoods).toBe(0);
    expect(warnings.map(w => [w.code, w.step, w.params])).toEqual([['shortTradeGoods', 'component', { needed: 3, have: 2 }]]);
  });

  test('commoditiesForShortfall covers the payment warning of trade goods from the commodities', () => {
    const state = freshState();
    state.tradeGoods = 1;
    state.commodities = 2;
    const warnings: Warning[] = [];
    pay(state, { planets: [], tradeGoods: 3 }, 'resources', pack, warnings);
    expect(commoditiesForShortfall({ state, warnings })).toBe(2);
    expect(state.commodities).toBe(0);
    state.commodities = 1;
    expect(commoditiesForShortfall({ state, warnings: [violation('shortTradeGoods', { needed: 4, have: 1 }, 'transaction')] })).toBe(0);
  });
});

describe('payment: the commodity value', () => {
  test('replenish and gain use the value after the components', () => {
    throwaway['relic:dyn'] = { tier: 'passive', rule: 'x', modify: { commodityValue: v => v + 2 } };
    alwaysInForce.push('relic:dyn');
    const state = freshState();
    expect(commodityValueOf({ faction: 'rules-tester' }, state, pack)).toBe(5);
    replenish({ faction: 'rules-tester' }, state, pack);
    expect(state.commodities).toBe(5);
    state.commodities = 3;
    gainCommodities({ faction: 'rules-tester' }, state, pack, 4);
    expect(state.commodities).toBe(5);
  });
});

const RIVAL: Opponent = { id: 'o1', faction: 'rules-tester', vp: 0, seat: 2, color: 2 };

describe('transactions: the hook of a deal', () => {
  test('dealt is asked of the components in force of both sides, with what moved', () => {
    const seen: string[] = [];
    throwaway['technology:deal'] = {
      tier: 'passive', rule: 'x',
      dealt: turn => { seen.push(`${turn.side}:${turn.self}->${turn.partner} gave ${turn.gave.tradeGoods ?? 0} got ${turn.got.tradeGoods ?? 0}`); turn.state.tradeGoods += 10; },
    };
    alwaysInForce.push('technology:deal');
    const turn = tactical(NEAR, { acts: [{ kind: 'transaction', with: 'o1', give: { tradeGoods: 2 }, get: {} }] });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1 } }, entries: [turn], game: { opponents: [RIVAL], enemyUnits: { [NEAR]: { o1: { carrier: 1 } } } } });
    const { state } = forecast(game, pack);
    expect(seen).toEqual(['give:me->o1 gave 0 got 0', 'get:o1->me gave 0 got 0']);
    expect(state.tradeGoods).toBe(10);
    expect(state.rivals?.o1.tradeGoods).toBe(10);
  });

  test('an action card in a transaction warns for everyone and still changes hands', () => {
    const card = 'actionCard:sabo1';
    const turn = tactical(NEAR, { acts: [{ kind: 'transaction', with: 'o1', give: { components: [card] }, get: {} }] });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1 } }, entries: [turn], game: { opponents: [RIVAL], enemyUnits: { [NEAR]: { o1: { carrier: 1 } } }, start: { me: { hand: [card] }, opponents: {} } } });
    const run = forecast(game, pack);
    expect(run.warnings[turn.id].map(w => w.code)).toContain('transactionKind');
    expect(run.state.rivals?.o1.holdings.hand).toEqual([card]);
  });
});

describe('component actions: the cost a component declares', () => {
  const card = 'actionCard:sabo1';
  const play = (payment?: { planets: string[]; tradeGoods: number }): Entry => ({ ...componentAction(card), ...(payment ? { payment } : {}) } as Entry);
  const run = (entry: Entry) => forecast(rulesGame({ entries: [entry], game: { start: { me: { hand: [card] }, opponents: {} } } }), pack);

  test('the payment of the entry is made for the cost, and what is short is warned of', () => {
    throwaway[card] = { tier: 'play', rule: 'x', cost: { kind: 'influence', amount: 3 } };
    const paid = play({ planets: ['h1', 'h2'], tradeGoods: 0 });
    const full = run(paid);
    expect(full.warnings[paid.id]?.map(w => w.code) ?? []).not.toContain('shortInfluence');
    expect(full.state.exhausted).toEqual(expect.arrayContaining(['h1', 'h2']));
    const short = play({ planets: ['h2'], tradeGoods: 0 });
    expect(run(short).warnings[short.id].find(w => w.code === 'shortInfluence')?.params).toEqual({ needed: 3, paid: 2 });
    const none = play();
    expect(run(none).warnings[none.id].find(w => w.code === 'shortInfluence')?.params).toEqual({ needed: 3, paid: 0 });
  });

  test('a component without a cost is not paid for', () => {
    const entry = play({ planets: ['h1'], tradeGoods: 0 });
    expect(run(entry).state.exhausted).not.toContain('h1');
  });
});
