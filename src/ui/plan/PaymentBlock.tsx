import { useTranslation } from 'react-i18next';
import { paymentValue, readyPlanetIds, type PaymentKind } from '../../domain/payment';
import type { DataPack, GameState, Payment } from '../../domain/types';
import { Stepper } from './Stepper';

export interface PaymentBlockProps {
  need: number;
  payment: Payment;
  /** The state just before the paying entry. */
  state: GameState;
  pack: DataPack;
  manual: boolean;
  /** What the payment must cover; resources unless an expedition part costs influence. */
  kind?: PaymentKind;
  onManual: (open: boolean) => void;
  onChange: (payment: Payment) => void;
}

/** Shows the automatic payment; the manual choice of planets and trade goods opens on request. */
export function PaymentBlock({ need, payment, state, pack, manual, kind = 'resources', onManual, onChange }: PaymentBlockProps) {
  const { t } = useTranslation();
  const value = (id: string): number => pack.planets[id]?.[kind] ?? 0;
  const byValue = (ids: string[]): string[] =>
    [...ids].sort((a, b) => value(b) - value(a) || (a < b ? -1 : 1));
  const paid = paymentValue(payment, kind, pack);
  const planetText = (id: string): string => `${pack.planets[id]?.name ?? id} ${value(id)}`;
  const choices = byValue([...new Set([...readyPlanetIds(state), ...payment.planets])]);
  const toggle = (id: string) => onChange({
    ...payment,
    planets: payment.planets.includes(id) ? payment.planets.filter(p => p !== id) : byValue([...payment.planets, id]),
  });
  const parts = [
    ...payment.planets.map(planetText),
    ...(payment.tradeGoods > 0 ? [t('plan.payment.tradeGoods', { n: payment.tradeGoods })] : []),
  ];

  return (
    <div className="editor-section" role="group" aria-label={t('plan.payment.title')}>
      <div className="panel-head">
        <strong>{t('plan.payment.summary', { need, paid })}</strong>
        <button type="button" onClick={() => onManual(!manual)}>{manual ? t('plan.payment.auto') : t('plan.payment.manual')}</button>
      </div>
      {!manual && <span className="muted">{parts.join(', ') || t('plan.payment.nothing')}</span>}
      {paid > need && <span className="muted">{t('plan.payment.surplus', { n: paid - need })}</span>}
      {manual && (
        <>
          <div className="pay-planets" role="group" aria-label={t('plan.payment.planets')}>
            {choices.map(id => (
              <button key={id} type="button" aria-pressed={payment.planets.includes(id)} onClick={() => toggle(id)}>
                {planetText(id)}
              </button>
            ))}
          </div>
          <Stepper
            name={t('plan.payment.tradeGood')} value={payment.tradeGoods} of={state.tradeGoods} min={0}
            onChange={tradeGoods => onChange({ ...payment, tradeGoods })}
          />
        </>
      )}
    </div>
  );
}
