import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { hyperlaneSlotCount, isMiltyLanes, LAYOUT_CHOICE_COUNTS, templateFor, tilesLostByLayout } from '../../../domain/mapBuilder';
import type { DataPack, Game, MapLayout } from '../../../domain/types';
import { useGame } from '../../../state/gameStore';
import { ConfirmBar } from '../../primitives/ConfirmBar';

const LAYOUTS: MapLayout[] = ['standard', 'hyperlanes'];

export interface LayoutPickerProps {
  game: Game;
  pack: DataPack;
  /** The game has started: the layout is shown and no longer changes. */
  locked?: boolean;
}

/** Chooses the map layout of the game: standard or with hyperlanes. A layout the data lacks is shown as unavailable. */
export function LayoutPicker({ game, pack, locked = false }: LayoutPickerProps) {
  const { t } = useTranslation();
  const setLayout = useGame(s => s.setLayout);
  const [asked, setAsked] = useState<{ layout: MapLayout; lost: number; gameId: string; playerCount: number } | null>(null);
  if (!LAYOUT_CHOICE_COUNTS.includes(game.playerCount)) return null;
  // A question about another game or player count, or one already answered by the layout in use, is stale.
  const pending = asked && asked.gameId === game.id && asked.playerCount === game.playerCount && asked.layout !== game.layout ? asked : null;

  const available = (layout: MapLayout): boolean => templateFor(game.playerCount, layout, pack) !== undefined;
  const choose = (layout: MapLayout) => {
    if (layout === game.layout) return;
    const lost = tilesLostByLayout(game, layout, pack);
    if (lost === 0) setLayout(layout);
    else setAsked({ layout, lost, gameId: game.id, playerCount: game.playerCount });
  };
  const confirm = () => {
    if (pending) setLayout(pending.layout);
    setAsked(null);
  };

  return (
    <div className="layout-picker">
      <strong id="layout-picker-label">{t('layout.label')}</strong>
      <div className="segment" role="radiogroup" aria-labelledby="layout-picker-label">
        {LAYOUTS.map(layout => (
          <button
            key={layout} type="button" role="radio" aria-checked={game.layout === layout}
            disabled={locked || !available(layout)} onClick={() => choose(layout)}
          >
            {t(`layout.${layout}`)}
          </button>
        ))}
      </div>
      {!locked && !available('hyperlanes') && <p className="muted">{t('layout.needsPok')}</p>}
      {!locked && available('hyperlanes') && isMiltyLanes(game.playerCount) && (
        <p className="muted">{t('layout.milty', { n: hyperlaneSlotCount(game.playerCount, pack) })}</p>
      )}
      {pending && (
        <ConfirmBar
          className="player-confirm" text={t('layout.confirm', { count: pending.lost })} yes={t('layout.switch')} no={t('layout.cancel')}
          onYes={confirm} onNo={() => setAsked(null)}
        />
      )}
    </div>
  );
}
