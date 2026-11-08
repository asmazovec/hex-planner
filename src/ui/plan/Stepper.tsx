import { useTranslation } from 'react-i18next';

export interface StepperProps {
  name: string;
  value: number;
  /** Shown after the value, e.g. "1/3" for one of three available. */
  of?: number;
  /** Shown small beside the name, e.g. the price. */
  note?: string;
  /** Lowest value; omit where a negative change makes sense. */
  min?: number;
  onChange: (value: number) => void;
}

// TODO(P2-378) #ws:ui-structure #type:arch #size:s #dep:P2-377 — общий примитив лежит в plan/; в ui/primitives
export function Stepper({ name, value, of, note, min, onChange }: StepperProps) {
  const { t } = useTranslation();
  return (
    <div className="stepper" role="group" aria-label={name}>
      <span className="stepper-name">{name}{note && <small className="muted"> {note}</small>}</span>
      <button
        type="button" aria-label={t('plan.stepper.minus', { name })} disabled={min !== undefined && value <= min}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <output>{of === undefined ? value : `${value}/${of}`}</output>
      <button type="button" aria-label={t('plan.stepper.plus', { name })} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}
