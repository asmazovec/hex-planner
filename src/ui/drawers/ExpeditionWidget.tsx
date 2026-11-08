import { useTranslation } from 'react-i18next';
import { EXPEDITION_SLICES } from '../../domain/payment';
import type { SliceOwners } from '../../domain/thundersEdge';
import type { DataPack, Game } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { systemName } from '../map/systemName';
import { HexRemove } from '../primitives/Icon';
import { MapPickButton } from '../primitives/MapPickButton';

export type { SliceOwners } from '../../domain/thundersEdge';

export interface ExpeditionWidgetProps {
  game: Game;
  pack: DataPack;
  owners: SliceOwners;
  /** Starts placing Thunder's Edge: the next tap on a suitable system puts it there. */
  onPlace: () => void;
}

/** Counter of taken expedition parts; a part is taken by another player with a tap, mine come from the plan. */
export function ExpeditionWidget({ game, pack, owners, onPlace }: ExpeditionWidgetProps) {
  const { t } = useTranslation();
  const setSlice = useGame(s => s.setSlice);
  const setThundersEdge = useGame(s => s.setThundersEdge);
  const taken = Object.keys(owners).length;
  const placed = game.expedition.thundersEdgeSystem;

  return (
    <div className="editor-section" role="group" aria-label={t('expedition.title')}>
      <div className="panel-head">
        <strong>{t('expedition.title')}</strong>
        <output>{t('expedition.counter', { n: taken, total: EXPEDITION_SLICES.length })}</output>
      </div>
      <div className="slice-grid">
        {EXPEDITION_SLICES.map(({ id }) => {
          const owner = owners[id];
          return (
            <button
              key={id} type="button" className="slice" data-owner={owner ?? 'none'} aria-pressed={owner !== undefined}
              disabled={owner === 'me'}
              onClick={() => setSlice(id, owner === 'other' ? null : 'other')}
            >
              {t(`plan.slice.${id}`)}
              {owner && <small aria-hidden="true">{t(`expedition.owner.${owner}`)}</small>}
            </button>
          );
        })}
      </div>
      <span className="muted">{t('expedition.hint')}</span>
      {placed !== null ? (
        // The placed Thunder's Edge is a card, as a source row: a tap chooses the system again, the cross removes it.
        // The panel steps aside while the map chooses, so the button is never seen pressed.
        <div className="in-card">
          <MapPickButton active={false} className="source-button" onToggle={onPlace}>
            {t('expedition.placedAt', { system: systemName(game, pack, placed) })}
            <small>{t('expedition.repick')}</small>
          </MapPickButton>
          <HexRemove label={t('expedition.remove')} onClick={() => setThundersEdge(null)} />
        </div>
      ) : taken === EXPEDITION_SLICES.length && (
        <>
          <span role="status">{t('expedition.complete')}</span>
          <MapPickButton active={false} onToggle={onPlace}>{t('expedition.choose')}</MapPickButton>
        </>
      )}
    </div>
  );
}
