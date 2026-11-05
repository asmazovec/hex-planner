import { useTranslation } from 'react-i18next';
import { opponentsBySeat, planetHolder } from '../../domain/players';
import { systemPlanets, tileIdOf } from '../../domain/project';
import type { DataPack, Game, GameState, UnitId } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { UNIT_ORDER } from '../units/unitOrder';
import { opponentName } from './opponentName';
import { PlanetDetails } from './PlanetDetails';

export interface TileSheetProps {
  slotKey: string;
  pack: DataPack;
  game: Game;
  state: GameState;
}

/** `me`, an opponent id, or null for a free planet. */
type Owner = string | null;

const OwnerDot = ({ color }: { color: number }) => <span className="owner-dot" aria-hidden="true" style={{ background: `var(--player-${color})` }} />;

/** Details of one tile, with manual edits of enemy units, planet control and space docks. */
export function TileSheet({ slotKey, pack, game, state }: TileSheetProps) {
  const { t } = useTranslation();
  const setEnemyUnits = useGame(s => s.setEnemyUnits);
  const setPlanetControl = useGame(s => s.setPlanetControl);
  const setDock = useGame(s => s.setDock);

  const mapValue = game.map[slotKey];
  const tileId = mapValue ? tileIdOf(game, slotKey) : '';
  const rotation = mapValue?.split('@')[1];
  const tile = mapValue ? pack.tiles[tileId] : undefined;
  const title = mapValue ? t('map.sheet.title', { number: tile?.number ?? tileId }) : t('map.emptySlot');
  const planets = systemPlanets(game, slotKey, pack);
  const anomalies = [tile?.anomaly, tile?.secondAnomaly].filter(Boolean).map(name => t(`map.anomaly.${name}`)).join(', ');
  const enemies = game.enemyUnits[slotKey] ?? {};
  const seated = opponentsBySeat(game).map(o => ({ id: o.id, color: o.color, name: opponentName(game, pack, o.id, t) }));
  const unitIds = UNIT_ORDER.filter(u => pack.units[u]);
  const unitName = (u: UnitId): string => t(`unit.${u}`);
  const owners: { value: Owner; label: string; color?: number }[] = [
    { value: 'me', label: t('map.sheet.mine'), color: game.color },
    ...seated.map(o => ({ value: o.id, label: o.name, color: o.color })),
    { value: null, label: t('map.sheet.none') },
  ];

  return (
    <aside className="panel tile-sheet" aria-label={title}>
      <h2>{title}</h2>
      {!mapValue && <p className="muted">{t('map.sheet.empty')}</p>}
      {mapValue && !tile && <p className="muted">{t('map.sheet.unknown')}</p>}
      {rotation && <p className="muted">{t('map.sheet.rotation', { deg: Number(rotation) * 60 })}</p>}
      {anomalies && <p className="muted">{t('map.sheet.anomaly', { name: anomalies })}</p>}
      {tile && tile.wormholes.length > 0 && (
        <p className="muted">{t('map.sheet.wormholes', { list: tile.wormholes.join(', ') })}</p>
      )}
      {tile && planets.length === 0 && <p className="muted">{t('map.sheet.noPlanets')}</p>}

      {planets.map(planet => {
        const control = state.control[planet.id];
        const owner: Owner = control === 'enemy' ? planetHolder(game, planet.id) ?? null : control ?? null;
        return (
          <div key={planet.id} role="group" aria-label={planet.name} className="sheet-planet">
            <strong>{planet.name}</strong>
            <PlanetDetails planet={planet} relic={tile?.kind === 'fracture'} exhausted={state.exhausted.includes(planet.id)} />
            <div className="segment" role="group" aria-label={t('map.sheet.controlLabel', { planet: planet.name })}>
              {owners.map(o => (
                <button
                  key={String(o.value)} type="button" aria-pressed={owner === o.value}
                  onClick={() => setPlanetControl(planet.id, o.value)}
                >
                  {o.color !== undefined && <OwnerDot color={o.color} />}
                  {o.label}
                </button>
              ))}
            </div>
            <label className="check">
              <input
                type="checkbox" checked={game.docks.includes(planet.id)}
                onChange={e => setDock(planet.id, e.target.checked)}
              />
              {t('map.sheet.dock')}
            </label>
          </div>
        );
      })}

      {seated.map(({ id, color, name }) => {
        const units = enemies[id] ?? {};
        const heading = t('map.sheet.unitsOf', { name });
        return (
          <div key={id} role="group" aria-label={heading} className="sheet-units">
            <h3><OwnerDot color={color} />{heading}</h3>
            {unitIds.map(unit => {
              const n = units[unit] ?? 0;
              return (
                <div key={unit} className="row vp">
                  <span className="unit-name">{unitName(unit)}</span>
                  <button
                    type="button" aria-label={t('map.sheet.minus', { unit: unitName(unit) })} disabled={n === 0}
                    onClick={() => setEnemyUnits(slotKey, id, { ...units, [unit]: n - 1 })}
                  >
                    −
                  </button>
                  <output>{n}</output>
                  <button
                    type="button" aria-label={t('map.sheet.plus', { unit: unitName(unit) })}
                    onClick={() => setEnemyUnits(slotKey, id, { ...units, [unit]: n + 1 })}
                  >
                    +
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}
    </aside>
  );
}
