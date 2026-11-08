import { useCallback, useEffect, useLayoutEffect, useRef, type HTMLAttributes, type ReactNode, type RefObject } from 'react';
import { popoverPosition } from '../map/viewLimits';
import { HexRemove } from '../primitives/Icon';

export interface PopoverProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'className'> {
  /** The element the popover stands beside, found in the area; without one it keeps its place. */
  anchor: (area: HTMLElement) => Element | null;
  /** Whatever moves the anchor, e.g. the view of the map: the popover follows it. */
  follow?: unknown;
  /** The area the popover stays inside. It holds the anchor and the popover. */
  areaRef: RefObject<HTMLElement | null>;
  /** A press outside closes the popover, except inside elements matching this selector, which report their own taps. */
  keepOpenIn?: string;
  closeLabel: string;
  onClose: () => void;
  /** The look of the card: `tile-popover`. */
  className: string;
  children: ReactNode;
}

/** A compact card anchored beside an element, with the one close control in its corner. */
export function Popover({ anchor, follow, areaRef, keepOpenIn, closeLabel, onClose, className, children, ...rest }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const pop = ref.current;
    const area = areaRef.current;
    const target = area && anchor(area);
    if (!pop || !area || !target) return;
    const box = area.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    const { side, left, top } = popoverPosition(
      { left: rect.left - box.left, right: rect.right - box.left, top: rect.top - box.top, bottom: rect.bottom - box.top },
      { width: pop.offsetWidth, height: pop.offsetHeight },
      { width: box.width, height: box.height },
    );
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
    pop.dataset.side = side;
  }, [anchor, areaRef]);

  useLayoutEffect(place, [place, follow]);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(place);
    if (ref.current) observer.observe(ref.current);
    if (areaRef.current) observer.observe(areaRef.current);
    return () => observer.disconnect();
  }, [place, areaRef]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Element) || ref.current?.contains(target) || (keepOpenIn && target.closest(keepOpenIn))) return;
      onClose();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [onClose, keepOpenIn]);

  return (
    <div ref={ref} className={className} {...rest}>
      <HexRemove className="popover-close" label={closeLabel} onClick={onClose} />
      {children}
    </div>
  );
}
