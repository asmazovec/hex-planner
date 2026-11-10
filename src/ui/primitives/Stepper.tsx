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
  /** How the value reads, e.g. with its sign for a change; the number itself by default. */
  format?: (value: number) => string;
  onChange: (value: number) => void;
}

export function Stepper({ name, value, of, note, min, format = String, onChange }: StepperProps) {
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
      {/* The value keeps its width as it changes, so the minus beside it stays under the finger. */}
      <output className={of === undefined ? undefined : 'stepper-of'}>{of === undefined ? format(value) : `${format(value)}/${of}`}</output>
      <button type="button" aria-label={t('plan.stepper.plus', { name })} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}
