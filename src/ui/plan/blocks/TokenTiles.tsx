import { useTranslation } from 'react-i18next';
import { tappedTokens } from '../../../domain/strategy';

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
  const tap = (field: Field) => onChange(tappedTokens(values, field, free, pools));
  const take = (field: Field) => onChange({ ...values, [field]: countOf(field) - 1 });
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
            <div key={field} className="token-cell">
              <button type="button" className={`token-tile${count ? ' token-tile-on' : ''}`} aria-label={`${name}: ${shown}`} onClick={() => tap(field)}>
                <b>{shown}</b>{name}
              </button>
              {/* TODO(P2-340) #ws:ui-containers #type:ui #needs:prototype #size:s #dep:P2-332 — ещё один вид «−»; Stepper */}
              {!pools && count > 0 && <button type="button" className="token-take" aria-label={t('plan.strategy.takeToken', { name })} onClick={() => take(field)}>−</button>}
            </div>
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
