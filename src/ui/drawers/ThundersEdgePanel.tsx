import { useTranslation } from 'react-i18next';
import type { DataPack } from '../../domain/types';
import type { StartEdits } from '../../game/save';
import type { MapSource } from '../../game/space';
import type { Table } from '../../game/types';
import { ExpeditionWidget, type SliceOwners } from './ExpeditionWidget';
import { FractureControl } from './FractureControl';
import { DrawerSheet } from '../overlays/Drawer';

export interface ThundersEdgePanelProps {
  table: Table;
  start: StartEdits;
  map: MapSource;
  pack: DataPack;
  owners: SliceOwners;
  /** Choosing the system or marking ingress needs the whole map: the panel steps aside for it. */
  onPlace: () => void;
  onMark: () => void;
}

/** The expedition and the Fracture, which are not plan entries, except for a contribution of mine. */
export function ThundersEdgePanel({ table, start, map, pack, owners, onPlace, onMark }: ThundersEdgePanelProps) {
  const { t } = useTranslation();
  return (
    <DrawerSheet className="te-panel" title={t('thundersEdge.title')}>
      <ExpeditionWidget placed={start.expedition.thundersEdgeSystem} map={map} pack={pack} owners={owners} onPlace={onPlace} />
      <FractureControl table={table} fracture={start.fracture} pack={pack} onMark={onMark} />
    </DrawerSheet>
  );
}
