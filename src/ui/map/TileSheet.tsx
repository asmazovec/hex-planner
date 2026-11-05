import { useTranslation } from 'react-i18next';
import { systemPlanets, tileIdOf } from '../../domain/project';
import type { DataPack, Game, GameState, UnitId } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { UNIT_ORDER } from './UnitGlyph';

export interface TileSheetProps {
  slotKey: string;
  pack: DataPack;
  game: Game;
  state: GameState;
  onClose: () => void;
}

type Owner = 'me' | 'enemy' | null;

/** Details of one tile, with manual edits of enemy units, planet control and space docks. */
export function TileSheet({ slotKey, pack, game, state, onClose }: TileSheetProps) {
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
  const anomalies = [tile?.anomaly, tile?.secondAnomaly].filter(Boolean).join(', ');
  const enemy = game.enemyUnits[slotKey] ?? {};
  const unitIds = UNIT_ORDER.filter(u => pack.units[u]);
  const unitName = (u: UnitId): string => pack.units[u]?.name ?? u;
  const owners: { value: Owner; label: string }[] = [
    { value: 'me', label: t('map.sheet.mine') },
    { value: 'enemy', label: t('map.sheet.enemy') },
    { value: null, label: t('map.sheet.none') },
  ];

  return (
    <aside className="panel tile-sheet" aria-label={title}>
      <div className="row">
        <h2>{title}</h2>
        <button type="button" onClick={onClose}>{t('map.sheet.close')}</button>
      </div>
      {!mapValue && <p className="muted">{t('map.sheet.empty')}</p>}
      {mapValue && !tile && <p className="muted">{t('map.sheet.unknown')}</p>}
      {rotation && <p className="muted">{t('map.sheet.rotation', { deg: Number(rotation) * 60 })}</p>}
      {anomalies && <p className="muted">{t('map.sheet.anomaly', { name: anomalies })}</p>}
      {tile && tile.wormholes.length > 0 && (
        <p className="muted">{t('map.sheet.wormholes', { list: tile.wormholes.join(', ') })}</p>
      )}
      {tile && planets.length === 0 && <p className="muted">{t('map.sheet.noPlanets')}</p>}

      {planets.map(planet => {
        const owner: Owner = state.control[planet.id] ?? null;
        return (
          <div key={planet.id} role="group" aria-label={planet.name} className="sheet-planet">
            <strong>{planet.name}</strong>
            <span className="muted">
              {planet.resources}/{planet.influence}
              {' · '}
              {state.exhausted.includes(planet.id) ? t('map.sheet.exhausted') : t('map.sheet.ready')}
            </span>
            <div className="row" role="group" aria-label={t('map.sheet.controlLabel', { planet: planet.name })}>
              {owners.map(o => (
                <button
                  key={String(o.value)} type="button" aria-pressed={owner === o.value}
                  onClick={() => setPlanetControl(planet.id, o.value)}
                >
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

      <div role="group" aria-label={t('map.sheet.enemyUnits')} className="sheet-units">
        <h3>{t('map.sheet.enemyUnits')}</h3>
        {unitIds.map(unit => {
          const n = enemy[unit] ?? 0;
          return (
            <div key={unit} className="row vp">
              <span className="unit-name">{unitName(unit)}</span>
              <button
                type="button" aria-label={t('map.sheet.minus', { unit: unitName(unit) })} disabled={n === 0}
                onClick={() => setEnemyUnits(slotKey, { ...enemy, [unit]: n - 1 })}
              >
                −
              </button>
              <output>{n}</output>
              <button
                type="button" aria-label={t('map.sheet.plus', { unit: unitName(unit) })}
                onClick={() => setEnemyUnits(slotKey, { ...enemy, [unit]: n + 1 })}
              >
                +
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
