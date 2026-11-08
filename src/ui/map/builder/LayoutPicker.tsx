import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { hyperlaneSlotCount, isMiltyLanes, layoutChoices, templateFor, tilesLostByLayout } from '../../../domain/mapBuilder';
import type { DataPack, Game, MapLayout } from '../../../domain/types';
import { useGame } from '../../../state/gameStore';
import { ConfirmBar } from '../../primitives/ConfirmBar';

/** Layouts with a note of the rulebook on the deal: `layout.note.<players>-<layout>`. */
const NOTED = ['5-hyperlanes', '6-large', '7-hyperlanes', '7-alternate', '8-standard', '8-alternate'];

export interface LayoutPickerProps {
  game: Game;
  pack: DataPack;
  /** The game has started: the layout is shown and no longer changes. */
  locked?: boolean;
}

/**
 * Chooses the map layout of the game among those the rules give its player count, with a note on the deal of the one
 * in use. A layout the data lacks is shown as unavailable.
 */
export function LayoutPicker({ game, pack, locked = false }: LayoutPickerProps) {
  const { t } = useTranslation();
  const setLayout = useGame(s => s.setLayout);
  const [asked, setAsked] = useState<{ layout: MapLayout; lost: number; gameId: string; playerCount: number } | null>(null);
  const choices = layoutChoices(game.playerCount);
  if (choices.length < 2) return null;
  // A question about another game or player count, or one already answered by the layout in use, is stale.
  const pending = asked && asked.gameId === game.id && asked.playerCount === game.playerCount && asked.layout !== game.layout ? asked : null;

  const available = (layout: MapLayout): boolean => templateFor(game.playerCount, layout, pack) !== undefined;
  const missing = choices.filter(layout => !available(layout));
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
  const note = `${game.playerCount}-${game.layout}`;

  return (
    <div className="layout-picker">
      <strong id="layout-picker-label">{t('layout.label')}</strong>
      <div className="segment" role="radiogroup" aria-labelledby="layout-picker-label">
        {choices.map(layout => (
          <button
            key={layout} type="button" role="radio" aria-checked={game.layout === layout}
            disabled={locked || !available(layout)} onClick={() => choose(layout)}
          >
            {t(`layout.${layout}`)}
          </button>
        ))}
      </div>
      {NOTED.includes(note) && <p className="muted">{t(`layout.note.${note}`)}</p>}
      {!locked && missing.length > 0 && <p className="muted">{t(missing.includes('large') ? 'layout.largeNeedsPok' : 'layout.needsPok')}</p>}
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
