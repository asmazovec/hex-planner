import type { DataPack, GameState, Payment } from './types';

export type PaymentKind = 'resources' | 'influence';

export interface ExpeditionSlice {
  id: 'res5' | 'inf5' | 'tg3' | 'secret' | 'cards' | 'tech';
  /** Absent for parts paid with a card or planet effect rather than a countable amount. */
  cost?: { kind: PaymentKind | 'tradeGoods'; amount: number };
  /** Paid by exhausting one planet I control with a technology specialty (expedition 4.5). */
  techPlanet?: true;
}

/** The six Thunder's Edge expedition parts; each is taken once. */
export const EXPEDITION_SLICES: ExpeditionSlice[] = [
  { id: 'res5', cost: { kind: 'resources', amount: 5 } },
  { id: 'inf5', cost: { kind: 'influence', amount: 5 } },
  { id: 'tg3', cost: { kind: 'tradeGoods', amount: 3 } },
  { id: 'secret' },
  { id: 'cards' },
  { id: 'tech', techPlanet: true },
];

/** Planets that can pay the technology part of the expedition: ready, mine, with a technology specialty. */
export const techSlicePlanets = (state: GameState, pack: DataPack): string[] =>
  readyPlanetIds(state).filter(id => (pack.planets[id]?.tech?.length ?? 0) > 0);

/** Planets the player can still spend: own and not exhausted. */
export const readyPlanetIds = (state: GameState): string[] =>
  Object.keys(state.control).filter(id => state.control[id] === 'me' && !state.exhausted.includes(id));

/** Value of a payment as written; ownership and exhaustion are checked by the projection. A trade good is worth 1. */
export function paymentValue(payment: Payment, kind: PaymentKind, pack: DataPack): number {
  return payment.planets.reduce((sum, id) => sum + (pack.planets[id]?.[kind] ?? 0), 0) + payment.tradeGoods;
}

interface Pick { count: number; ids: string[]; }

/**
 * Cheapest way to cover `need` from ready planets and trade goods: least surplus burned,
 * then fewer trade goods, then fewer planets. Falls short only by giving everything useful.
 */
export function autoPay(state: GameState, need: number, kind: PaymentKind, pack: DataPack): Payment {
  const items = readyPlanetIds(state)
    .map(id => ({ id, value: pack.planets[id]?.[kind] ?? 0 }))
    .filter(p => p.value > 0)
    .sort((a, b) => b.value - a.value || (a.id < b.id ? -1 : 1));
  const order = (ids: string[]): string[] => items.map(p => p.id).filter(id => ids.includes(id));
  if (need <= 0) return { planets: [], tradeGoods: 0 };
  const total = items.reduce((sum, p) => sum + p.value, 0);
  if (total + state.tradeGoods < need) return { planets: order(items.map(p => p.id)), tradeGoods: state.tradeGoods };

  // best[s]: fewest planets whose values sum to exactly s.
  const best: (Pick | undefined)[] = Array.from({ length: total + 1 }, () => undefined);
  best[0] = { count: 0, ids: [] };
  for (const item of items) {
    for (let s = total; s >= item.value; s--) {
      const from = best[s - item.value];
      if (from && (!best[s] || from.count + 1 < best[s]!.count)) best[s] = { count: from.count + 1, ids: [...from.ids, item.id] };
    }
  }
  let winner: { surplus: number; goods: number; count: number; ids: string[] } | undefined;
  for (let goods = 0; goods <= Math.min(state.tradeGoods, need); goods++) {
    for (let s = Math.max(0, need - goods); s <= total; s++) {
      const pick = best[s];
      if (!pick) continue;
      const cand = { surplus: s + goods - need, goods, count: pick.count, ids: pick.ids };
      if (!winner || cand.surplus < winner.surplus
        || (cand.surplus === winner.surplus && (cand.goods < winner.goods
          || (cand.goods === winner.goods && cand.count < winner.count)))) winner = cand;
    }
  }
  return { planets: order(winner?.ids ?? []), tradeGoods: winner?.goods ?? 0 };
}

// ui-logic-to-domain (P2-366)
/** What an expedition part costs in resources or influence; null for a part paid otherwise or not at all. */
export function slicePlanetCost(sliceId: string | null): { kind: PaymentKind; amount: number } | null {
  const cost = EXPEDITION_SLICES.find(s => s.id === sliceId)?.cost;
  return cost && cost.kind !== 'tradeGoods' ? { kind: cost.kind, amount: cost.amount } : null;
}

/** The payment a newly chosen expedition part starts with: its resources or influence from the ready planets, or the first planet with a technology specialty for the technology part. */
export function sliceAutoPayment(state: GameState, sliceId: string | null, pack: DataPack): Payment {
  const cost = slicePlanetCost(sliceId);
  if (cost) return autoPay(state, cost.amount, cost.kind, pack);
  const techPlanets = techSlicePlanets(state, pack);
  return EXPEDITION_SLICES.find(s => s.id === sliceId)?.techPlanet && techPlanets.length > 0 ? { planets: [techPlanets[0]], tradeGoods: 0 } : { planets: [], tradeGoods: 0 };
}
