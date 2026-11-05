import type { KeyboardEvent, PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { systemPlanets, tileIdOf } from '../../domain/project';
import type { DataPack, Game, GameState, PlanetDef, UnitCounts, UnitId } from '../../domain/types';
import { HEX_SIZE, hexPoints, hexToPixel } from './geometry';
import { UNIT_ORDER, UnitGlyph } from './UnitGlyph';

export type Highlight = 'valid' | 'dim' | 'active';

export interface TileViewProps {
  slotKey: string;
  pack: DataPack;
  game: Game;
  state: GameState;
  highlight?: Highlight;
  selected?: boolean;
  /** A Fracture system sits beside the map, not in a slot: its tile id and centre are given here. */
  fracture?: { tileId: string; index: number; x: number; y: number };
  /** An ingress marker is drawn on this tile. */
  ingress?: boolean;
  onTap?: (slotKey: string) => void;
  onPointerDown?: (slotKey: string, event: PointerEvent) => void;
}

const PLANET_RADIUS = 15;
const PLANET_RADIUS_TIGHT = 13;
const SHIP_CELL = 30;
const SHIP_ROW = 20;
const HEX_INNER = HEX_SIZE - 1.5;
const GROUND_CELL = 24;
/** The number sits under the top edge of the hex; planets and markers keep clear of it. */
const NUMBER_BASELINE = -35;
/** In the top corners, beside the number. */
const CORNER_X = 29;
const CORNER_Y = -35;
const NAME_LENGTH = 11;
/** The lower names of three planets lean inward, where the hex is wider. */
const NAME_INWARD = 8;
/** Mecatol Rex, and its Thunder's Edge version. */
const MECATOL_PLANETS = ['mr', 'mrte'];
const WORMHOLE_SIGNS: Record<string, string> = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε' };

const shortName = (name: string): string => (name.length > NAME_LENGTH ? `${name.slice(0, NAME_LENGTH - 1)}…` : name);

const unitsOf = (counts: UnitCounts | undefined): { unit: UnitId; count: number }[] =>
  UNIT_ORDER.filter(u => (counts?.[u] ?? 0) > 0).map(unit => ({ unit, count: counts?.[unit] ?? 0 }));

const isGround = (unit: UnitId): boolean => unit === 'infantry' || unit === 'mech';

function planetSpots(count: number): { x: number; y: number }[] {
  if (count <= 1) return [{ x: 0, y: -12 }];
  if (count === 2) return [{ x: -27, y: -10 }, { x: 27, y: -10 }];
  return [{ x: 0, y: -19 }, { x: -31, y: 8 }, { x: 31, y: 8 }].concat(count > 3 ? [{ x: 0, y: 28 }] : []).slice(0, count);
}

/** Where the ground units of a planet stand: beside a lone planet, under the name otherwise. */
function groundSpot(index: number, total: number, planetCount: number, radius: number): { x: number; y: number } {
  if (planetCount === 1) return { x: (index === 0 ? -1 : 1) * (radius + 14), y: 0 };
  return { x: (index - (total - 1) / 2) * GROUND_CELL, y: radius + 20 };
}

/**
 * Places the stacks of the space area in rows below the planets and shrinks the whole group until every
 * cell lies inside the hex. Positions are the cell centres, relative to the hex centre.
 */
export function layoutUnits(count: number, planetCount: number): { scale: number; cells: { x: number; y: number }[] } {
  if (count === 0) return { scale: 1, cells: [] };
  const top = planetCount === 0 ? -2 : planetCount >= 3 ? 34 : 22;
  const cols = Math.min(count, 4);
  const rows = Math.ceil(count / cols);
  let scale = 1;
  while (scale > 0.1) {
    const bottom = top + rows * SHIP_ROW * scale;
    if (bottom <= 49 && cols * SHIP_CELL * scale <= 2 * (HEX_INNER - bottom / Math.sqrt(3)) - 2) break;
    scale -= 0.02;
  }
  const cells = Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, count - row * cols);
    return {
      x: ((i % cols) - (inRow - 1) / 2) * SHIP_CELL * scale,
      y: top + (row + 0.5) * SHIP_ROW * scale,
    };
  });
  return { scale, cells };
}

