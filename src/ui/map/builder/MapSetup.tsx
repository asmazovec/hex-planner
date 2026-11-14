import { forwardRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { duplicateTiles } from '../../../domain/mapBuilder';
import type { DataPack } from '../../../domain/types';
import { emptySlots, freeSlots } from '../../../game/edit/table';
import type { SavedGame } from '../../../game/save';
import { WarningList } from '../../feedback/WarningText';
import type { SeatDrag } from '../../players/useSeatDrag';
import { SectionTitle } from '../../primitives/SectionTitle';
import { LayoutPicker } from './LayoutPicker';
import { MapStringImport } from './MapStringImport';
import { TileMinimap } from './TileMinimap';

export interface MapSetupProps {
  saved: SavedGame;
  pack: DataPack;
  drag: Omit<SeatDrag, 'ghostRef'>;
  ghostRef: SeatDrag['ghostRef'];
  /** The game has started: the layout and the seats stay, the tiles can still be set. */
  started: boolean;
  /** Notes about the seats, after the block's own. */
  children?: ReactNode;
}

/** The block «Map and seats» beside the players: the layout, the Milty string, the minimap and what the map still lacks. */
export const MapSetup = forwardRef<HTMLDivElement, MapSetupProps>(function MapSetup({ saved, pack, drag, ghostRef, started, children }, ref) {
  const { t } = useTranslation();
  const [importing, setImporting] = useState(false);
  const empty = emptySlots(saved.table, pack).length;
  const dupes = duplicateTiles(saved.table.map, pack);
  const total = freeSlots(saved.table, pack).length;

  return (
    <div className="side-group map-block" ref={ref}>
      <SectionTitle as="p" className="side-label">{t('builder.block')}</SectionTitle>
      <LayoutPicker saved={saved} pack={pack} locked={started} />
      {importing
        ? <MapStringImport saved={saved} pack={pack} started={started} onClose={() => setImporting(false)} />
        : <button type="button" className="map-paste" onClick={() => setImporting(true)}>{t('mapImport.title')}</button>}
      <TileMinimap saved={saved} pack={pack} drag={drag} ghostRef={ghostRef} locked={started} />
      {empty > 0 && <WarningList message={t('builder.empty', { count: empty })} />}
      {dupes.length > 0 && <WarningList message={t('builder.duplicates', { list: dupes.join(', ') })} />}
      {empty === 0 && total > 0 && <p className="map-ok" role="status">{t('builder.complete', { count: total })}</p>}
      <p className="side-note">{t(started ? 'builder.noteStarted' : 'builder.note')}</p>
      {children}
    </div>
  );
});
