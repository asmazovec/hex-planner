import { useMemo, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { HEX_INNER, hexLayout, type HexLayoutInput, type LayoutObstacle, type PlacedPlanet, type PlacedStack } from '../../domain/hexLayout';
import { MECATOL_PLANETS } from '../../domain/mecatol';
import { opponentsBySeat } from '../../domain/players';
import { holderIn, stacksOf } from '../../domain/stacks';
import { rotateLanes } from '../../domain/lanes';
import { isOnMap, systemPlanets, tileIdOf } from '../../domain/project';
import type { DataPack, Game, GameState, PlanetDef, TechType } from '../../domain/types';
import { tokenColours } from '../units/sprites';
import { TokenLayer } from '../units/TokenLayer';
import { hexPoints, slotToPixel } from './geometry';
import { CommandTokenMark, IngressMark } from './marks';
import { playerStyle } from '../primitives/player';
import { opponentName } from '../players/names';

export type Highlight = 'valid' | 'dim' | 'active' | 'source' | 'path';

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
  /** A home system: the seat of its player and the number of that player's colour. */
  seat?: { number: number; color: number };
  onTap?: (slotKey: string) => void;
  onPointerDown?: (slotKey: string, event: PointerEvent) => void;
  /** Drawn as the big hex: tokens and planets take the taps, the tile itself none. */
  stage?: {
    /** The index of the planet that ground forces and structures go to. */
    target: number;
    onPlanet: (index: number) => void;
    onToken: (item: PlacedStack) => void;
    ringed: (item: PlacedStack) => boolean;
  };
}

/** The planet is drawn at this radius and scaled to its place. */
const PLANET_BASE = 10;
/** The number stands small in the top-left corner, its seat badge beside it; both stay above the tokens. */
export const NUMBER_FONT = 7.5;
const NUMBER_X = -31;
const NUMBER_BASELINE = -40.3;
/** About as wide as one character of the number. */
const NUMBER_CHAR = 4.3;
const SEAT_RADIUS = 4.6;
const SEAT_Y = NUMBER_BASELINE - 2.6;
/** Top-right corner: the command token against the top edge, the ingress below it along the side. */
const COMMAND_SPOT = { x: 26, y: -41, r: 6 };
/** The tokens of opponents stand in a row before mine. */
const RIVAL_TOKEN_STEP = 13;
const INGRESS_SPOT = { x: 36, y: -28, scale: 0.75 };
const INGRESS_RADIUS = 8 * INGRESS_SPOT.scale;
const NAME_LENGTH = 11;
/** The lower names of three planets lean inward, where the hex is wider. */
const NAME_INWARD = 8;
const CAPTION_Y = -14;
const NAME_FONT = 9;
const NAME_GAP = 9;
const NAME_CHAR = 4.7;
/** Technology marks sit at the upper right of the disc, in the planet's own units. */
const TECH_RADIUS = 12.4;
/** Marks stand along the upper edge of the disc, clear of the values: the first at 45 degrees from the top, the next ones towards the left. */
const techMarkAt = (n: number): { x: number; y: number } => {
  const angle = ((45 - 35 * n) * Math.PI) / 180;
  return { x: TECH_RADIUS * Math.sin(angle), y: -TECH_RADIUS * Math.cos(angle) };
};
/** One simple shape per type, so the colour is not the only sign. */
const TECH_SHAPES: Record<TechType, string> = {
  propulsion: 'M0,-3.9 L3.6,2.6 L-3.6,2.6 Z',
  biotic: 'M0,-3.6 A3.6,3.6 0 1 1 0,3.6 A3.6,3.6 0 1 1 0,-3.6 Z',
  cybernetic: 'M0,-4 L4,0 L0,4 L-4,0 Z',
  warfare: 'M-3.2,-3.2 L3.2,-3.2 L3.2,3.2 L-3.2,3.2 Z',
};
/** The legendary mark mirrors the first technology mark, on the upper left; a four-point star of its own. */
const LEGENDARY_SHAPE = 'M0,-4.2 L1.2,-1.2 L4.2,0 L1.2,1.2 L0,4.2 L-1.2,1.2 L-4.2,0 L-1.2,-1.2 Z';
const legendaryMarkAt = (): { x: number; y: number } => ({ x: -techMarkAt(0).x, y: techMarkAt(0).y });
/** The trait tint sits just inside the rim, which keeps showing the control. One trait fills the disc, two take a half each. */
const TINT_RADIUS = PLANET_BASE - 1;
const TINT_PATHS = {
  whole: `M0,${-TINT_RADIUS} A${TINT_RADIUS},${TINT_RADIUS} 0 1 1 0,${TINT_RADIUS} A${TINT_RADIUS},${TINT_RADIUS} 0 1 1 0,${-TINT_RADIUS} Z`,
  // The right half reaches 0.3 past the middle so no hairline seam shows between the halves.
  left: `M0.3,${-TINT_RADIUS} L0,${-TINT_RADIUS} A${TINT_RADIUS},${TINT_RADIUS} 0 0 0 0,${TINT_RADIUS} L0.3,${TINT_RADIUS} Z`,
  right: `M0,${-TINT_RADIUS} A${TINT_RADIUS},${TINT_RADIUS} 0 0 1 0,${TINT_RADIUS} Z`,
};
const WORMHOLE_SIGNS: Record<string, string> = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε' };

