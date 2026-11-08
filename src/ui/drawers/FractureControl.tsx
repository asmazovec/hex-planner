import { useTranslation } from 'react-i18next';
import { seatSlots } from '../../domain/mapBuilder';
import type { DataPack, Game } from '../../domain/types';
import { useGame } from '../../state/gameStore';

export interface FractureControlProps {
  game: Game;
  pack: DataPack;
  /** Starts ingress marking: a tap on a map system toggles its marker. */
  onMark: () => void;
}

/** The Fracture is opened by hand; nothing about it is automated. Ingress tokens are only marks on the map. */
export function FractureControl({ game, pack, onMark }: FractureControlProps) {
  const { t } = useTranslation();
  const setFractureActive = useGame(s => s.setFractureActive);
  const setFractureSeat = useGame(s => s.setFractureSeat);
  const { active, ingress, seat } = game.fracture;
  const seats = seatSlots(game.playerCount, pack, game.layout);
  return (
    <div className="editor-section" role="group" aria-label={t('fracture.title')}>
      <div className="panel-head">
        <strong>{t('fracture.title')}</strong>
        <button type="button" aria-pressed={active} onClick={() => setFractureActive(!active)}>
          {active ? t('fracture.close') : t('fracture.open')}
        </button>
      </div>
      <span className="muted">{t('fracture.note')}</span>
      {seats.length > 0 && (
        <div className="row" role="group" aria-label={t('fracture.seat')}>
          <span>{t('fracture.seat')}</span>
          {seats.map((_, i) => (
            <button key={i} type="button" aria-pressed={seat === i + 1} onClick={() => setFractureSeat(seat === i + 1 ? null : i + 1)}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
      <div className="row">
        <button type="button" onClick={onMark}>{t('fracture.mark')}</button>
        <span className="muted">{t('fracture.ingressCount', { n: ingress.length })}</span>
      </div>
    </div>
  );
}
