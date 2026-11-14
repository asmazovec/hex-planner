import { applied } from '../../../domain/effects/apply';
import { holderOf } from '../../../domain/effects/registry';
import type { DataPack, GameState, Payment } from '../../../domain/types';
import { type PayView, type PaymentKind, PLANET_CARDS, type PlanetValues, planetValue, choosePayment, slicePlanetCost, EXPEDITION_SLICES } from '../../../domain/payment';
import { specialtiesOf } from '../../../domain/specialties';
/** Planets that can pay the technology part of the expedition: ready, mine, with a technology specialty. */
export const techSlicePlanets = (state: GameState, pack: DataPack): string[] =>
  readyPlanetIds(state).filter(id => specialtiesOf(pack, id, state.attachments?.[id]).length > 0);
/**
 * What the screens show of a planet: its resources and influence as planetValue gives them (the components of its
 * controller and what is attached), and whether either differs from the printed numbers. Only a planet I control is
 * asked, any other shows the printed values.
 */
export function shownPlanetValues(pack: DataPack, state: GameState, planetId: string, faction: string): PlanetValues {
  const printed = pack.planets[planetId];
  const base = { resources: printed?.resources ?? 0, influence: printed?.influence ?? 0 };
  if (state.control[planetId] !== 'me') return { ...base, changed: false };
  const view = { faction, shared: state };
  const resources = planetValue(pack, state, planetId, 'resources', view);
  const influence = planetValue(pack, state, planetId, 'influence', view);
  return { resources, influence, changed: resources !== base.resources || influence !== base.influence };
}
/** Value of a payment as written; ownership and exhaustion are checked by the projection. `at` is the payer's state with who they are. */
export function paymentValue(payment: Payment, kind: PaymentKind, pack: DataPack, at?: PayView & { state: GameState }): number {
  const view = at;
  return payment.planets.reduce((sum, id) => sum + (at ? planetValue(pack, at.state, id, kind, view) : pack.planets[id]?.[kind] ?? 0), 0)
    + payment.tradeGoods * (at ? tradeGoodWorth(pack, at.state, kind, view) : 1);
}
/**
 * Cheapest way to cover `need` from ready planets and trade goods: least surplus burned,
 * then fewer trade goods, then fewer planets. Falls short only by giving everything useful.
 */
export function autoPay(state: GameState, need: number, kind: PaymentKind, pack: DataPack, view?: PayView): Payment {
  const items = readyPlanetIds(state).map(id => ({ id, value: planetValue(pack, state, id, kind, view) }));
  return choosePayment(items, state.tradeGoods, tradeGoodWorth(pack, state, kind, view), need);
}
/** The payment a newly chosen expedition part starts with: its resources or influence from the ready planets, or the first planet with a technology specialty for the technology part. */
export function sliceAutoPayment(state: GameState, sliceId: string | null, pack: DataPack): Payment {
  const cost = slicePlanetCost(sliceId);
  if (cost) return autoPay(state, cost.amount, cost.kind, pack);
  const techPlanets = techSlicePlanets(state, pack);
  return EXPEDITION_SLICES.find(s => s.id === sliceId)?.techPlanet && techPlanets.length > 0 ? { planets: [techPlanets[0]], tradeGoods: 0 } : { planets: [], tradeGoods: 0 };
}

/** A planet card the player holds and has not exhausted. */
export const readyPlanetCards = (state: GameState): string[] =>
  Object.keys(PLANET_CARDS).filter(id => state.holdings.relics.includes(id) && !state.holdings.exhausted.includes(id));

/** Planets the player can still spend: own and not exhausted, and the planet cards held and ready. */
export const readyPlanetIds = (state: GameState): string[] =>
  [...Object.keys(state.control).filter(id => state.control[id] === 'me' && !state.exhausted.includes(id)), ...readyPlanetCards(state)];

/** What one trade good spent is worth in `kind`: 1, or what the components of the payer make it. */
export const tradeGoodWorth = (pack: DataPack, state: GameState, kind: PaymentKind, view?: PayView): number =>
  view ? applied(pack, holderOf(view, state, view.shared ?? state), 'tradeGoodValue', 1, { kind, faction: view.faction }).value : 1;