/** Distance from the hex centre to the middle of an edge. Edge 0 is at the top and numbers go clockwise. */
const EDGE_MIDDLE = HEX_INNER * Math.sqrt(3) / 2;

/** A lane from the middle of one edge to the middle of another, bent toward the centre; opposite edges give a straight line. */
export function lanePath([a, b]: [number, number]): string {
  const point = (edge: number) => ({ x: EDGE_MIDDLE * Math.sin((edge * Math.PI) / 3), y: -EDGE_MIDDLE * Math.cos((edge * Math.PI) / 3) });
  const from = point(a);
  const to = point(b);
  const bend = 0.15;
  return `M${from.x.toFixed(2)},${from.y.toFixed(2)} Q${((from.x + to.x) * bend).toFixed(2)},${((from.y + to.y) * bend).toFixed(2)} ${to.x.toFixed(2)},${to.y.toFixed(2)}`;
}

const shortName = (name: string): string => (name.length > NAME_LENGTH ? `${name.slice(0, NAME_LENGTH - 1)}…` : name);

/** A name or caption goes when a token or another planet covers its box; both are taken as round. */
function nameCovered(name: string, x: number, baseline: number, items: { x: number; y: number; size: number }[]): boolean {
  const half = (name.length * NAME_CHAR) / 2;
  return items.some(item => {
    const dx = item.x - Math.max(x - half, Math.min(item.x, x + half));
    const dy = item.y - Math.max(baseline - NAME_FONT, Math.min(item.y, baseline + 2));
    return Math.hypot(dx, dy) < item.size / 2;
  });
}

const placeOn = (spot: PlacedPlanet | PlacedStack, scale: number) => ({ transform: `translate(${spot.x.toFixed(2)}px,${spot.y.toFixed(2)}px) scale(${scale.toFixed(4)})` });

/** Every tile renders again on any change of the game, while its stacks rarely change. */
function useHexLayout(input: HexLayoutInput) {
  const key = JSON.stringify(input);
  return useMemo(() => hexLayout(JSON.parse(key) as HexLayoutInput), [key]);
}

/** A planet as the map draws it: its disc, the numbers, the marks of its traits and technology, and the strike when exhausted. */
export function PlanetMark({ planet, control, holderColor, exhausted }: { planet: PlanetDef; control?: 'me' | 'enemy'; holderColor?: number; exhausted: boolean }) {
  return (
    <>
      <circle
        r={PLANET_BASE} className={`planet-disc planet-${control ?? 'free'}`}
        style={holderColor ? playerStyle('stroke', holderColor) : undefined}
      />
      {(planet.traits ?? []).slice(0, 2).map((trait, n, shown) => (
        <path
          key={trait} d={shown.length === 1 ? TINT_PATHS.whole : n === 0 ? TINT_PATHS.left : TINT_PATHS.right}
          className={`planet-trait planet-trait-${trait}`}
        />
      ))}
      <text y={3.2} className="planet-values">
        <tspan className="value-resources">{planet.resources}</tspan>
        <tspan className="value-slash">/</tspan>
        <tspan className="value-influence">{planet.influence}</tspan>
      </text>
      {(planet.tech ?? []).map((tech, n) => (
        <path
          key={tech} d={TECH_SHAPES[tech]} className={`planet-tech planet-tech-${tech}`}
          transform={`translate(${techMarkAt(n).x.toFixed(2)} ${techMarkAt(n).y.toFixed(2)})`}
        />
      ))}
      {planet.legendary && (
        <path
          d={LEGENDARY_SHAPE} className="planet-legendary"
          transform={`translate(${legendaryMarkAt().x.toFixed(2)} ${legendaryMarkAt().y.toFixed(2)})`}
        />
      )}
      {exhausted && <line x1={-PLANET_BASE * 0.7} y1={PLANET_BASE * 0.7} x2={PLANET_BASE * 0.7} y2={-PLANET_BASE * 0.7} className="planet-strike" />}
    </>
  );
}

