/** Payment: planets are exhausted and trade goods spent for what an entry costs. */
import { readyPlanetIds, type PaymentKind } from '../payment';
import { violation } from '../rules/registry';
import type { DataPack, GameState, Payment, Warning } from '../types';

const sumPlanets = (state: GameState, pack: DataPack, field: PaymentKind): number =>
  readyPlanetIds(state).reduce((total, id) => total + (pack.planets[id]?.[field] ?? 0), 0);

export const readyResources = (state: GameState, pack: DataPack): number => sumPlanets(state, pack, 'resources');
export const readyInfluence = (state: GameState, pack: DataPack): number => sumPlanets(state, pack, 'influence');

/**
 * Check, over the state before paying: a planet I do not control (34 note 2, 64 note 5), a planet already exhausted, or
 * listed twice, and trade goods beyond those held.
 */
export function checkPayment(state: GameState, payment: Payment): Warning[] {
  const warnings: Warning[] = [];
  const spent = new Set(state.exhausted);
  for (const planetId of payment.planets) {
    if (state.control[planetId] !== 'me') warnings.push(violation('planetNotControlled', { planetId }));
    else if (spent.has(planetId)) warnings.push(violation('planetExhausted', { planetId }));
    spent.add(planetId);
  }
  if (payment.tradeGoods > state.tradeGoods) {
    warnings.push(violation('shortTradeGoods', { needed: payment.tradeGoods, have: state.tradeGoods }));
  }
  return warnings;
}

/** Effect: exhausts the paying planets and spends the trade goods; returns what the payment is worth for `kind`. */
export function applyPayment(state: GameState, payment: Payment, kind: PaymentKind, pack: DataPack): number {
  let value = 0;
  for (const planetId of payment.planets) {
    if (state.exhausted.includes(planetId)) continue;
    state.exhausted.push(planetId);
    if (state.control[planetId] === 'me') value += pack.planets[planetId]?.[kind] ?? 0;
  }
  const spent = Math.max(0, Math.min(payment.tradeGoods, state.tradeGoods));
  state.tradeGoods -= spent;
  return value + spent;
}

/** Exhausts the paying planets and spends the trade goods; returns what the payment is worth for `kind`. */
export function pay(state: GameState, payment: Payment, kind: PaymentKind, pack: DataPack, warnings: Warning[]): number {
  warnings.push(...checkPayment(state, payment));
  return applyPayment(state, payment, kind, pack);
}

/** A game effect readies the listed planets; only those I control can be readied (71 note 3). */
export function readyPlanets(state: GameState, planets: string[], warnings: Warning[]): void {
  for (const planetId of planets) {
    if (state.control[planetId] !== 'me') warnings.push(violation('readyNotControlled', { planetId }, 'card'));
  }
  state.exhausted = state.exhausted.filter(id => !planets.includes(id));
}
