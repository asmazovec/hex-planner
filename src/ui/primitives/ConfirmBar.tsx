import type { ReactNode } from 'react';

export interface ConfirmBarProps {
  /** What happens if the player goes on. */
  text?: ReactNode;
  yes: string;
  no: string;
  /** The step cannot be undone, e.g. a deletion: the button wears the colour of danger. */
  danger?: boolean;
  /**
   * The bar's own row, e.g. `player-confirm`. Without it only the two buttons are given, to stand inside the card they
   * ask about.
   */
  className?: string;
  onYes: () => void;
  onNo: () => void;
}

/** A question before a step with consequences: the step, then the way back. */
export function ConfirmBar({ text, yes, no, danger, className, onYes, onNo }: ConfirmBarProps) {
  const buttons = (
    <>
      <button type="button" className={danger ? 'danger' : 'primary'} onClick={onYes}>{yes}</button>
      <button type="button" onClick={onNo}>{no}</button>
    </>
  );
  if (className === undefined) return buttons;
  return (
    <div className={className}>
      {text !== undefined && <span>{text}</span>}
      {buttons}
    </div>
  );
}
