import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PaymentKind } from '../../domain/payment';
import type { DataPack } from '../../domain/types';
import { payingPlanets, planetValue, poolsOf } from '../../game/queries';
import type { Board, PlayerId, Table } from '../../game/types';
import { animates } from '../common/motion';

export interface SummaryBarProps {
  /** The planets count as the components make them. */
  table: Table;
  /** Whose totals these are: the player the screen shows. */
  player: PlayerId;
  now: Board;
  forecast: Board;
  pack: DataPack;
  /** Only what has happened: the plan's forecast is not shown. */
  factOnly?: boolean;
}

/** What the ready planets are worth to the player. */
const worth = (table: Table, board: Board, pack: DataPack, player: PlayerId, kind: PaymentKind): number =>
  payingPlanets(table, board, pack, player).reduce((total, id) => total + planetValue(table, board, pack, player, id, kind), 0);

const VALUES: { key: string; read: (table: Table, board: Board, pack: DataPack, player: PlayerId) => number }[] = [
  { key: 'resources', read: (table, board, pack, player) => worth(table, board, pack, player, 'resources') },
  { key: 'influence', read: (table, board, pack, player) => worth(table, board, pack, player, 'influence') },
  { key: 'tradeGoods', read: (_table, board, _pack, player) => board.players[player]?.tradeGoods ?? 0 },
  { key: 'commodities', read: (_table, board, _pack, player) => board.players[player]?.commodities ?? 0 },
  { key: 'tactic', read: (_table, board, _pack, player) => poolsOf(board, player).tactic },
  { key: 'fleet', read: (_table, board, _pack, player) => poolsOf(board, player).fleet },
  { key: 'strategy', read: (_table, board, _pack, player) => poolsOf(board, player).strategy },
  { key: 'vp', read: (_table, board, _pack, player) => board.players[player]?.vp ?? 0 },
];

/** The forecast after the arrow: it unrolls and rolls back up, and leaves the screen once its closing animation ends. */
function Forecast({ before, after }: { before: number; after: number }) {
  const differs = before !== after;
  const [rendered, setRendered] = useState(differs);
  const [shown, setShown] = useState(after);
  if (differs && !rendered) setRendered(true);
  if (!differs && rendered && !animates()) setRendered(false);
  if (differs && shown !== after) setShown(after);
  if (!rendered) return null;
  return (
    <span
      className={`summary-forecast${differs ? '' : ' summary-forecast-leaving'}`}
      onAnimationEnd={() => { if (!differs) setRendered(false); }}
    >
      {' → '}<span className={shown < 0 ? 'summary-negative' : undefined}>{shown}</span>
    </span>
  );
}

export function SummaryBar({ table, player, now, forecast, pack, factOnly = false }: SummaryBarProps) {
  const { t } = useTranslation();
  return (
    <div className="summary-bar" role="group" aria-label={t('plan.summary.label')}>
      {VALUES.map(({ key, read }) => {
        const before = read(table, now, pack, player);
        const after = factOnly ? before : read(table, forecast, pack, player);
        return (
          <div key={key} className="summary-cell" role="group" aria-label={t(`plan.summary.${key}`)}>
            <span>{t(`plan.summary.${key}`)}</span>
            <b>{before}<Forecast before={before} after={after} /></b>
          </div>
        );
      })}
    </div>
  );
}
