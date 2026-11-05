import { useTranslation } from 'react-i18next';

export interface StepperProps {
  name: string;
  value: number;
  /** Shown after the value, e.g. "1/3" for one of three available. */
  of?: number;
  /** Lowest value; omit where a negative change makes sense. */
  min?: number;
  onChange: (value: number) => void;
}

export function Stepper({ name, value, of, min, onChange }: StepperProps) {
  const { t } = useTranslation();
  return (
    <div className="stepper" role="group" aria-label={name}>
      <span className="stepper-name">{name}</span>
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
