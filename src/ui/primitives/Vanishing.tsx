import { useLayoutEffect, useRef, type ReactNode, type TransitionEvent } from 'react';

export interface VanishingProps {
  /** The row is on its way out: it fades and folds, and takes no taps. */
  leaving: boolean;
  /** The transition has ended. The owner keeps a timer of its own: the event may never come. */
  onGone?: () => void;
  className?: string;
  children: ReactNode;
}

/**
 * A row of a list that leaves it smoothly: it fades and folds to nothing, with the gap of the list after it, so the rows
 * below rise without a jump. The fold starts a frame after the row is first drawn, so a row that leaves from its first
 * render is still seen going. While it folds the rows below move: their icon buttons take no taps (`.vanishing` in the
 * stylesheet), so a finger aimed at one thing cannot land on the removal of another.
 */
export function Vanishing({ leaving, onGone, className, children }: VanishingProps) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const row = ref.current;
    if (!leaving || !row) return undefined;
    const gap = row.parentElement ? getComputedStyle(row.parentElement).rowGap : '';
    row.style.height = `${row.offsetHeight}px`;
    const frame = requestAnimationFrame(() => {
      row.style.height = '0px';
      row.style.opacity = '0';
      if (gap.endsWith('px')) row.style.marginBottom = `-${gap}`;
    });
    return () => {
      cancelAnimationFrame(frame);
      row.style.height = '';
      row.style.opacity = '';
      row.style.marginBottom = '';
    };
  }, [leaving]);
  const onEnd = (event: TransitionEvent) => {
    if (leaving && event.target === event.currentTarget) onGone?.();
  };
  return (
    <div ref={ref} className={`${className ?? ''}${leaving ? ' vanishing' : ''}`.trim()} aria-hidden={leaving || undefined} onTransitionEnd={onEnd}>
      {children}
    </div>
  );
}
