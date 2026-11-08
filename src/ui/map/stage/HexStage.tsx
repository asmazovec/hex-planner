import { useTranslation } from 'react-i18next';
import { isOnMap, tileIdOf } from '../../../domain/project';
import type { DataPack, GameState } from '../../../domain/types';
import { HexRemove } from '../../primitives/Icon';
import { PlayerChoice } from '../../primitives/player';
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

export type StageMode = 'setup' | 'battle' | 'build' | 'control';

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

const MODES: StageMode[] = ['setup', 'battle', 'build', 'control'];

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
  const { game, state, shown, planets, target, setPlanet, mode, setMode, mine, side, setSide, seated, colours } = stage;

  const seatName = (o: { name: string; faction: string }): string => shortName(pack, o.faction, o.name);
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
                slotKey={slot} pack={pack} game={game} state={state} ingress={game.fracture.ingress.includes(slot)}
                stage={{ target, onPlanet: setPlanet, onToken: stage.onToken, ringed: item => stage.ringed(item.key) }}
              />
            </g>
          </svg>
        </div>
        <div className="stage-panel">
          <div className="stage-head">
            <strong>{title}</strong>
            <HexRemove label={t('map.sheet.close')} onClick={onClose} />
          </div>
          {!onPurchase?.changeStructure && !stage.adjusting && (
            <div className="segment stage-modes" role="group" aria-label={t('stage.modes')}>
              {MODES.map(m => <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>{t(`stage.mode.${m}`)}</button>)}
            </div>
          )}

          {/* It answers a tap on the hex, so it stands at the top of the panel beside it. */}
          {stage.tapNote && <WarningList message={t(`stage.tapNote.${stage.tapNote}`)} />}

          {(mode === 'setup' || mode === 'build') && !only && mine === 'me' && (
            <PlayerChoice
              label={t('stage.owner')} chosen={value => side === value} onPick={value => setSide(value)}
              options={[{ id: 'me', name: t('stage.mine'), color: game.color, faction: '' }, ...seated].map(o => ({ value: o.id, label: seatName(o), color: o.color }))}
            />
          )}

          {mode === 'setup' && <SetupPanel items={stage.shopItems} onPick={stage.buy} structuresOnly={structuresOnly} manyPlanets={manyPlanets} />}
          {mode === 'build' && (
            <BuildPanel
              game={game} pack={pack} items={stage.shopItems} onPick={stage.buy} structuresOnly={structuresOnly} manyPlanets={manyPlanets}
              boughtTotal={stage.boughtTotal} spent={stage.spent} mine={side === mine} meters={stage.meterRows} warnings={stage.entryWarnings}
            />
          )}
          {mode === 'battle' && (
            <BattlePanel
              players={[{ id: 'me', heading: t('stage.lossesMine') }, ...seated.map(o => ({ id: o.id, heading: t('stage.lossesOf', { name: o.name }) }))]}
              colours={colours} lossesFor={stage.lossesFor} planets={planets} kindName={stage.kindName}
            />
          )}
          {mode === 'control' && (
            <ControlPanel
              game={game} tile={tile} rotation={mapValue?.split('@')[1]} planets={planets} shown={shown}
              seated={seated.map(o => ({ id: o.id, label: seatName(o), color: o.color }))}
            />
          )}
        </div>
    </Modal>
  );
}
