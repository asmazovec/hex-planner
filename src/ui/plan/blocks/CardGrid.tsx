import type { ReactNode } from 'react';

export interface CardCellView {
  /** Added to `card-cell`, e.g. ` card-main`. */
  className?: string;
  pressed?: boolean;
  current?: boolean;
  disabled?: boolean;
  /** What the cell says of itself under the pointer: the warning its choice would cause. */
  title?: string;
  /** Small lines under the name. */
  extra?: ReactNode;
  onClick: () => void;
}

/** The strategy cards of the round in a grid: the number big, the name under it. */
export function CardGrid<C extends { initiative: number; name: string }>({ label, cards, cellOf }: { label: string; cards: C[]; cellOf: (card: C) => CardCellView }) {
  return (
    <div className="card-grid" role="group" aria-label={label}>
      {cards.map(card => {
        const { className = '', pressed, current, disabled, title, extra, onClick } = cellOf(card);
        return (
          <button
            key={card.initiative} type="button" className={`card-cell${className}`} aria-pressed={pressed} aria-current={current ? 'true' : undefined}
            disabled={disabled} title={title} onClick={onClick}
          >
            <b>{card.initiative}</b>{card.name}
            {extra}
          </button>
        );
      })}
    </div>
  );
}
