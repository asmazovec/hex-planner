import { applied } from './effects/apply';
import { appliedToPlanet } from './effects/points/payment';
import { holderOf } from './effects/registry';
import type { DataPack, GameState, Payment, RuleStep } from './types';

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

/**
 * Who pays, for the components that change what a payment is worth: the faction, my state (laws, attachments) when the
 * payer is not me, and the step the warnings of the payment carry. Without it the printed values stand.
 */
export interface PayView { faction: string; shared?: GameState; step?: RuleStep }

/** Cards that are spent as if they were planets (The Triad), with their printed resources and influence. */
export const PLANET_CARDS: Readonly<Record<string, number>> = { 'relic:thetriad': 3 };
export const isPlanetCard = (id: string): boolean => id in PLANET_CARDS;

/** What a planet (or planet card) gives in `kind`, after the components of its controller and what is attached to it. */
export function planetValue(pack: DataPack, state: GameState, planetId: string, kind: PaymentKind, view?: PayView): number {
  const printed = isPlanetCard(planetId) ? PLANET_CARDS[planetId] : pack.planets[planetId]?.[kind] ?? 0;
  if (!view) return printed;
  const shared = view.shared ?? state;
  return appliedToPlanet(
    pack, holderOf(view, state, shared), shared.attachments?.[planetId] ?? [],
    kind === 'resources' ? 'planetResources' : 'planetInfluence', printed, planetId, state.docks.includes(planetId),
  ).value;
}

/** A planet's resources and influence as the screens show them, and whether a component changed either. */
export interface PlanetValues { resources: number; influence: number; changed: boolean }

/** What one trade good spent is worth in `kind`: 1, or what the components of the payer make it. */
export const tradeGoodWorth = (pack: DataPack, state: GameState, kind: PaymentKind, view?: PayView): number =>
  view ? applied(pack, holderOf(view, state, view.shared ?? state), 'tradeGoodValue', 1, { kind, faction: view.faction }).value : 1;

interface Pick { count: number; ids: string[]; }

/**
 * The choice itself, over what is ready: `items` the planets that can pay with what each gives, the trade goods held and
 * what one is worth. The old state and the board both ask this one.
 */
export function choosePayment(ready: { id: string; value: number }[], tradeGoods: number, worth: number, need: number): Payment {
  const items = ready
    .filter(p => p.value > 0)
    .sort((a, b) => b.value - a.value || (a.id < b.id ? -1 : 1));
  const order = (ids: string[]): string[] => items.map(p => p.id).filter(id => ids.includes(id));
  if (need <= 0) return { planets: [], tradeGoods: 0 };
  const total = items.reduce((sum, p) => sum + p.value, 0);
  if (total + tradeGoods * worth < need) return { planets: order(items.map(p => p.id)), tradeGoods };

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
  for (let goods = 0; goods <= Math.min(tradeGoods, Math.ceil(need / worth)); goods++) {
    for (let s = Math.max(0, need - goods * worth); s <= total; s++) {
      const pick = best[s];
      if (!pick) continue;
      const cand = { surplus: s + goods * worth - need, goods, count: pick.count, ids: pick.ids };
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
