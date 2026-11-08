import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { templateFor, tilesLostByLayout } from '../../../domain/mapBuilder';
import type { DataPack, Game, MapLayout } from '../../../domain/types';
import { useGame } from '../../../state/gameStore';

const LAYOUTS: MapLayout[] = ['standard', 'hyperlanes'];
// TODO(P2-251) #ws:ui-logic-to-domain #type:arch #size:s #layout — Какие числа игроков выбирают раскладку и где гиперпути от Milty, решает UI: перенести в domain/mapBuilder.ts
/** Player counts whose map has a choice of layouts. */
const CHOICE_COUNTS = [3, 4, 5];
/** Player counts whose hyperlane layout is Milty Draft's own, not a layout of the rules. */
const MILTY_COUNTS = [3, 4];

export interface LayoutPickerProps {
  game: Game;
  pack: DataPack;
}

/** Chooses the map layout of the game: standard or with hyperlanes. A layout the data lacks is shown as unavailable. */
export function LayoutPicker({ game, pack }: LayoutPickerProps) {
  const { t } = useTranslation();
  const setLayout = useGame(s => s.setLayout);
  const [asked, setAsked] = useState<{ layout: MapLayout; lost: number; gameId: string; playerCount: number } | null>(null);
  if (!CHOICE_COUNTS.includes(game.playerCount)) return null;
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
  // TODO(P2-252) #ws:ui-logic-to-domain #type:arch #dep:P2-251 #size:s #layout #hyperlanes — Число мест с гиперпутями считается по шаблону в UI: функция в domain/mapBuilder.ts
  const laneSlots = (templateFor(game.playerCount, 'hyperlanes', pack)?.slots ?? [])
    .filter(slot => slot.fixed && pack.tiles[slot.fixed.split('@')[0]]?.kind === 'hyperlane').length;

  return (
    <div className="layout-picker">
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
      {available('hyperlanes') && MILTY_COUNTS.includes(game.playerCount) && (
        <p className="muted">{t('layout.milty', { n: laneSlots })}</p>
      )}
      {/* TODO(P2-253) #ws:ui-containers #type:dup #dep:P2-250 #needs:prototype #size:s #confirm-bar — Строка подтверждения .row собрана руками: ConfirmBar */}
      {pending && (
        <div className="row">
          <span className="muted">{t('layout.confirm', { count: pending.lost })}</span>
          <button type="button" className="primary" onClick={confirm}>{t('layout.switch')}</button>
          <button type="button" onClick={() => setAsked(null)}>{t('layout.cancel')}</button>
        </div>
      )}
    </div>
  );
}
