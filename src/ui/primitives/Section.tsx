import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RowIcon } from './Icon';

export interface SectionProps {
  title?: ReactNode;
  /** The block may stay empty: the title says so. */
  optional?: boolean;
  /** A control in the head, beside the title. */
  headAction?: ReactNode;
  /** What the block shows: its rows and notes. */
  children?: ReactNode;
  /** The warnings about what this block sets up; they stand after its rows. */
  warnings?: ReactNode;
  /** The control at the foot of the block, after its warnings. */
  action?: ReactNode;
  /** Names the block as a group for the screen reader. */
  label?: string;
  /** Folds under its title; it starts open. */
  collapsible?: boolean;
  /** The block's own layout, e.g. `unit-picker`. */
  className?: string;
}

/** A block of an editor: its title, its rows, the warnings about it and its control. */
export function Section({ title, optional, headAction, children, warnings, action, label, collapsible, className }: SectionProps) {
  const { t } = useTranslation();
  const classes = `editor-section${className ? ` ${className}` : ''}`;
  const heading = title !== undefined && <>{title}{optional && <>{' '}<small className="optional-note">{t('plan.tactical.optional')}</small></>}</>;
  if (collapsible) {
    return (
      <details className={classes} role={label ? 'group' : undefined} aria-label={label} open>
        <summary><span>{heading}</span><RowIcon name="chevron" /></summary>
        {children}
        {warnings}
        {action}
      </details>
    );
  }
  return (
    <div className={classes} role={label ? 'group' : undefined} aria-label={label}>
      {title !== undefined && (headAction ? <div className="panel-head"><strong>{heading}</strong>{headAction}</div> : <strong>{heading}</strong>)}
      {children}
      {warnings}
      {action}
    </div>
  );
}
