import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PayView } from '../../domain/payment';
import { readyInfluence, readyResources } from '../../domain/project';
import type { DataPack, GameState } from '../../domain/types';
import { animates } from '../common/motion';

export interface SummaryBarProps {
  now: GameState;
  forecast: GameState;
  pack: DataPack;
  /** Who plays: the totals count the planets as the components make them. */
  view?: PayView;
  /** Only what has happened: the plan's forecast is not shown. */
  factOnly?: boolean;
}

const VALUES: { key: string; read: (state: GameState, pack: DataPack, view?: PayView) => number }[] = [
  { key: 'resources', read: readyResources },
  { key: 'influence', read: readyInfluence },
  { key: 'tradeGoods', read: s => s.tradeGoods },
  { key: 'commodities', read: s => s.commodities },
  { key: 'tactic', read: s => s.tactic },
  { key: 'fleet', read: s => s.fleet },
  { key: 'strategy', read: s => s.strategy },
  { key: 'vp', read: s => s.vp },
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

export function SummaryBar({ now, forecast, pack, view, factOnly = false }: SummaryBarProps) {
  const { t } = useTranslation();
  return (
    <div className="summary-bar" role="group" aria-label={t('plan.summary.label')}>
      {VALUES.map(({ key, read }) => {
        const before = read(now, pack, view);
        const after = factOnly ? before : read(forecast, pack, view);
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
