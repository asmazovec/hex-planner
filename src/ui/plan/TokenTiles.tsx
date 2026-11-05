import { useTranslation } from 'react-i18next';

const FIELDS = ['tactic', 'fleet', 'strategy'] as const;
export type TokenCounts = Partial<Record<(typeof FIELDS)[number], number>>;

export interface TokenTilesProps {
  /** How many tokens there are to distribute. */
  free: number;
  values: TokenCounts;
  onChange: (values: TokenCounts) => void;
}

/** Three tiles with a count: a tap adds one token; with none free the tile resets. */
export function TokenTiles({ free, values, onChange }: TokenTilesProps) {
  const { t } = useTranslation();
  const left = free - FIELDS.reduce((sum, field) => sum + (values[field] ?? 0), 0);
  const tap = (field: (typeof FIELDS)[number]) => {
    const count = values[field] ?? 0;
    const next = left > 0 ? count + 1 : 0;
    if (next !== count) onChange({ ...values, [field]: next });
  };
  return (
    <div className="token-pick" role="group" aria-label={t('plan.strategy.tokens')}>
      <strong>{t('plan.strategy.distribute', { n: left })}</strong>
      <div className="token-tiles">
        {FIELDS.map(field => {
          const name = t(`plan.summary.${field}`);
          const count = values[field] ?? 0;
          return (
            <button key={field} type="button" className={`token-tile${count ? ' token-tile-on' : ''}`} aria-label={`${name}: ${count}`} onClick={() => tap(field)}>
              <b>{count}</b>{name}
            </button>
          );
        })}
      </div>
      <p className="muted token-note">{t('plan.strategy.tokenNote')}</p>
    </div>
  );
}
