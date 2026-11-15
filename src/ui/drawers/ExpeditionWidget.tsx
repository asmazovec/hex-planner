import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EXPEDITION_SLICES } from '../../domain/payment';
import type { SliceOwners } from '../../domain/thundersEdge';
import type { DataPack } from '../../domain/types';
import type { StartEdits } from '../../game/save';
import type { MapSource } from '../../game/space';
import { othersOf } from '../../game/tile';
import type { PlayerId, Table } from '../../game/types';
import { useGame } from '../../state/gameStore';
import { systemName } from '../map/systemName';
import { playerShortName } from '../players/names';
import { PlayerChoice, playerOptions } from '../primitives/player';
import { HexRemove } from '../primitives/Icon';
import { MapPickButton } from '../primitives/MapPickButton';

export type { SliceOwners } from '../../domain/thundersEdge';

export interface ExpeditionWidgetProps {
  /** The slot of Thunder's Edge once placed. */
  placed: string | null;
  map: MapSource;
  pack: DataPack;
  table: Table;
  /** The player the screen shows: their own part is taken with a turn of the plan, a tap here gives one to another player. */
  viewer: PlayerId;
  /** Who took each part, by player: at the start or by a turn of the plan. */
  owners: SliceOwners;
  /** The parts taken before the plan, which a tap here changes; a part a turn of the plan took is changed in that turn. */
  byHand: StartEdits['expedition']['slices'];
  /** Starts placing Thunder's Edge: the next tap on a suitable system puts it there. */
  onPlace: () => void;
}

/** Counter of taken expedition parts; a tap marks a free part as taken by the player chosen above the parts and frees one taken by hand, the parts of the plan's turns come from the plan. */
export function ExpeditionWidget({ placed, map, pack, table, viewer, owners, byHand, onPlace }: ExpeditionWidgetProps) {
  const { t } = useTranslation();
  const setSlice = useGame(s => s.setSlice);
  const setThundersEdge = useGame(s => s.setThundersEdge);
  const taken = Object.keys(owners).length;
  const others = othersOf(table, viewer);
  /** Whom a tap on a free part gives it to: the first of the other players until another is chosen. */
  const [chosen, setChosen] = useState<PlayerId | null>(null);
  const taker = others.find(p => p.id === chosen)?.id ?? others[0]?.id ?? null;

  return (
    <div className="editor-section" role="group" aria-label={t('expedition.title')}>
      <div className="panel-head">
        <strong>{t('expedition.title')}</strong>
        <output>{t('expedition.counter', { n: taken, total: EXPEDITION_SLICES.length })}</output>
      </div>
      {others.length > 1 && (
        <PlayerChoice
          label={t('expedition.taker')} chosen={value => value === taker} onPick={setChosen}
          options={playerOptions(others, pack, id => playerShortName(table, pack, id, t))}
        />
      )}
      <div className="slice-grid">
        {EXPEDITION_SLICES.map(({ id }) => {
          const owner = owners[id];
          const own = owner === viewer;
          const name = owner === undefined ? undefined : own ? t('expedition.mine') : playerShortName(table, pack, owner, t);
          return (
            <button
              key={id} type="button" className="slice" data-owner={owner === undefined ? 'none' : own ? 'own' : 'other'} aria-pressed={owner !== undefined}
              // A part a turn of the plan took is that turn's to change.
              disabled={owner !== undefined && !byHand[id]}
              onClick={() => setSlice(id, owner === undefined ? taker : null)}
            >
              {t(`plan.slice.${id}`)}
              {name && <small aria-hidden="true">{name}</small>}
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
            {t('expedition.placedAt', { system: systemName(map, pack, placed) })}
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
