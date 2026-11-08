import { useTranslation } from 'react-i18next';
import { planetHolder } from '../../../domain/players';
import type { Game, GameState, PlanetDef, TileDef } from '../../../domain/types';
import { useGame } from '../../../state/gameStore';
import { PlayerChoice, type PlayerOption } from '../../primitives/player';
import { PlanetDetails } from './PlanetDetails';

export interface ControlPanelProps {
  game: Game;
  /** The tile on this slot, when the data know its number. */
  tile: TileDef | undefined;
  /** Sixths of a turn the tile stands rotated by, when the map gives one. */
  rotation: string | undefined;
  planets: PlanetDef[];
  /** What the map shows: control and readiness follow it. */
  shown: GameState;
  /** Each opponent as the control choice names them. */
  seated: PlayerOption[];
}

/**
 * Control: the facts of the tile in one line, then every planet of the system with its printed values and who holds
 * it. The tile itself is read here only: the map is built on the game screen.
 */
export function ControlPanel({ game, tile, rotation, planets, shown, seated }: ControlPanelProps) {
  const { t } = useTranslation();
  const setPlanetControl = useGame(s => s.setPlanetControl);
  const anomalies = [tile?.anomaly, tile?.secondAnomaly].filter(Boolean).map(name => t(`map.anomaly.${name}`)).join(', ');
  const facts = [
    rotation ? t('map.sheet.rotation', { deg: Number(rotation) * 60 }) : '',
    anomalies ? t('map.sheet.anomaly', { name: anomalies }) : '',
    tile && tile.wormholes.length > 0 ? t('map.sheet.wormholes', { list: tile.wormholes.join(', ') }) : '',
    tile && !anomalies && tile.wormholes.length === 0 ? t('map.sheet.plain') : '',
  ].filter(Boolean);
  const owners: { value: string | null; label: string; color?: number }[] = [
    { value: 'me', label: t('map.sheet.mine'), color: game.color },
    ...seated,
    { value: null, label: t('map.sheet.none') },
  ];
  return (
    <>
      {!tile && <p className="muted">{t('map.sheet.unknown')}</p>}
      {facts.length > 0 && <p className="muted">{facts.join(' · ')}</p>}
      {tile && planets.length === 0 && <p className="muted">{t('map.sheet.noPlanets')}</p>}
      {planets.map(planet => {
        const control = shown.control[planet.id];
        const holder = control === 'enemy' ? planetHolder(game, planet.id) ?? null : control ?? null;
        return (
          <div key={planet.id} role="group" aria-label={planet.name} className="stage-planet">
            <strong>{planet.name}</strong>
            <PlanetDetails planet={planet} relic={tile?.kind === 'fracture'} exhausted={shown.exhausted.includes(planet.id)} />
            <PlayerChoice
              label={t('map.sheet.controlLabel', { planet: planet.name })} options={owners}
              chosen={value => holder === value} onPick={value => setPlanetControl(planet.id, value)}
            />
          </div>
        );
      })}
    </>
  );
}
