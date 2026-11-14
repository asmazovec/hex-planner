import type { GameState, Payment, DataPack, Warning, RuleStep, Game, Entry } from '../../../../domain/types';
import { type PaymentKind, type PayView } from '../../../../domain/payment';
import { checkPayment, applyPayment } from '../../../../domain/replay/payment';
import { violation } from '../../../../domain/rules/registry';
import { playedCost } from '../../../../domain/effects/playedCost';
import { effectOf } from '../../../../domain/effects/registry';

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
