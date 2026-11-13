import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { componentById } from '../../../domain/components';
import { paymentValue, planetValue, readyPlanetIds, type PaymentKind } from '../../../domain/payment';
import type { DataPack, GameState, Payment } from '../../../domain/types';
import { Section } from '../../primitives/Section';
import { Stepper } from '../../primitives/Stepper';

export interface PaymentBlockProps {
  need: number;
  payment: Payment;
  /** The state just before the paying entry. */
  state: GameState;
  pack: DataPack;
  manual: boolean;
  /** What the payment must cover; resources unless an expedition part costs influence. */
  kind?: PaymentKind;
  /** The block's name when it is not the payment of the action. */
  label?: string;
  /** The payer's faction: values are then counted after their components (attachments, a trade good worth more); without it the printed ones. */
  faction?: string;
  onManual: (open: boolean) => void;
  onChange: (payment: Payment) => void;
  /** The warnings about this payment. */
  children?: ReactNode;
}

/** Shows the automatic payment; the manual choice of planets and trade goods opens on request. */
export function PaymentBlock({ need, payment, state, pack, manual, kind = 'resources', label, faction, onManual, onChange, children }: PaymentBlockProps) {
  const { t } = useTranslation();
  const view = faction === undefined ? undefined : { faction };
  const value = (id: string): number => planetValue(pack, state, id, kind, view);
  const byValue = (ids: string[]): string[] =>
    [...ids].sort((a, b) => value(b) - value(a) || (a < b ? -1 : 1));
  const paid = paymentValue(payment, kind, pack, view && { ...view, state });
  // A planet card (The Triad) has no planet of the pack: it is named as the component it is.
  const planetText = (id: string): string => `${pack.planets[id]?.name ?? componentById(pack, id)?.name ?? id} ${value(id)}`;
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
    <Section
      label={label ?? t('plan.payment.title')} title={t('plan.payment.summary', { need, paid })} warnings={children}
      headAction={<button type="button" onClick={() => onManual(!manual)}>{manual ? t('plan.payment.auto') : t('plan.payment.manual')}</button>}
    >
      {!manual && <span className="muted">{parts.join(', ') || t('plan.payment.nothing')}</span>}
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
      {/* Under the choice: a line that comes and goes above the planets would push them from under the finger. */}
      {paid > need && <span className="muted">{t('plan.payment.surplus', { n: paid - need })}</span>}
    </Section>
  );
}