export function TileView({
  slotKey, pack, game, state, highlight, selected, fracture, ingress, seat, onTap, onPointerDown, stage,
}: TileViewProps) {
  const { t } = useTranslation();
  const { x, y } = fracture ?? slotToPixel(slotKey);
  const mapValue = game.map[slotKey];
  // An off-map home is opened by its tile's own id.
  const tileId = fracture ? fracture.tileId : isOnMap(game, slotKey) ? tileIdOf(game, slotKey) : pack.tiles[slotKey] ? slotKey : '';
  const tile = pack.tiles[tileId];
  const unknown = !fracture && mapValue !== undefined && !tile;

  const planets = fracture
    ? (tile?.planetIds ?? []).map(id => pack.planets[id]).filter((p): p is PlanetDef => p !== undefined)
    : systemPlanets(game, slotKey, pack);
  const worm = (tile?.wormholes ?? []).map(w => WORMHOLE_SIGNS[w] ?? w).join(' ');
  const anomalies = [tile?.anomaly, tile?.secondAnomaly].filter(a => a !== undefined);
  const hexKind = !tile ? 'hex-free' : tile.planetIds.some(id => MECATOL_PLANETS.includes(id)) ? 'hex-mecatol' : tile.kind !== 'system' ? `hex-${tile.kind}`
    : anomalies.length > 0 ? 'hex-anomaly' : tile.wormholes.length > 0 ? 'hex-wormhole' : 'hex-system';
  const rotation = Number(mapValue?.split('@')[1] ?? 0) % 6 || 0;
  const lanes = tile?.kind === 'hyperlane' && tile.lanes ? rotateLanes(tile.lanes, rotation) : [];
  // A hyperlane whose edges the data lacks cannot be drawn: it shows its id and rotation instead.
  const laneNote = tile?.kind === 'hyperlane' && !tile.lanes ? `${tileId} · ${rotation}` : null;

  const caption = !tile || planets.length > 0 ? null
    : anomalies.length > 0 ? anomalies.map(a => t(`map.anomaly.${a}`)).join(' + ')
      : tile.kind === 'hyperlane' ? (lanes.length > 0 ? null : t('map.hyperlane'))
        : tile.wormholes.length > 0 ? t('map.wormhole') : tile.kind === 'system' ? t('map.emptySystem') : null;

  const stackLabel = ({ kind, count, owner }: PlacedStack): string => {
    const whose = owner === 'me' ? '' : ` (${opponentName(game, pack, owner, t)})`;
    if (kind === 'spacedock') return `${t('map.spaceDock')}${whose}`;
    return `${kind === 'pds' ? t('map.pds') : t(`unit.${kind}`)} ×${count}${whose}`;
  };
  const colours = tokenColours(game);
  const seated = opponentsBySeat(game);
  /** The opponent a planet belongs to in the state shown; undefined when it is mine or free. */
  const holderOf = (planetId: string) => holderIn(game, state, planetId);
  const { space, ground } = stacksOf(game, state, slotKey, planets, pack);
  const hasCommandToken = state.tokensOnMap.includes(slotKey);
  const seatX = tile && seat ? NUMBER_X + (String(tile.number).length + (worm ? worm.length + 1 : 0)) * NUMBER_CHAR + SEAT_RADIUS + 1.5 : 0;
  const rivalTokens = seated.filter(o => state.rivals?.[o.id]?.tokensOnMap.includes(slotKey));
  const rivalTokenAt = (i: number) => ({ x: COMMAND_SPOT.x - (i + (hasCommandToken ? 1 : 0)) * RIVAL_TOKEN_STEP, y: COMMAND_SPOT.y, r: COMMAND_SPOT.r });
  const obstacles: LayoutObstacle[] = rivalTokens.map((_, i) => rivalTokenAt(i));
  if (hasCommandToken) obstacles.push(COMMAND_SPOT);
  if (ingress) obstacles.push({ x: INGRESS_SPOT.x, y: INGRESS_SPOT.y, r: INGRESS_RADIUS });
  if (tile && seat) obstacles.push({ x: seatX, y: SEAT_Y, r: SEAT_RADIUS });
  const layout = useHexLayout({ planets: planets.length, space, ground, obstacles, opponents: seated.map(o => o.id) });

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
      role={stage ? 'group' : 'button'} tabIndex={stage ? undefined : 0} aria-label={label}
      data-fracture-tile={fracture ? tileId : undefined}
      className={`tile${stage ? ' tile-stage' : ''}${fracture ? ' tile-fracture' : ''}${highlight ? ` tile-${highlight}` : ''}${selected ? ' tile-selected' : ''}${hasCommandToken ? ' tile-activated' : ''}`}
      data-slot={stage ? undefined : slotKey}
      onClick={activate}
      onKeyDown={onKeyDown}
      onPointerDown={e => onPointerDown?.(slotKey, e)}
    >
      <polygon points={hexPoints(HEX_INNER)} className={`hex ${hexKind}`} />
      {lanes.map(lane => (
        <path key={lane.join('-')} d={lanePath(lane)} data-lane={lane.join('-')} className="tile-lane" />
      ))}
      {unknown && <text x={0} y={4} className="tile-warning">!</text>}
      {laneNote && <text x={0} y={14} className="tile-caption">{laneNote}</text>}
      {caption && !nameCovered(caption, 0, CAPTION_Y, layout.items) && <text x={0} y={CAPTION_Y} className="tile-caption">{caption}</text>}

      {planets.map((planet, i) => {
        const spot = layout.planets[i];
        const control = state.control[planet.id];
        const holder = holderOf(planet.id);
        const holderColor = game.opponents.find(o => o.id === holder)?.color;
        const exhausted = state.exhausted.includes(planet.id);
        const parts = [`${planet.name}: ${planet.resources}/${planet.influence}`];
        for (const tech of planet.tech ?? []) parts.push(t(`map.tech.${tech}`));
        if (planet.legendary) parts.push(t('map.legendary'));
        if (control) parts.push(`${t(`map.control.${control}`)}${holder ? ` (${opponentName(game, pack, holder, t)})` : ''}`);
        if (exhausted) parts.push(t('map.exhausted'));
        return (
          <g
            key={planet.id} aria-label={parts.join(', ')} style={placeOn(spot, spot.r / PLANET_BASE)}
            data-control={control ?? 'none'} data-exhausted={exhausted ? 'true' : 'false'}
            className={`tk planet${exhausted ? ' planet-exhausted' : ''}`}
            {...(stage ? {
              role: 'button', tabIndex: 0, 'aria-pressed': stage.target === i, onClick: () => stage.onPlanet(i),
              onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); stage.onPlanet(i); } },
            } : { role: 'group' })}
          >
            {stage && planets.length > 1 && stage.target === i && <circle r={PLANET_BASE + 1.4} className="planet-target" />}
            <PlanetMark planet={planet} control={control} holderColor={holderColor} exhausted={exhausted} />
          </g>
        );
      })}

      {planets.map((planet, i) => {
        const spot = layout.planets[i];
        const name = shortName(planet.name);
        const nameX = spot.x + (spot.x === 0 || planets.length < 3 ? 0 : -Math.sign(spot.x) * NAME_INWARD);
        const baseline = spot.y + spot.r + NAME_GAP;
        const otherDiscs = layout.planets.filter(other => other !== spot).map(other => ({ x: other.x, y: other.y, size: 2 * other.r }));
        if (nameCovered(name, nameX, baseline, [...layout.items, ...otherDiscs])) return null;
        return (
          <g key={planet.id} className="tk" style={{ transform: `translate(${nameX.toFixed(2)}px,${baseline.toFixed(2)}px)` }}>
            <text className="planet-name">{name}</text>
          </g>
        );
      })}

      <TokenLayer items={layout.items} colourOf={item => colours[item.owner]} labelOf={stackLabel} onTap={stage?.onToken} ringed={stage?.ringed} />

      {tile && (
        <text x={NUMBER_X} y={NUMBER_BASELINE} fontSize={NUMBER_FONT} className="tile-number">
          {tile.kind === 'fracture' ? `F${tile.id.replace(/\D/g, '')}` : tile.number}
          {worm && <tspan className="tile-worm"> {worm}</tspan>}
        </text>
      )}
      {unknown && <text x={NUMBER_X} y={NUMBER_BASELINE} fontSize={NUMBER_FONT} className="tile-number">{tileId}</text>}
      {tile && seat && (
        <g
          role="img" aria-label={t('map.seat', { n: seat.number })} className="tile-seat"
          transform={`translate(${seatX} ${SEAT_Y})`}
        >
          <circle r={SEAT_RADIUS} style={playerStyle('fill', seat.color)} />
          <text y={2.3}>{seat.number}</text>
        </g>
      )}

      {hasCommandToken && (
        <g role="img" aria-label={t('map.commandToken')} transform={`translate(${COMMAND_SPOT.x} ${COMMAND_SPOT.y}) scale(${COMMAND_SPOT.r / 7})`}>
          <CommandTokenMark />
        </g>
      )}

      {rivalTokens.map((o, i) => (
        <g key={o.id} role="img" aria-label={t('map.commandTokenOf', { name: opponentName(game, pack, o.id, t) })} transform={`translate(${rivalTokenAt(i).x} ${rivalTokenAt(i).y}) scale(${COMMAND_SPOT.r / 7})`}>
          <CommandTokenMark color={o.color} />
        </g>
      ))}

      {ingress && (
        <g role="img" aria-label={t('map.ingress')} transform={`translate(${INGRESS_SPOT.x} ${INGRESS_SPOT.y}) scale(${INGRESS_SPOT.scale})`}>
          <IngressMark />
        </g>
      )}
    </g>
  );
}
