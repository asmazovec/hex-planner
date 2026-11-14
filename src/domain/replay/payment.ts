/** Payment: planets are exhausted and trade goods spent for what an entry costs. */
import { isPlanetCard, planetValue, readyPlanetIds, tradeGoodWorth, type PayView, type PaymentKind } from '../payment';
import { violation } from '../rules/registry';
import type { DataPack, GameState, Payment, Warning } from '../types';

const sumPlanets = (state: GameState, pack: DataPack, field: PaymentKind, view?: PayView): number =>
  readyPlanetIds(state).reduce((total, id) => total + planetValue(pack, state, id, field, view), 0);

export const readyResources = (state: GameState, pack: DataPack, view?: PayView): number => sumPlanets(state, pack, 'resources', view);
export const readyInfluence = (state: GameState, pack: DataPack, view?: PayView): number => sumPlanets(state, pack, 'influence', view);

/** A planet card held: it pays, though it is no planet I control. */
const heldCard = (state: GameState, id: string): boolean => isPlanetCard(id) && state.holdings.relics.includes(id);

/**
 * Check, over the state before paying: a planet I do not control (34 note 2, 64 note 5), a planet already exhausted, or
 * listed twice, and trade goods beyond those held. A planet card (The Triad) is no planet I control, so it is warned
 * of as one, which its own component lifts; it is exhausted in the holdings, and the second use warns as well.
 * `view.step` places the warnings (the payment step unless the entry says otherwise).
 */
export function checkPayment(state: GameState, payment: Payment, view?: Pick<PayView, 'step'>): Warning[] {
  const warnings: Warning[] = [];
  const spent = new Set(state.exhausted);
  const cards = new Set(state.holdings.exhausted);
  for (const planetId of payment.planets) {
    if (isPlanetCard(planetId)) {
      warnings.push(violation('planetNotControlled', { planetId }, view?.step));
      if (heldCard(state, planetId) && cards.has(planetId)) warnings.push(violation('planetExhausted', { planetId }, view?.step));
      cards.add(planetId);
      continue;
    }
    if (state.control[planetId] !== 'me') warnings.push(violation('planetNotControlled', { planetId }, view?.step));
    else if (spent.has(planetId)) warnings.push(violation('planetExhausted', { planetId }, view?.step));
    spent.add(planetId);
  }
  if (payment.tradeGoods > state.tradeGoods) {
    warnings.push(violation('shortTradeGoods', { needed: payment.tradeGoods, have: state.tradeGoods }, view?.step));
  }
  return warnings;
}

/**
 * Effect: exhausts the paying planets and spends the trade goods; returns what the payment is worth for `kind`: each
 * planet by its value after the components of the payer (`view`), each trade good by its worth.
 */
export function applyPayment(state: GameState, payment: Payment, kind: PaymentKind, pack: DataPack, view?: PayView): number {
  let value = 0;
  for (const planetId of payment.planets) {
    if (isPlanetCard(planetId)) {
      if (!heldCard(state, planetId) || state.holdings.exhausted.includes(planetId)) continue;
      state.holdings.exhausted.push(planetId);
      value += planetValue(pack, state, planetId, kind, view);
      continue;
    }
    if (state.exhausted.includes(planetId)) continue;
    state.exhausted.push(planetId);
    if (state.control[planetId] === 'me') value += planetValue(pack, state, planetId, kind, view);
  }
  const spent = Math.max(0, Math.min(payment.tradeGoods, state.tradeGoods));
  const worth = tradeGoodWorth(pack, state, kind, view);
  state.tradeGoods -= spent;
  return value + spent * worth;
}
