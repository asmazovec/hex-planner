import { useTranslation } from 'react-i18next';
import type { DataPack, Game } from '../../domain/types';
import { ExpeditionWidget, type SliceOwners } from '../plan/ExpeditionWidget';
import { FractureControl } from '../plan/FractureControl';

export interface ThundersEdgePanelProps {
  game: Game;
  pack: DataPack;
  owners: SliceOwners;
  /** Choosing the system or marking ingress needs the whole map: the panel steps aside for it. */
  onPlace: () => void;
  onMark: () => void;
  onClose: () => void;
}

/** The expedition and the Fracture, which are not plan entries, except for a contribution of mine. */
export function ThundersEdgePanel({ game, pack, owners, onPlace, onMark, onClose }: ThundersEdgePanelProps) {
  const { t } = useTranslation();
  const title = t('thundersEdge.title');
  return (
    <aside className="te-panel" role="dialog" aria-label={title}>
      <div className="panel-head">
        <h2>{title}</h2>
        <button type="button" className="icon-button" aria-label={t('players.close')} onClick={onClose}>✕</button>
      </div>
      <ExpeditionWidget game={game} pack={pack} owners={owners} onPlace={onPlace} />
      <FractureControl game={game} pack={pack} onMark={onMark} />
    </aside>
  );
}
