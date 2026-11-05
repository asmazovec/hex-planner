import { describe, expect, test } from 'vitest';
import { autoPay, EXPEDITION_SLICES, paymentValue } from './payment';
import type { DataPack, GameState } from './types';

/** Planets `p1`, `p2`, ... get the given resource values; influence is 10 minus the resources. */
function build(values: number[], tradeGoods: number, extra: Partial<GameState> = {}): { state: GameState; pack: DataPack } {
  const planets: DataPack['planets'] = {};
  const control: GameState['control'] = {};
  values.forEach((v, i) => {
    const id = `p${i + 1}`;
    planets[id] = { id, name: id, resources: v, influence: 10 - v };
    control[id] = 'me';
  });
  const pack: DataPack = { version: 't', tiles: {}, planets, units: {}, factions: {}, templates: [], technologies: {}, structures: [] };
  const state: GameState = {
    systems: {}, ground: {}, exhausted: [], control, tokensOnMap: [],
    tradeGoods, tactic: 3, fleet: 3, strategy: 2, vp: 0, upgrades: [], ...extra,
  };
  return { state, pack };
}

describe('autoPay', () => {
  test('выбирает оплату без потерь', () => {
    const { state, pack } = build([4, 3, 1, 3], 1);
    expect(autoPay(state, 5, 'resources', pack)).toEqual({ planets: ['p1', 'p3'], tradeGoods: 0 });
  });

  test('при равенстве меньше товаров, затем меньше планет', () => {
    const a = build([3, 1, 1], 1);
    expect(autoPay(a.state, 3, 'resources', a.pack)).toEqual({ planets: ['p1'], tradeGoods: 0 });
    const b = build([2, 1, 1, 1], 0);
    expect(autoPay(b.state, 2, 'resources', b.pack)).toEqual({ planets: ['p1'], tradeGoods: 0 });
  });

  test('минимальный излишек важнее числа товаров', () => {
    const { state, pack } = build([4, 3], 1);
    expect(autoPay(state, 4, 'resources', pack)).toEqual({ planets: ['p1'], tradeGoods: 0 });
    // Need 6: only 4 + 3 reaches it, with a surplus of 1.
    expect(autoPay(state, 6, 'resources', pack)).toEqual({ planets: ['p1', 'p2'], tradeGoods: 0 });
    // Need 5: 4 plus a trade good is exact, while 4 + 3 would burn 2.
    expect(autoPay(state, 5, 'resources', pack)).toEqual({ planets: ['p1'], tradeGoods: 1 });
  });

  test('при нехватке отдаёт всё доступное', () => {
    const { state, pack } = build([1], 1);
    const p = autoPay(state, 5, 'resources', pack);
    expect(p).toEqual({ planets: ['p1'], tradeGoods: 1 });
    expect(paymentValue(p, 'resources', pack)).toBe(2);
  });

  test('считает влияние, а не ресурсы', () => {
    const { state, pack } = build([9, 8, 1], 0); // influence 1, 2, 9
    expect(autoPay(state, 9, 'influence', pack)).toEqual({ planets: ['p3'], tradeGoods: 0 });
  });

  test('не берёт истощённые, чужие и бесполезные планеты', () => {
    const { state, pack } = build([4, 3, 2, 0], 0, {
      exhausted: ['p1'], control: { p1: 'me', p2: 'enemy', p3: 'me', p4: 'me' },
    });
    expect(autoPay(state, 1, 'resources', pack)).toEqual({ planets: ['p3'], tradeGoods: 0 });
    expect(autoPay(state, 9, 'resources', pack)).toEqual({ planets: ['p3'], tradeGoods: 0 });
  });

  test('нулевая потребность ничего не тратит', () => {
    const { state, pack } = build([4], 2);
    expect(autoPay(state, 0, 'resources', pack)).toEqual({ planets: [], tradeGoods: 0 });
  });

  test('планеты в оплате идут по убыванию ценности, затем по id', () => {
    const { state, pack } = build([1, 3, 3, 2], 0);
    expect(autoPay(state, 9, 'resources', pack).planets).toEqual(['p2', 'p3', 'p4', 'p1']);
  });
});

describe('paymentValue', () => {
  test('планеты и товары', () => {
    const { pack } = build([4, 1], 0);
    expect(paymentValue({ planets: ['p1', 'p2'], tradeGoods: 2 }, 'resources', pack)).toBe(7);
    expect(paymentValue({ planets: ['p1', 'p2'], tradeGoods: 0 }, 'influence', pack)).toBe(15);
    expect(paymentValue({ planets: ['missing'], tradeGoods: 0 }, 'resources', pack)).toBe(0);
  });
});

describe('EXPEDITION_SLICES', () => {
  test('шесть частей и их стоимость', () => {
    expect(EXPEDITION_SLICES).toEqual([
      { id: 'res5', cost: { kind: 'resources', amount: 5 } },
      { id: 'inf5', cost: { kind: 'influence', amount: 5 } },
      { id: 'tg3', cost: { kind: 'tradeGoods', amount: 3 } },
      { id: 'secret' },
      { id: 'cards' },
      { id: 'tech' },
    ]);
  });
});
