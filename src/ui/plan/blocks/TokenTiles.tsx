import { useTranslation } from 'react-i18next';
import { tappedTokens } from '../../../domain/strategy';
import { Stepper } from '../../primitives/Stepper';

const FIELDS = ['tactic', 'fleet', 'strategy'] as const;
type Field = (typeof FIELDS)[number];
export type TokenCounts = Partial<Record<Field, number>>;

export interface TokenTilesProps {
  /** How many tokens there are to distribute; going beyond it is allowed, and the projection warns. */
  free: number;
  values: TokenCounts;
  /** The pools before this entry: given, a "+" with nothing free moves a token from the fullest other pool, and "−" takes one off a pool. */
  pools?: Record<Field, number>;
  onChange: (values: TokenCounts) => void;
}

const signed = (count: number): string => (count > 0 ? `+${count}` : count < 0 ? `−${-count}` : '0');

/** Three Steppers, one per pool: "+" adds a token, "−" takes one back. */
export function TokenTiles({ free, values, pools, onChange }: TokenTilesProps) {
  const { t } = useTranslation();
  const countOf = (field: Field) => values[field] ?? 0;
  const left = free - FIELDS.reduce((sum, field) => sum + countOf(field), 0);
  const rearranging = pools !== undefined && free === 0;
  const set = (field: Field, value: number) =>
    onChange(value > countOf(field) ? tappedTokens(values, field, free, pools) : { ...values, [field]: value });
  return (
    <div className="token-pick" role="group" aria-label={t('plan.strategy.tokens')}>
      <strong>{rearranging ? t('plan.strategy.rearrange') : t('plan.strategy.distribute', { n: left })}</strong>
      {FIELDS.map(field => (
        <Stepper
          key={field} name={t(`plan.summary.${field}`)} value={countOf(field)} min={pools ? undefined : 0}
          format={pools ? signed : undefined} onChange={value => set(field, value)}
        />
      ))}
      {pools && <p className="muted token-note">{t('plan.strategy.rearrangeNote')}</p>}
    </div>
  );
}
