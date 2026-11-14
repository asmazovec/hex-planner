import { useTranslation } from 'react-i18next';
import { isOnMap, tileIdOf } from '../../../domain/project';
import type { DataPack, GameState } from '../../../domain/types';
import { mapSource } from '../../../game/space';
import { HexRemove } from '../../primitives/Icon';
import { PlayerChoice, playerTag, type PlayerOption } from '../../primitives/player';
import { Modal } from '../../overlays/Modal';
import { WarningList } from '../../feedback/WarningText';
import { slotToPixel } from '../geometry';
import { systemName } from '../systemName';
import { shortName } from '../../players/names';
import type { PurchaseTarget } from './purchases';
import { TileView } from '../TileView';
import { useStage } from './useStage';
import { SetupPanel } from './SetupPanel';
import { BattlePanel } from './BattlePanel';
import { BuildPanel } from './BuildPanel';
import { ControlPanel } from './ControlPanel';
import { SectionTitle } from '../../primitives/SectionTitle';
import { UnitDraft } from '../../units/UnitDraft';
import { SpaceBadge } from '../PlanetBadge';

/** `fleet` removes ships beyond the fleet pool for a tactical action; it is only opened from that action, never chosen. */
export type StageMode = 'setup' | 'battle' | 'build' | 'control' | 'fleet';

export interface HexStageProps {
  slot: string;
  /** The round the map shows: my taps go into its entries, and the hex shows its forecast. */
  roundNo: number;
  pack: DataPack;
  initialMode?: StageMode;
  /** Limits the shop to structures or to units. */
  only?: 'build' | 'units';
  /** Takes my purchases instead of the round's tactical entry on this system or its merged adjustment. */
  onPurchase?: PurchaseTarget;
  /** Tactical entries whose payment was chosen by hand: a purchase leaves it alone. */
  manualPayments?: string[];
  /** The tactical entry that takes my purchases, when one is being edited; otherwise the round's last one on this system. */
  tacticalId?: string;
  /** The manual adjustment that takes my units: the hex then shows only that. */
  adjustmentId?: string;
  /** The opponent whose card this hex serves; an action's own owner counts without it. */
  owner?: string;
  /** What the map shows: control and readiness of a planet follow it, while the hex always shows the forecast. */
  shownState?: GameState;
  onClose: () => void;
}

const MODES: StageMode[] = ['control', 'setup', 'battle', 'build'];

/**
 * What the head calls the hex: the step it is opened for, never the tile number the hex itself shows. A tap on the map
 * opens a quick edit with no action behind it.
 */
type StageHeading = 'quick' | 'production' | 'construction' | 'battle' | 'fleet' | 'adjustment';
function headingOf({ tacticalId, adjustmentId, onPurchase, only }: HexStageProps, mode: StageMode): StageHeading {
  if (adjustmentId) return 'adjustment';
  if (onPurchase) return only === 'build' ? 'construction' : 'production';
  if (tacticalId) return mode === 'battle' ? 'battle' : mode === 'fleet' ? 'fleet' : 'production';
  return 'quick';
}

/**
 * The big hex over the map, driven by taps on pictures, with one panel per mode: setup places and removes units of
 * any origin, battle records losses, build buys, control shows the tile and who holds each planet. What a tap edits
 * lives in `useStage`.
 */
