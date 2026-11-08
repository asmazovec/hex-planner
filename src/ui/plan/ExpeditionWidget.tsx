import { useTranslation } from 'react-i18next';
import { EXPEDITION_SLICES } from '../../domain/payment';
import type { DataPack, Game, Plan } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { systemName } from './tactical';

export type SliceOwners = Record<string, 'me' | 'other'>;

// TODO(P2-369) #ws:ui-logic-to-domain #type:arch #size:s — sliceOwners — правило владения частями экспедиции; в domain/thundersEdge.ts
/** Who holds each expedition part: mine come from the plan's expedition entries, the others' are tapped in. */
export function sliceOwners(game: Game, plan: Plan): SliceOwners {
  const owners: SliceOwners = {};
  for (const [id, owner] of Object.entries(game.expedition.slices)) if (owner) owners[id] = owner;
  for (const round of plan.rounds) {
    for (const entry of round.entries) {
      if (entry.type === 'expedition' && entry.sliceId && entry.status !== 'cancelled') owners[entry.sliceId] = 'me';
    }
  }
  return owners;
}

// TODO(P2-370) #ws:ui-structure #type:arch #size:s — виджет нужен только map/ThundersEdgePanel; место в drawers/, не в plan/
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
      {taken === EXPEDITION_SLICES.length && placed === null && <span role="status">{t('expedition.complete')}</span>}
      {(taken === EXPEDITION_SLICES.length || placed !== null) && (
        <div className="row">
          {placed !== null && <span>{t('expedition.placedAt', { system: systemName(game, pack, placed) })}</span>}
          <button type="button" onClick={onPlace}>{t('expedition.choose')}</button>
          {/* TODO(P2-371) #ws:ui-containers #type:ui #needs:prototype #dep:P2-323 — текстовое «Убрать» вместо HexRemove */}
          {placed !== null && (
            <button type="button" onClick={() => setThundersEdge(null)}>{t('expedition.remove')}</button>
          )}
        </div>
      )}
    </div>
  );
}
