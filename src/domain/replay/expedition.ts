/** Thunder's Edge expedition: a slice is taken and paid for. */
import { EXPEDITION_SLICES, techSlicePlanets } from '../payment';
import { violation } from '../rules/registry';
import type { DataPack, Entry, Game, GameState, Warning } from '../types';
import { applyPayment, checkPayment, pay } from './payment';

/** What the replay remembers of the expeditions: the slices taken in the plan, and who made one this turn. */
export interface ExpeditionLog {
  taken: Set<string>;
  /** The owner ('me' or an opponent's id) of the expedition made since the last action, or null. */
  turn: string | null;
}

export const expeditionLog = (): ExpeditionLog => ({ taken: new Set<string>(), turn: null });

/** Any entry but an expedition or a manual correction ends the turn the expeditions belong to. */
export function noteTurn(log: ExpeditionLog, entry: Entry): void {
  if (entry.type !== 'expedition' && entry.type !== 'adjustment') log.turn = null;
}

export function applyExpedition(
  game: Game, state: GameState, entry: Extract<Entry, { type: 'expedition' }>, pack: DataPack,
  log: ExpeditionLog, warnings: Warning[],
): void {
  const slice = EXPEDITION_SLICES.find(s => s.id === entry.sliceId);
  if (slice) {
    // A slice is taken once, whoever holds it: in this plan, or as the game records it (expedition 2, 5).
    if (log.taken.has(slice.id) || game.expedition.slices[slice.id]) {
      warnings.push(violation('sliceTaken', { sliceId: slice.id }));
    }
    log.taken.add(slice.id);
    // No more than one slice per turn (expedition 5).
    const owner = entry.owner ?? 'me';
    if (log.turn === owner) warnings.push(violation('expeditionTwicePerTurn', { sliceId: slice.id }));
    log.turn = owner;
  }
  if (slice?.techPlanet) {
    // One of my ready planets with a technology specialty is exhausted (expedition 4.5); the value does not matter.
    const payable = techSlicePlanets(state, pack);
    if (!entry.payment.planets.some(id => payable.includes(id))) warnings.push(violation('expeditionUnpaid', { sliceId: slice.id }));
    warnings.push(...checkPayment(state, { planets: entry.payment.planets, tradeGoods: 0 }));
    applyPayment(state, { planets: entry.payment.planets, tradeGoods: 0 }, 'resources', pack);
    return;
  }
  const cost = slice?.cost;
  if (cost?.kind === 'tradeGoods') {
    // The cost is paid in trade goods only; the payment's planets are not used.
    if (state.tradeGoods < cost.amount) {
      warnings.push(violation('shortTradeGoods', { needed: cost.amount, have: state.tradeGoods }));
    }
    state.tradeGoods -= Math.min(cost.amount, state.tradeGoods);
    return;
  }
  const kind = cost?.kind ?? 'resources';
  const paid = pay(state, entry.payment, kind, pack, warnings);
  if (cost && paid < cost.amount) {
    warnings.push(violation(kind === 'influence' ? 'shortInfluence' : 'shortResources', { needed: cost.amount, paid }));
  }
}
