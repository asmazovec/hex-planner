import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import type { View } from './usePanZoom';
import { popoverPosition } from './viewLimits';

export interface TilePopoverProps {
  slot: string;
  /** The current view: the popover moves with its hex. */
  view: View;
  /** The map area: the popover stays inside it. It holds the svg and the popover. */
  areaRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  children: ReactNode;
}

/** A compact window beside the selected hex. A press outside the map closes it; the map reports its own empty taps. */
export function TilePopover({ slot, view, areaRef, onClose, children }: TilePopoverProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const place = () => {
      const pop = ref.current;
      const area = areaRef.current;
      const hex = area?.querySelector(`[data-slot="${slot}"] polygon`);
      if (!pop || !area || !hex) return;
      const box = area.getBoundingClientRect();
      const rect = hex.getBoundingClientRect();
      const { side, left, top } = popoverPosition(
        { left: rect.left - box.left, right: rect.right - box.left, top: rect.top - box.top, bottom: rect.bottom - box.top },
        { width: pop.offsetWidth, height: pop.offsetHeight },
        { width: box.width, height: box.height },
      );
      pop.style.left = `${left}px`;
      pop.style.top = `${top}px`;
      pop.dataset.side = side;
    };
    place();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(place);
    if (ref.current) observer.observe(ref.current);
    if (areaRef.current) observer.observe(areaRef.current);
    return () => observer.disconnect();
  }, [slot, view, areaRef]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Element) || ref.current?.contains(target) || target.closest('.hexmap')) return;
      onClose();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [onClose]);

  return (
    <div ref={ref} className="tile-popover" data-slot-popover={slot}>
      <button type="button" className="popover-close" aria-label={t('map.sheet.close')} onClick={onClose}>✕</button>
      {children}
    </div>
  );
}
