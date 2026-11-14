import type { TFunction } from 'i18next';
import { nameOfPlayer, shortName } from '../players/names';
import { systemTitle } from '../map/systemName';
import { componentById } from '../../domain/components';
import type { Act, DataPack, Entry, Goods, Round } from '../../domain/types';
import { playerOfKey } from '../../game/keys';
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

/** How a narrow place names a player of the table by the key an entry gives (`me` or an opponent id): the short name of the faction, or the player number. */
const playerShortName = (table: Table, pack: DataPack, key: string, t: T): string => {
  const id = playerOfKey(table, key) ?? key;
  return shortName(pack, table.players.find(p => p.id === id)?.faction ?? '', nameOfPlayer(table, pack, id, t));
};

/** One act read as a line, as the plan row and the turn block show it. */
export const actLine = (act: Act, table: Table, pack: DataPack, t: T): string => (act.kind === 'expedition'
  ? t('plan.acts.expedition', { brief: expeditionText(act, pack, t) })
  : t('plan.acts.transaction', {
    name: act.with === 'me' ? t('plan.acts.me') : playerShortName(table, pack, act.with, t),
    give: goodsText(act.give, pack, t), get: goodsText(act.get, pack, t),
  }));

/** Warfare's free tactical action stored for this card, if any: part of the card, shown under it. */
export const freeTacticalOf = (entry: Entry, round: Round): Extract<Entry, { type: 'tactical' }> | undefined =>
  (entry.type === 'strategic'
    ? round.entries.find((e): e is Extract<Entry, { type: 'tactical' }> => e.type === 'tactical' && e.fromCard === entry.id)
    : undefined);

/** Whether an entry is drawn inside another one's row: Warfare's free tactical action of a card in the round. */
export const insideCard = (entry: Entry, round: Round): boolean =>
  entry.type === 'tactical' && entry.fromCard !== undefined && round.entries.some(e => e.id === entry.fromCard);

/** The lines a row shows under its name for what the turn holds: Warfare's movement, transactions, the expedition. */
export function actLines(entry: Entry, round: Round, view: KernelView, pack: DataPack, t: T): string[] {
  const free = freeTacticalOf(entry, round);
  const movement = free ? [`+ ${t('plan.strategy.freeTacticalOpen')}${free.systemId ? ` · ${systemTitle(mapSource(view.table, view.board), pack, free.systemId, t)}` : ''}`] : [];
  const acts = 'acts' in entry && entry.acts ? entry.acts : [];
  // Transactions come in the turn before the expedition that ends it.
  const ordered = [...acts.filter(a => a.kind === 'transaction'), ...acts.filter(a => a.kind === 'expedition')];
  return [...movement, ...ordered.map(act => actLine(act, view.table, pack, t))];
}
