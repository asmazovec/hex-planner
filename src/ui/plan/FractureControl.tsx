import { useTranslation } from 'react-i18next';
import type { Game } from '../../domain/types';
import { useGame } from '../../state/gameStore';

export interface FractureControlProps {
  game: Game;
  /** Ingress marking mode: a tap on a map system toggles its marker. */
  marking: boolean;
  onMarking: (marking: boolean) => void;
}

/** The Fracture is opened by hand; nothing about it is automated. Ingress tokens are only marks on the map. */
export function FractureControl({ game, marking, onMarking }: FractureControlProps) {
  const { t } = useTranslation();
  const setFractureActive = useGame(s => s.setFractureActive);
  const { active, ingress } = game.fracture;
  return (
    <div className="editor-section" role="group" aria-label={t('fracture.title')}>
      <div className="panel-head">
        <strong>{t('fracture.title')}</strong>
        <button type="button" aria-pressed={active} onClick={() => setFractureActive(!active)}>
          {active ? t('fracture.close') : t('fracture.open')}
        </button>
      </div>
      <div className="row">
        <button type="button" aria-pressed={marking} onClick={() => onMarking(!marking)}>{t('fracture.mark')}</button>
        <span className="muted">{t('fracture.ingressCount', { n: ingress.length })}</span>
      </div>
      {marking && <span className="muted">{t('fracture.markHint')}</span>}
    </div>
  );
}
