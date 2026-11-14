import type { TFunction } from 'i18next';
import { nameOfPlayer, shortName } from '../players/names';
import { systemTitle } from '../map/systemName';
import { componentById } from '../../domain/components';
import type { DataPack } from '../../domain/types';
import type { Expedition, Goods, Transaction, Turn } from '../../game/actions';
import { mapSource } from '../../game/space';
import type { Table } from '../../game/types';
import type { KernelView } from './kernelView';

type T = TFunction;

/** What changes hands, read in one line: trade goods, commodities, the components by their names, or nothing. */
function goodsText(goods: Goods, pack: DataPack, t: T): string {
  const parts = [
    ...(goods.tradeGoods ? [t('plan.steps.tradeGoods', { n: goods.tradeGoods })] : []),
    ...(goods.commodities ? [t('plan.acts.commodities', { n: goods.commodities })] : []),
    ...(goods.components ?? []).map(id => componentById(pack, id)?.name ?? id),
  ];
  return parts.length > 0 ? parts.join(', ') : t('plan.acts.nothing');
}

/** An expedition part and what pays for it. */
export function expeditionText(part: { sliceId: string | null; payment: { planets: string[]; tradeGoods: number } }, pack: DataPack, t: T): string {
  if (!part.sliceId) return t('plan.entries.noSlice');
  const { planets, tradeGoods } = part.payment;
  const paid = [...planets.map(id => pack.planets[id]?.name ?? id), ...(tradeGoods > 0 ? [t('plan.steps.tradeGoods', { n: tradeGoods })] : [])];
  return [t(`plan.slice.${part.sliceId}`), ...(paid.length > 0 ? [paid.join(', ')] : [])].join(' · ');
}

/** How a narrow place names a player of the table: the short name of the faction, or the player number. */
const playerShortName = (table: Table, pack: DataPack, id: string, t: T): string =>
  shortName(pack, table.players.find(p => p.id === id)?.faction ?? '', nameOfPlayer(table, pack, id, t));

/** One act of a turn read as a line, as the plan row and the turn block show it. */
export const turnActLine = (act: Transaction | Expedition, table: Table, pack: DataPack, t: T): string => (act.kind === 'expedition'
  ? t('plan.acts.expedition', { brief: expeditionText({ sliceId: act.slice, payment: act.payment }, pack, t) })
  : t('plan.acts.transaction', {
    name: act.with === table.viewer ? t('plan.acts.me') : playerShortName(table, pack, act.with, t),
    give: goodsText(act.give, pack, t), get: goodsText(act.get, pack, t),
  }));

/** The lines a row shows under its name for what the turn holds: Warfare's movement, transactions, the expedition. */
export function actLines(turn: Turn, view: KernelView, pack: DataPack, t: T): string[] {
  const free = turn.action.kind === 'strategic' ? turn.action.nested?.find(n => n.action.kind === 'tactical') : undefined;
  const system = free?.action.kind === 'tactical' ? free.action.system : null;
  const movement = free ? [`+ ${t('plan.strategy.freeTacticalOpen')}${system ? ` · ${systemTitle(mapSource(view.table, view.board), pack, system, t)}` : ''}`] : [];
  // Transactions come in the turn before the expedition that ends it.
  const ordered = [...turn.acts.filter(a => a.kind === 'transaction'), ...turn.acts.filter(a => a.kind === 'expedition')];
  return [...movement, ...ordered.map(act => turnActLine(act, view.table, pack, t))];
}
