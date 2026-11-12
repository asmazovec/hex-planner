/** Thunder's Edge expedition: a slice is taken and paid for, as an act at the end of a turn. */
import { EXPEDITION_SLICES, techSlicePlanets } from '../payment';
import { violation } from '../rules/registry';
import type { DataPack, Game, GameState, Payment, Warning } from '../types';
import { applyPayment, checkPayment, pay } from './payment';

/** One expedition: the slice and how it is paid. */
export interface ExpeditionPart { sliceId: string | null; payment: Payment }

/** The slice is taken once, whoever holds it (expedition 2, 5); then its cost is paid (expedition 4). */
export function applyExpeditionPart(
  game: Game, state: GameState, part: ExpeditionPart, pack: DataPack, taken: Set<string>, warnings: Warning[],
): void {
  // Its payment speaks for the expedition, apart from the payment of the action it ends.
  const own: Warning[] = [];
  payPart(game, state, part, pack, taken, own);
  warnings.push(...own.map(w => violation(w.code, w.params, 'expedition')));
}

function payPart(
  game: Game, state: GameState, part: ExpeditionPart, pack: DataPack, taken: Set<string>, warnings: Warning[],
): void {
  const slice = EXPEDITION_SLICES.find(s => s.id === part.sliceId);
  if (slice) {
    if (taken.has(slice.id) || game.expedition.slices[slice.id]) warnings.push(violation('sliceTaken', { sliceId: slice.id }));
    taken.add(slice.id);
  }
  if (slice?.techPlanet) {
    // One of my ready planets with a technology specialty is exhausted (expedition 4.5); the value does not matter.
    const payable = techSlicePlanets(state, pack);
    if (!part.payment.planets.some(id => payable.includes(id))) warnings.push(violation('expeditionUnpaid', { sliceId: slice.id }));
    warnings.push(...checkPayment(state, { planets: part.payment.planets, tradeGoods: 0 }));
    applyPayment(state, { planets: part.payment.planets, tradeGoods: 0 }, 'resources', pack);
    return;
  }
  const cost = slice?.cost;
  if (cost?.kind === 'tradeGoods') {
    // The cost is paid in trade goods only; the payment's planets are not used.
    if (state.tradeGoods < cost.amount) warnings.push(violation('shortTradeGoods', { needed: cost.amount, have: state.tradeGoods }));
    state.tradeGoods -= Math.min(cost.amount, state.tradeGoods);
    return;
  }
  const kind = cost?.kind ?? 'resources';
  const paid = pay(state, part.payment, kind, pack, warnings, { faction: game.faction });
  if (cost && paid < cost.amount) {
    warnings.push(violation(kind === 'influence' ? 'shortInfluence' : 'shortResources', { needed: cost.amount, paid }));
  }
}
