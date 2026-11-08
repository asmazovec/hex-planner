/** Thunder's Edge expedition: a slice is taken and paid for. */
import { EXPEDITION_SLICES } from '../payment';
import { violation } from '../rules/registry';
import type { DataPack, Entry, Game, GameState, Warning } from '../types';
import { pay } from './payment';

export function applyExpedition(
  game: Game, state: GameState, entry: Extract<Entry, { type: 'expedition' }>, pack: DataPack,
  taken: Set<string>, warnings: Warning[],
): void {
  const slice = EXPEDITION_SLICES.find(s => s.id === entry.sliceId);
  if (slice) {
    // TODO(P2-046) #ws:thunders-edge #type:check #rule:expedition-5 #test:te-expedition #size:s #expedition — Часть, отмеченная в партии как моя, берётся снова; две части за один ход не дают нарушения
    if (taken.has(slice.id) || game.expedition.slices[slice.id] === 'other') {
      warnings.push(violation('sliceTaken', { sliceId: slice.id }));
    }
    taken.add(slice.id);
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
  // TODO(P2-045) #ws:thunders-edge #type:bug #rule:expedition-4.5 #test:te-expedition #size:s #expedition — Часть «технология» без cost: оплата без планеты считается оплаченной, нет проверки специализации и контроля планеты
  const kind = cost?.kind ?? 'resources';
  const paid = pay(state, entry.payment, kind, pack, warnings);
  if (cost && paid < cost.amount) {
    warnings.push(violation(kind === 'influence' ? 'shortInfluence' : 'shortResources', { needed: cost.amount, paid }));
  }
}
