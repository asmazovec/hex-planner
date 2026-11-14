import { isPlanetCard, planetValue, type PayView, type PaymentKind } from '../../../../domain/payment';
import { violation } from '../../../../domain/rules/registry';
import type { DataPack, GameState, Payment, Warning, RuleStep, Game, Entry } from '../../../../domain/types';
import { playedCost } from '../../../../domain/effects/playedCost';
import { effectOf } from '../../../../domain/effects/registry';
import { readyPlanetIds } from '../payment';
import { tradeGoodWorth } from '../payment';
/** Exhausts the paying planets and spends the trade goods; returns what the payment is worth for `kind`. */
export function pay(state: GameState, payment: Payment, kind: PaymentKind, pack: DataPack, warnings: Warning[], view?: PayView): number {
  warnings.push(...checkPayment(state, payment, view));
  return applyPayment(state, payment, kind, pack, view);
}
/**
 * A game effect readies the listed planets; only those I control can be readied (71 note 3). `step` is where the
 * warning stands: the card's block unless the effect is a component's.
 */
export function readyPlanets(state: GameState, planets: string[], warnings: Warning[], step: RuleStep = 'card'): void {
  for (const planetId of planets) {
    if (state.control[planetId] !== 'me') warnings.push(violation('readyNotControlled', { planetId }, step));
  }
  state.exhausted = state.exhausted.filter(id => !planets.includes(id));
}
/**
 * The cost a component declares (`Ability.cost`), paid with the payment of its component entry: the planets
 * are exhausted, the trade goods spent, and a shortfall warns as shortResources or shortInfluence at the step
 * `component`. Returns what was paid.
 */
export function payComponentCost(
  state: GameState, cost: { kind: PaymentKind; amount: number }, payment: Payment | undefined, pack: DataPack, warnings: Warning[], view: PayView,
): number {
  const paid = pay(state, payment ?? { planets: [], tradeGoods: 0 }, cost.kind, pack, warnings, { ...view, step: 'component' });
  if (paid < cost.amount) warnings.push(violation(cost.kind === 'influence' ? 'shortInfluence' : 'shortResources', { needed: cost.amount, paid }, 'component'));
  return paid;
}
/** The cost of what a component entry plays, with what it names in `uses`: paid with the entry's `payment`. */
export function payPlayedCost(game: Pick<Game, 'faction'>, state: GameState, shared: GameState, entry: Entry, pack: DataPack, warnings: Warning[]): void {
  const cost = playedCost(pack, entry, effectOf);
  if (cost && entry.type === 'component') payComponentCost(state, cost, entry.payment, pack, warnings, { faction: game.faction, shared });
}

export const sumPlanets = (state: GameState, pack: DataPack, field: PaymentKind, view?: PayView): number =>
  readyPlanetIds(state).reduce((total, id) => total + planetValue(pack, state, id, field, view), 0);

export const readyResources = (state: GameState, pack: DataPack, view?: PayView): number => sumPlanets(state, pack, 'resources', view);

export const readyInfluence = (state: GameState, pack: DataPack, view?: PayView): number => sumPlanets(state, pack, 'influence', view);

/** A planet card held: it pays, though it is no planet I control. */
export const heldCard = (state: GameState, id: string): boolean => isPlanetCard(id) && state.holdings.relics.includes(id);

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
