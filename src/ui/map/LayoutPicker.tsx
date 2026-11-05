import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mapIsEmpty, templateFor } from '../../domain/mapBuilder';
import type { DataPack, Game, MapLayout } from '../../domain/types';
import { useGame } from '../../state/gameStore';

const LAYOUTS: MapLayout[] = ['standard', 'hyperlanes'];
/** Player counts whose map has a choice of layouts. */
const CHOICE_COUNTS = [3, 4, 5];

export interface LayoutPickerProps {
  game: Game;
  pack: DataPack;
}

/** Chooses the map layout of the game: standard or with hyperlanes. A layout the data lacks is shown as unavailable. */
export function LayoutPicker({ game, pack }: LayoutPickerProps) {
  const { t } = useTranslation();
  const setLayout = useGame(s => s.setLayout);
  const [pending, setPending] = useState<MapLayout | null>(null);
  if (!CHOICE_COUNTS.includes(game.playerCount)) return null;

  const available = (layout: MapLayout): boolean => templateFor(game.playerCount, layout, pack) !== undefined;
  const choose = (layout: MapLayout) => {
    if (layout === game.layout) return;
    if (mapIsEmpty(game, pack)) setLayout(layout);
    else setPending(layout);
  };
  const confirm = () => {
    if (pending) setLayout(pending);
    setPending(null);
  };

  return (
    <div className="panel layout-picker">
      <strong id="layout-picker-label">{t('layout.label')}</strong>
      <div className="segment" role="radiogroup" aria-labelledby="layout-picker-label">
        {LAYOUTS.map(layout => (
          <button
            key={layout} type="button" role="radio" aria-checked={game.layout === layout}
            disabled={!available(layout)} onClick={() => choose(layout)}
          >
            {t(`layout.${layout}`)}
          </button>
        ))}
      </div>
      {!available('hyperlanes') && <p className="muted">{t('layout.needsPok')}</p>}
      {pending && (
        <div className="row">
          <span className="muted">{t('layout.confirm')}</span>
          <button type="button" className="primary" onClick={confirm}>{t('layout.switch')}</button>
          <button type="button" onClick={() => setPending(null)}>{t('layout.cancel')}</button>
        </div>
      )}
    </div>
  );
}
