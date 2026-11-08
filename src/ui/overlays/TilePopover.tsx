import { useCallback, type ReactNode, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import type { View } from '../map/usePanZoom';
import { Popover } from './Popover';

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
  const hexOf = useCallback((area: HTMLElement) => area.querySelector(`[data-slot="${slot}"] polygon`), [slot]);
  return (
    <Popover
      className="tile-popover" data-slot-popover={slot} anchor={hexOf} follow={view} areaRef={areaRef} keepOpenIn=".hexmap"
      closeLabel={t('map.sheet.close')} onClose={onClose}
    >
      {children}
    </Popover>
  );
}
