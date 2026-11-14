import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PaymentKind } from '../../domain/payment';
import type { DataPack } from '../../domain/types';
import { payingPlanets, planetValue, poolsOf } from '../../game/queries';
import type { Board, Table } from '../../game/types';
import { animates } from '../common/motion';

export interface SummaryBarProps {
  /** Whose totals are shown is the viewer of the table; the planets count as the components make them. */
  table: Table;
  now: Board;
  forecast: Board;
  pack: DataPack;
  /** Only what has happened: the plan's forecast is not shown. */
  factOnly?: boolean;
}

/** What the ready planets are worth to the viewer. */
const worth = (table: Table, board: Board, pack: DataPack, kind: PaymentKind): number =>
  payingPlanets(table, board, pack, table.viewer).reduce((total, id) => total + planetValue(table, board, pack, table.viewer, id, kind), 0);

const VALUES: { key: string; read: (table: Table, board: Board, pack: DataPack) => number }[] = [
  { key: 'resources', read: (table, board, pack) => worth(table, board, pack, 'resources') },
  { key: 'influence', read: (table, board, pack) => worth(table, board, pack, 'influence') },
  { key: 'tradeGoods', read: (table, board) => board.players[table.viewer]?.tradeGoods ?? 0 },
  { key: 'commodities', read: (table, board) => board.players[table.viewer]?.commodities ?? 0 },
  { key: 'tactic', read: (table, board) => poolsOf(board, table.viewer).tactic },
  { key: 'fleet', read: (table, board) => poolsOf(board, table.viewer).fleet },
  { key: 'strategy', read: (table, board) => poolsOf(board, table.viewer).strategy },
  { key: 'vp', read: (table, board) => board.players[table.viewer]?.vp ?? 0 },
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

export function SummaryBar({ table, now, forecast, pack, factOnly = false }: SummaryBarProps) {
  const { t } = useTranslation();
  return (
    <div className="summary-bar" role="group" aria-label={t('plan.summary.label')}>
      {VALUES.map(({ key, read }) => {
        const before = read(table, now, pack);
        const after = factOnly ? before : read(table, forecast, pack);
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
