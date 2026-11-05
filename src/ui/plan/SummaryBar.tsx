import { useTranslation } from 'react-i18next';
import { readyInfluence, readyResources } from '../../domain/project';
import type { DataPack, GameState } from '../../domain/types';

export interface SummaryBarProps {
  now: GameState;
  forecast: GameState;
  pack: DataPack;
}

const VALUES: { key: string; read: (state: GameState, pack: DataPack) => number }[] = [
  { key: 'resources', read: readyResources },
  { key: 'influence', read: readyInfluence },
  { key: 'tradeGoods', read: s => s.tradeGoods },
  { key: 'tactic', read: s => s.tactic },
  { key: 'fleet', read: s => s.fleet },
  { key: 'strategy', read: s => s.strategy },
  { key: 'vp', read: s => s.vp },
];

export function SummaryBar({ now, forecast, pack }: SummaryBarProps) {
  const { t } = useTranslation();
  return (
    <div className="summary-bar" role="group" aria-label={t('plan.summary.label')}>
      {VALUES.map(({ key, read }) => (
        <div key={key} className="summary-cell" role="group" aria-label={t(`plan.summary.${key}`)}>
          <span>{t(`plan.summary.${key}`)}</span>
          <b>{read(now, pack)} → {read(forecast, pack)}</b>
        </div>
      ))}
    </div>
  );
}