export function HexStage(props: HexStageProps) {
  const { slot, pack, only, onPurchase, onClose } = props;
  const { t } = useTranslation();
  const stage = useStage(props);
  if (!stage) return null;
  const { game, state, table, board, shown, planets, target, setPlanet, mode, setMode, mine, side, setSide, seated, colours } = stage;

  const seatName = (o: { name: string; faction: string }): string => shortName(pack, o.faction, o.name);
  /** An opponent in a player choice: the short name, and the tag for a crowded line. */
  const seatOption = (o: (typeof seated)[number]): PlayerOption => {
    const label = seatName(o);
    return { value: o.id, label, color: o.color, tag: playerTag(label, Boolean(pack.factions[o.faction]), o.seat) };
  };
  const mapValue = game.map[slot];
  const tileId = isOnMap(game, slot) ? tileIdOf(game, slot) : pack.tiles[slot] ? slot : '';
  const tile = pack.tiles[tileId];
  const title = t('map.sheet.title', { number: tile ? systemName(game, pack, slot) : tileId });
  const structuresOnly = only === 'build';
  const manyPlanets = planets.length > 1;
  const { x, y } = slotToPixel(slot);

  return (
    <Modal label={title} className="stage-dialog" onClose={onClose}>
        <div className="stage-hex">
          <svg viewBox="-68 -62 136 124" role="group" aria-label={t('stage.hex')}>
            <g transform={`translate(${-x} ${-y})`}>
              <TileView
                slotKey={slot} pack={pack} table={table} board={board} ingress={mapSource(table, board).fracture.ingress.includes(slot)}
                stage={{ target, onPlanet: setPlanet, onToken: stage.onToken, ringed: item => stage.ringed(item.key) }}
              />
            </g>
          </svg>
        </div>
        <div className="stage-panel">
          <div className="stage-head">
            <h2>{t(`stage.heading.${headingOf(props, mode)}`)}</h2>
            <HexRemove label={t('map.sheet.close')} onClick={onClose} />
          </div>
          {/* A hex opened for an entry's step does only that step. */}
          {!onPurchase && !props.tacticalId && !stage.adjusting && (
            <div className="segment stage-modes" role="group" aria-label={t('stage.modes')}>
              {MODES.map(m => <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>{t(`stage.mode.${m}`)}</button>)}
            </div>
          )}

          {/* It answers a tap on the hex, so it stands at the top of the panel beside it. */}
          {stage.tapNote && <WarningList message={t(`stage.tapNote.${stage.tapNote}`)} />}

          {(mode === 'setup' || mode === 'build') && !only && mine === 'me' && (
            <PlayerChoice
              label={t('stage.owner')} chosen={value => side === value} onPick={value => setSide(value)}
              options={[{ value: 'me', label: t('stage.mine'), color: game.color }, ...seated.map(seatOption)]}
            />
          )}

          {mode === 'setup' && <SetupPanel items={stage.shopItems} onPick={stage.buy} structuresOnly={structuresOnly} manyPlanets={manyPlanets} game={game} pack={pack} boardWarnings={stage.boardWarnings} />}
          {mode === 'build' && (
            <BuildPanel
              game={game} pack={pack} state={state} production={stage.productionRows} construction={stage.constructionRows} stock={stage.shopStock}
              colour={colours[side]} onTake={stage.buyAt} onReturn={stage.unbuyAt} structuresOnly={structuresOnly}
              boughtTotal={stage.boughtTotal} spent={stage.spent} mine={side === mine} meters={stage.meterRows} warnings={stage.entryWarnings} boardWarnings={stage.boardWarnings}
            />
          )}
          {(mode === 'setup' || mode === 'build') && stage.handover && (
            <p className="muted">{t('stage.handover', {
              planet: stage.handover.planet,
              player: stage.handover.player === 'me' ? t('stage.you') : seatName(seated.find(o => o.id === stage.handover?.player) ?? { name: '', faction: '' }),
            })}</p>
          )}
          {mode === 'battle' && (
            <BattlePanel
              players={[{ id: 'me', heading: t('stage.lossesMine') }, ...seated.map(o => ({ id: o.id, heading: t('stage.lossesOf', { name: seatName(o) }) }))].filter(p => stage.fights(p.id))}
              colours={colours} lossesFor={stage.lossesFor} planets={planets} kindName={stage.kindName}
            />
          )}
          {mode === 'fleet' && (
            <>
              <SectionTitle>{t('stage.fleetRemoved')}</SectionTitle>
              {/* Always there, above the row that is tapped again and again: only its numbers change. */}
              {stage.fleetOver && (
                <div className="fleet-count" role="group" aria-label={t('stage.meter.fleet')}>
                  <div className="stage-meter">
                    <span>{t('stage.meter.fleet')}</span>
                    <b>{stage.fleetOver.ships} / {stage.fleetOver.fleet}</b>
                  </div>
                  <div className={stage.fleetOver.over > 0 ? 'fleet-left fleet-left-over' : 'fleet-left'}>
                    <span>{t(stage.fleetOver.over > 0 ? 'stage.fleetLeft' : 'stage.fleetWithin')}</span>
                    <b>{stage.fleetOver.over}</b>
                  </div>
                </div>
              )}
              <UnitDraft
                layout="vertical" colour={colours[mine]} stockLabel={t('stage.fleetStock')} pickedLabel={t('stage.fleetRemoved')}
                rows={[{ id: 'fleet', label: t('draft.space'), place: <SpaceBadge label={t('draft.space')} />, items: stage.fleetItems }]}
                onTake={(_, kind) => stage.removeShip(kind, 1)} onReturn={(_, kind) => stage.removeShip(kind, -1)}
              />
              <p className="muted">{t('stage.fleetNote')}</p>
            </>
          )}
          {mode === 'control' && (
            <ControlPanel
              game={game} pack={pack} tile={tile} rotation={mapValue?.split('@')[1]} planets={planets} shown={shown}
              seated={seated.map(seatOption)} chosen={planets[target]?.id} onChoose={setPlanet}
            />
          )}
        </div>
    </Modal>
  );
}
