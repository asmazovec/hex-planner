import { useTranslation } from 'react-i18next';

const FIELDS = ['tactic', 'fleet', 'strategy'] as const;
type Field = (typeof FIELDS)[number];
export type TokenCounts = Partial<Record<Field, number>>;

export interface TokenTilesProps {
  /** How many tokens there are to distribute; going beyond it is allowed, and the projection warns. */
  free: number;
  values: TokenCounts;
  /** The pools before this entry: given, a tap with nothing free moves a token from the fullest other pool. */
  pools?: Record<Field, number>;
  onChange: (values: TokenCounts) => void;
}

const signed = (count: number): string => (count > 0 ? `+${count}` : count < 0 ? `−${-count}` : '0');

/** Three tiles with a count: a tap always adds a token; a reset clears the distribution. */
export function TokenTiles({ free, values, pools, onChange }: TokenTilesProps) {
  const { t } = useTranslation();
  const countOf = (field: Field) => values[field] ?? 0;
  const left = free - FIELDS.reduce((sum, field) => sum + countOf(field), 0);
  const tap = (field: Field) => {
    const next: TokenCounts = { ...values, [field]: countOf(field) + 1 };
    if (pools && left <= 0) {
      const after = (f: Field) => pools[f] + countOf(f);
      const source = FIELDS.filter(f => f !== field).reduce((best, f) => (after(f) > after(best) ? f : best));
      next[source] = countOf(source) - 1;
    }
    onChange(next);
  };
  const rearranging = pools !== undefined && free === 0;
  return (
    <div className="token-pick" role="group" aria-label={t('plan.strategy.tokens')}>
      <strong>{rearranging ? t('plan.strategy.rearrange') : t('plan.strategy.distribute', { n: left })}</strong>
      <div className="token-tiles">
        {FIELDS.map(field => {
          const name = t(`plan.summary.${field}`);
          const count = countOf(field);
          const shown = pools ? signed(count) : String(count);
          return (
            <button key={field} type="button" className={`token-tile${count ? ' token-tile-on' : ''}`} aria-label={`${name}: ${shown}`} onClick={() => tap(field)}>
              <b>{shown}</b>{name}
            </button>
          );
        })}
      </div>
      <div className="token-foot">
        <p className="muted token-note">{t(pools ? 'plan.strategy.rearrangeNote' : 'plan.strategy.tokenNote')}</p>
        <button
          type="button" disabled={FIELDS.every(field => countOf(field) === 0)}
          onClick={() => onChange({ tactic: 0, fleet: 0, strategy: 0 })}
        >
          {t('plan.strategy.reset')}
        </button>
      </div>
    </div>
  );
}
