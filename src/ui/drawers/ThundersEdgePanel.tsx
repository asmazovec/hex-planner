import { useTranslation } from 'react-i18next';
import type { DataPack, Game } from '../../domain/types';
import { ExpeditionWidget, type SliceOwners } from './ExpeditionWidget';
import { FractureControl } from './FractureControl';
import { DrawerSheet } from '../overlays/Drawer';

export interface ThundersEdgePanelProps {
  game: Game;
  pack: DataPack;
  owners: SliceOwners;
  /** Choosing the system or marking ingress needs the whole map: the panel steps aside for it. */
  onPlace: () => void;
  onMark: () => void;
}

/** The expedition and the Fracture, which are not plan entries, except for a contribution of mine. */
export function ThundersEdgePanel({ game, pack, owners, onPlace, onMark }: ThundersEdgePanelProps) {
  const { t } = useTranslation();
  return (
    <DrawerSheet className="te-panel" title={t('thundersEdge.title')}>
      <ExpeditionWidget game={game} pack={pack} owners={owners} onPlace={onPlace} />
      <FractureControl game={game} pack={pack} onMark={onMark} />
    </DrawerSheet>
  );
}
