import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { hyperlaneSlotCount, isMiltyLanes, layoutChoices, templateFor } from '../../../domain/mapBuilder';
import type { DataPack, MapLayout } from '../../../domain/types';
import type { SavedGame } from '../../../game/save';
import { seatedCount, tilesLostByLayout } from '../../../game/edit/table';
import { useGame } from '../../../state/gameStore';
import { ConfirmBar } from '../../primitives/ConfirmBar';

/** Layouts with a note of the rulebook on the deal: `layout.note.<players>-<layout>`. */
const NOTED = ['5-hyperlanes', '6-large', '7-hyperlanes', '7-alternate', '8-standard', '8-alternate'];

export interface LayoutPickerProps {
  saved: SavedGame;
  pack: DataPack;
  /** The game has started: the layout is shown and no longer changes. */
  locked?: boolean;
}

/**
 * Chooses the map layout of the game among those the rules give its player count, with a note on the deal of the one
 * in use. A layout the data lacks is shown as unavailable.
 */
export function LayoutPicker({ saved, pack, locked = false }: LayoutPickerProps) {
  const { t } = useTranslation();
  const { table } = saved;
  const playerCount = seatedCount(table);
  const setLayout = useGame(s => s.setLayout);
  const [asked, setAsked] = useState<{ layout: MapLayout; lost: number; gameId: string; playerCount: number } | null>(null);
  const choices = layoutChoices(playerCount);
  if (choices.length < 2) return null;
  // A question about another game or player count, or one already answered by the layout in use, is stale.
  const pending = asked && asked.gameId === saved.id && asked.playerCount === playerCount && asked.layout !== table.layout ? asked : null;

  const available = (layout: MapLayout): boolean => templateFor(playerCount, layout, pack) !== undefined;
  const missing = choices.filter(layout => !available(layout));
  const choose = (layout: MapLayout) => {
    if (layout === table.layout) return;
    const lost = tilesLostByLayout(saved, layout, pack);
    if (lost === 0) setLayout(layout);
    else setAsked({ layout, lost, gameId: saved.id, playerCount: playerCount });
  };
  const confirm = () => {
    if (pending) setLayout(pending.layout);
    setAsked(null);
  };
  const note = `${playerCount}-${table.layout}`;

  return (
    <div className="layout-picker">
      <strong id="layout-picker-label">{t('layout.label')}</strong>
      <div className="segment" role="radiogroup" aria-labelledby="layout-picker-label">
        {choices.map(layout => (
          <button
            key={layout} type="button" role="radio" aria-checked={table.layout === layout}
            disabled={locked || !available(layout)} onClick={() => choose(layout)}
          >
            {t(`layout.${layout}`)}
          </button>
        ))}
      </div>
      {NOTED.includes(note) && <p className="muted">{t(`layout.note.${note}`)}</p>}
      {!locked && missing.length > 0 && <p className="muted">{t(missing.includes('large') ? 'layout.largeNeedsPok' : 'layout.needsPok')}</p>}
      {!locked && available('hyperlanes') && isMiltyLanes(playerCount) && (
        <p className="muted">{t('layout.milty', { n: hyperlaneSlotCount(playerCount, pack) })}</p>
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
