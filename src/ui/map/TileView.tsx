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
const SHIP_CELL = 30;
const SHIP_ROW = 16;
const HEX_INNER = HEX_SIZE - 1.5;
const GROUND_CELL = 24;


const unitsOf = (counts: UnitCounts | undefined): { unit: UnitId; count: number }[] =>
  UNIT_ORDER.filter(u => (counts?.[u] ?? 0) > 0).map(unit => ({ unit, count: counts?.[unit] ?? 0 }));

const isGround = (unit: UnitId): boolean => unit === 'infantry' || unit === 'mech';

function planetSpots(count: number): { x: number; y: number }[] {
  if (count <= 1) return [{ x: 0, y: -12 }];
  if (count === 2) return [{ x: -28, y: -12 }, { x: 28, y: -12 }];
  return [{ x: 0, y: -26 }, { x: -30, y: 0 }, { x: 30, y: 0 }].concat(count > 3 ? [{ x: 0, y: 14 }] : []).slice(0, count);
}

/**
 * Places the stacks of the space area in rows below the planets and shrinks the whole group until every
 * cell lies inside the hex. Positions are the cell centres, relative to the hex centre.
 */
export function layoutUnits(count: number, planetCount: number): { scale: number; cells: { x: number; y: number }[] } {
  if (count === 0) return { scale: 1, cells: [] };
  const top = planetCount >= 3 ? 32 : 24;
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
      <polygon points={hexPoints(HEX_INNER)} className={`hex${tile ? ` hex-${tile.kind}` : ''}`} />
      {tile && <text x={0} y={-45} className="tile-number">{fracture ? `F${fracture.index + 1}` : tile.number}</text>}
      {unknown && <text x={0} y={-45} className="tile-number">{tileId}</text>}
      {unknown && <text x={0} y={4} className="tile-warning">!</text>}

      {state.tokensOnMap.includes(slotKey) && (
        <g role="img" aria-label={t('map.commandToken')} transform="translate(-36 -28)">
          <circle r={7} className="token" />
          <path d="M-3,2 L0,-4 L3,2 Z" className="token-mark" />
        </g>
      )}

      {ingress && (
        <g role="img" aria-label={t('map.ingress')} transform="translate(36 -28)">
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
            <circle r={PLANET_RADIUS} className={`planet-disc planet-${control ?? 'free'}`} />
            <text y={4} className="planet-values">{planet.resources}/{planet.influence}</text>
            {game.docks.includes(planet.id) && (
              <rect x={PLANET_RADIUS - 6} y={-PLANET_RADIUS - 2} width={9} height={9} className="dock"
                role="img" aria-label={t('map.spaceDock')} />
            )}
            {selected && <text y={-PLANET_RADIUS - 4} className="planet-name">{planet.name}</text>}
            {ground.map(({ unit, count }, j) => (
              <g key={unit} transform={`translate(${(j - (ground.length - 1) / 2) * GROUND_CELL - (count > 1 ? 4 : 0)} ${PLANET_RADIUS + 9})`}>
                <UnitGlyph unit={unit} owner="me" count={count} label={unitLabel(unit, count, 'me')} scale={0.55} />
              </g>
            ))}
          </g>
        );
      })}

      {spaceUnits.map((cell, i) => (
        <g key={`${cell.owner}-${cell.unit}`} transform={`translate(${layout.cells[i].x} ${layout.cells[i].y}) scale(${layout.scale})`}>
          <g transform={`translate(${cell.count > 1 ? -4 : 0} 0)`}>
            <UnitGlyph
              unit={cell.unit} owner={cell.owner} count={cell.count}
              label={unitLabel(cell.unit, cell.count, cell.owner)} scale={isGround(cell.unit) ? 0.6 : 0.75}
            />
          </g>
        </g>
      ))}
    </g>
  );
}