export function TileView({
  slotKey, pack, game, state, highlight, selected, fracture, ingress, onTap, onPointerDown,
}: TileViewProps) {
  const { t } = useTranslation();
  const { x, y } = fracture ?? hexToPixel(...(slotKey.split(',').map(Number) as [number, number]));
  const mapValue = game.map[slotKey];
  const tileId = fracture ? fracture.tileId : mapValue ? tileIdOf(game, slotKey) : '';
  const tile = fracture || mapValue ? pack.tiles[tileId] : undefined;
  const unknown = !fracture && mapValue !== undefined && !tile;

  const planets = fracture
    ? (tile?.planetIds ?? []).map(id => pack.planets[id]).filter((p): p is PlanetDef => p !== undefined)
    : systemPlanets(game, slotKey, pack);
  const spots = planetSpots(planets.length);
  const radius = planets.length >= 3 ? PLANET_RADIUS_TIGHT : PLANET_RADIUS;
  const worm = (tile?.wormholes ?? []).map(w => WORMHOLE_SIGNS[w] ?? w).join(' ');
  const anomalies = [tile?.anomaly, tile?.secondAnomaly].filter(a => a !== undefined);
  const hexKind = !tile ? 'hex-free' : tile.planetIds.some(id => MECATOL_PLANETS.includes(id)) ? 'hex-mecatol' : tile.kind !== 'system' ? `hex-${tile.kind}`
    : anomalies.length > 0 ? 'hex-anomaly' : tile.wormholes.length > 0 ? 'hex-wormhole' : 'hex-system';
  const caption = !tile || planets.length > 0 ? null
    : anomalies.length > 0 ? anomalies.map(a => t(`map.anomaly.${a}`)).join(' + ')
      : tile.kind === 'hyperlane' ? t('map.hyperlane')
        : tile.wormholes.length > 0 ? t('map.wormhole') : tile.kind === 'system' ? t('map.emptySystem') : null;

  const unitLabel = (unit: UnitId, count: number, owner: 'me' | 'enemy'): string =>
    `${t(`unit.${unit}`)} ×${count}${owner === 'enemy' ? ` (${t('map.enemy')})` : ''}`;

  const spaceUnits = [
    ...unitsOf(state.systems[slotKey]).map(u => ({ ...u, owner: 'me' as const })),
    ...unitsOf(game.enemyUnits[slotKey]).map(u => ({ ...u, owner: 'enemy' as const })),
  ];
  const layout = layoutUnits(spaceUnits.length, planets.length);

  const label = fracture ? t('map.fractureTile', { n: fracture.index + 1 }) : unknown
    ? t('map.unknownTile', { id: tileId })
    : tile ? t('map.tile', { number: tile.number }) : t('map.emptySlot');

  const activate = () => onTap?.(slotKey);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
  };

  return (
    <g
      transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}
      role={fracture ? 'group' : 'button'} tabIndex={fracture ? undefined : 0} aria-label={label}
      data-fracture-tile={fracture ? tileId : undefined}
      className={`tile${fracture ? ' tile-fracture' : ''}${highlight ? ` tile-${highlight}` : ''}${selected ? ' tile-selected' : ''}`}
      data-slot={slotKey}
      onClick={activate}
      onKeyDown={onKeyDown}
      onPointerDown={e => onPointerDown?.(slotKey, e)}
    >
      <polygon points={hexPoints(HEX_INNER)} className={`hex ${hexKind}`} />
      {tile && (
        <text x={0} y={NUMBER_BASELINE} className="tile-number">
          {fracture ? `F${fracture.index + 1}` : tile.number}
          {worm && <tspan className="tile-worm"> {worm}</tspan>}
        </text>
      )}
      {unknown && <text x={0} y={NUMBER_BASELINE} className="tile-number">{tileId}</text>}
      {unknown && <text x={0} y={4} className="tile-warning">!</text>}
      {caption && <text x={0} y={-14} className="tile-caption">{caption}</text>}

      {state.tokensOnMap.includes(slotKey) && (
        <g role="img" aria-label={t('map.commandToken')} transform={`translate(${-CORNER_X} ${CORNER_Y})`}>
          <circle r={7} className="token" />
          <path d="M-3,2 L0,-4 L3,2 Z" className="token-mark" />
        </g>
      )}

      {ingress && (
        <g role="img" aria-label={t('map.ingress')} transform={`translate(${CORNER_X} ${CORNER_Y})`}>
          <path d="M0,-8 L8,0 L0,8 L-8,0 Z" className="ingress" />
        </g>
      )}

      {planets.map((planet, i) => {
        const spot = spots[i];
        const control = state.control[planet.id];
        const exhausted = state.exhausted.includes(planet.id);
        const ground = unitsOf(state.ground[planet.id]);
        const parts = [`${planet.name}: ${planet.resources}/${planet.influence}`];
        if (control) parts.push(t(`map.control.${control}`));
        if (exhausted) parts.push(t('map.exhausted'));
        return (
          <g
            key={planet.id} role="group" aria-label={parts.join(', ')} transform={`translate(${spot.x} ${spot.y})`}
            data-control={control ?? 'none'} data-exhausted={exhausted ? 'true' : 'false'}
            className={`planet${exhausted ? ' planet-exhausted' : ''}`}
          >
            <circle r={radius} className={`planet-disc planet-${control ?? 'free'}`} />
            <text y={4.5} className="planet-values">
              <tspan className="value-resources">{planet.resources}</tspan>
              <tspan className="value-slash">/</tspan>
              <tspan className="value-influence">{planet.influence}</tspan>
            </text>
            {exhausted && <line x1={-radius * 0.7} y1={radius * 0.7} x2={radius * 0.7} y2={-radius * 0.7} className="planet-strike" />}
            {game.docks.includes(planet.id) && (
              <rect x={radius - 7} y={-radius - 1} width={8} height={8} rx={1.5} className="dock"
                role="img" aria-label={t('map.spaceDock')} />
            )}
            <text x={spot.x === 0 || planets.length < 3 ? 0 : -Math.sign(spot.x) * NAME_INWARD} y={radius + 10} className="planet-name">{shortName(planet.name)}</text>
            {ground.map(({ unit, count }, j) => {
              const place = groundSpot(j, ground.length, planets.length, radius);
              return (
                <g key={unit} transform={`translate(${place.x - (count > 1 ? 3 : 0)} ${place.y})`}>
                  <UnitGlyph unit={unit} owner="me" count={count} label={unitLabel(unit, count, 'me')} scale={0.72} />
                </g>
              );
            })}
          </g>
        );
      })}

      {spaceUnits.map((cell, i) => (
        <g key={`${cell.owner}-${cell.unit}`} transform={`translate(${layout.cells[i].x} ${layout.cells[i].y}) scale(${layout.scale})`}>
          <g transform={`translate(${cell.count > 1 ? -5 : 0} 0)`}>
            <UnitGlyph
              unit={cell.unit} owner={cell.owner} count={cell.count}
              label={unitLabel(cell.unit, cell.count, cell.owner)} scale={isGround(cell.unit) ? 0.72 : 0.85}
            />
          </g>
        </g>
      ))}
    </g>
  );
}
