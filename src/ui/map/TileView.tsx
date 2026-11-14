import { useMemo, type KeyboardEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { HEX_INNER, hexLayout, type HexLayout, type HexLayoutInput, type LayoutObstacle, type PlacedPlanet, type PlacedStack } from '../../domain/hexLayout';
import { MECATOL_PLANETS } from '../../domain/mecatol';
import { rotateLanes } from '../../domain/lanes';
import { isOnMap, tileIdOf } from '../../domain/project';
import type { PlanetValues } from '../../domain/payment';
import type { DataPack, PlanetDef } from '../../domain/types';
import { mapSource, planetsIn } from '../../game/space';
import { othersOf, ownerKey, planetShown, playerOfOwner, tileStacks } from '../../game/tile';
import type { Board, PlayerId, Table } from '../../game/types';
import { tableColours } from '../units/sprites';
import { TokenLayer } from '../units/TokenLayer';
import { hexPoints, slotToPixel } from './geometry';
import { CommandTokenMark, IngressMark, LEGENDARY_SHAPE, TECH_SHAPES } from './marks';
import { playerStyle } from '../primitives/player';
import { nameOfPlayer } from '../players/names';
import { WORMHOLE_SIGNS } from './systemName';

export type Highlight = 'valid' | 'dim' | 'active' | 'source' | 'path';

export interface TileViewProps {
  slotKey: string;
  pack: DataPack;
  table: Table;
  board: Board;
  /** Whose eyes the tile looks through: their units are `me`, the others stand after them by seat. The viewer of the table by default. */
  viewer?: PlayerId;
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
  /** Its tokens change at once, without growing or sliding: the action being shown does not touch this system. */
  quiet?: boolean;
  /**
   * Its planets and tokens are drawn into this group of a layer of its own over the map, where they move without
   * repainting the map; the tile itself stays on the map and takes the taps.
   */
  liftInto?: SVGGElement | null;
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
/** The tokens of opponents pile up before mine, each over the one before by about two fifths; closer when the corner is crowded. */
const RIVAL_TOKEN_STEP = 7;
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
/** The legendary mark mirrors the first technology mark, on the upper left; a four-point star of its own. */
const legendaryMarkAt = (): { x: number; y: number } => ({ x: -techMarkAt(0).x, y: techMarkAt(0).y });
/** The trait tint sits just inside the rim, which keeps showing the control. One trait fills the disc, two take a half each. */
const TINT_RADIUS = PLANET_BASE - 1;
const TINT_PATHS = {
  whole: `M0,${-TINT_RADIUS} A${TINT_RADIUS},${TINT_RADIUS} 0 1 1 0,${TINT_RADIUS} A${TINT_RADIUS},${TINT_RADIUS} 0 1 1 0,${-TINT_RADIUS} Z`,
  // The right half reaches 0.3 past the middle so no hairline seam shows between the halves.
  left: `M0.3,${-TINT_RADIUS} L0,${-TINT_RADIUS} A${TINT_RADIUS},${TINT_RADIUS} 0 0 0 0,${TINT_RADIUS} L0.3,${TINT_RADIUS} Z`,
  right: `M0,${-TINT_RADIUS} A${TINT_RADIUS},${TINT_RADIUS} 0 0 1 0,${TINT_RADIUS} Z`,
};


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

/** Layouts already found, by their stacks: rounds, plan and fact, and the repeats of a flight come back to the same ones. */
const layouts = new Map<string, HexLayout>();
const LAYOUTS_KEPT = 600;

function layoutOf(key: string): HexLayout {
  const known = layouts.get(key);
  if (known) return known;
  const layout = hexLayout(JSON.parse(key) as HexLayoutInput);
  // The oldest go first: a Map keeps the order things were put in.
  if (layouts.size >= LAYOUTS_KEPT) layouts.delete(layouts.keys().next().value!);
  layouts.set(key, layout);
  return layout;
}

/** Every tile renders again on any change of the game, while its stacks rarely change. */
function useHexLayout(input: HexLayoutInput) {
  const key = JSON.stringify(input);
  return useMemo(() => layoutOf(key), [key]);
}

/** A planet as the map draws it: its disc, the numbers, the marks of its traits and technology, and the strike when exhausted. */
export function PlanetMark({ planet, control, holderColor, exhausted, values }: { planet: PlanetDef; control?: 'me' | 'enemy'; holderColor?: number; exhausted: boolean; values?: PlanetValues }) {
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
        <tspan className={`value-resources${values?.changed ? ' value-changed' : ''}`}>{values?.resources ?? planet.resources}</tspan>
        <tspan className="value-slash">/</tspan>
        <tspan className={`value-influence${values?.changed ? ' value-changed' : ''}`}>{values?.influence ?? planet.influence}</tspan>
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
  slotKey, pack, table, board, viewer = table.viewer, highlight, selected, fracture, ingress, seat, onTap, onPointerDown, quiet = false, liftInto = null, stage,
}: TileViewProps) {
  const { t } = useTranslation();
  const { x, y } = fracture ?? slotToPixel(slotKey);
  const mapValue = table.map[slotKey];
  const source = mapSource(table, board);
  // An off-map home is opened by its tile's own id.
  const tileId = fracture ? fracture.tileId : isOnMap(source, slotKey) ? tileIdOf(source, slotKey) : pack.tiles[slotKey] ? slotKey : '';
  const tile = pack.tiles[tileId];
  const unknown = !fracture && mapValue !== undefined && !tile;

  const planets = fracture
    ? (tile?.planetIds ?? []).map(id => pack.planets[id]).filter((p): p is PlanetDef => p !== undefined)
    : planetsIn(table, board, pack, slotKey).map(id => pack.planets[id]).filter((p): p is PlanetDef => p !== undefined);
  // A wormhole token put on the system (Creuss, Gamma Wormhole) shows like a printed wormhole (6.1).
  const placed = board.common.wormholeTokens[slotKey] ?? [];
  const worm = [...new Set([...(tile?.wormholes ?? []), ...placed])].map(w => WORMHOLE_SIGNS[w] ?? w).join(' ');
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
    const whose = owner === 'me' ? '' : ` (${nameOfPlayer(table, pack, playerOfOwner(table, viewer, owner) ?? owner, t)})`;
    if (kind === 'spacedock') return `${t('map.spaceDock')}${whose}`;
    return `${kind === 'pds' ? t('map.pds') : t(`unit.${kind}`)} ×${count}${whose}`;
  };
  const colours = tableColours(table, viewer);
  const seated = othersOf(table, viewer);
  const { space, ground } = tileStacks(table, board, viewer, slotKey, planets);
  const tokens = board.systems[slotKey]?.tokens ?? [];
  const hasCommandToken = tokens.includes(viewer);
  const seatX = tile && seat ? NUMBER_X + (String(tile.number).length + (worm ? worm.length + 1 : 0)) * NUMBER_CHAR + SEAT_RADIUS + 1.5 : 0;
  const rivalTokens = seated.filter(o => tokens.includes(o.id));
  // The tokens form a pile leftwards from the corner: apart while they fit, overlapping more as they crowd, never over
  // the tile number or its seat badge.
  const numberText = tile ? `${tile.kind === 'fracture' ? `F${tile.id.replace(/\D/g, '')}` : tile.number}${worm ? ` ${worm}` : ''}` : unknown ? tileId : '';
  const numberEnd = tile && seat ? seatX + SEAT_RADIUS : NUMBER_X + numberText.length * NUMBER_CHAR;
  const tokenCount = rivalTokens.length + (hasCommandToken ? 1 : 0);
  const tokenRoom = COMMAND_SPOT.x - (numberEnd + 1 + COMMAND_SPOT.r);
  const tokenStep = tokenCount > 1 ? Math.min(RIVAL_TOKEN_STEP, tokenRoom / (tokenCount - 1)) : RIVAL_TOKEN_STEP;
  const rivalTokenAt = (i: number) => ({ x: COMMAND_SPOT.x - (i + (hasCommandToken ? 1 : 0)) * tokenStep, y: COMMAND_SPOT.y, r: COMMAND_SPOT.r });
  const obstacles: LayoutObstacle[] = rivalTokens.map((_, i) => rivalTokenAt(i));
  if (hasCommandToken) obstacles.push(COMMAND_SPOT);
  if (ingress) obstacles.push({ x: INGRESS_SPOT.x, y: INGRESS_SPOT.y, r: INGRESS_RADIUS });
  if (tile && seat) obstacles.push({ x: seatX, y: SEAT_Y, r: SEAT_RADIUS });
  const layout = useHexLayout({ planets: planets.length, space, ground, obstacles, opponents: seated.map(o => ownerKey(table, viewer, o.id)) });

  const label = fracture ? t('map.fractureTile', { n: fracture.index + 1 }) : unknown
    ? t('map.unknownTile', { id: tileId })
    : tile ? t('map.tile', { number: tile.number }) : t('map.emptySlot');

  const activate = () => onTap?.(slotKey);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
  };

  const movable = (
    <>
      {planets.map((planet, i) => {
        const spot = layout.planets[i];
        const { control, holder, exhausted, values } = planetShown(table, board, pack, viewer, planet.id);
        const holderColor = seated.find(o => o.id === holder)?.color;
        const parts = [`${planet.name}: ${values.resources}/${values.influence}`];
        for (const tech of planet.tech ?? []) parts.push(t(`map.tech.${tech}`));
        if (planet.legendary) parts.push(t('map.legendary'));
        if (control) parts.push(`${t(`map.control.${control}`)}${holder ? ` (${nameOfPlayer(table, pack, holder, t)})` : ''}`);
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
            <PlanetMark planet={planet} control={control} holderColor={holderColor} exhausted={exhausted} values={values} />
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
    </>
  );

  // Over the tokens: the number, the seat, the command tokens and the ingress.
  const top = (
    <>
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

        {/* A pile: the leftmost token at the bottom, each next one over it, mine on top in the corner. */}
        {rivalTokens.map((o, i) => ({ o, i })).reverse().map(({ o, i }) => (
          <g key={o.id} role="img" aria-label={t('map.commandTokenOf', { name: nameOfPlayer(table, pack, o.id, t) })} transform={`translate(${rivalTokenAt(i).x} ${rivalTokenAt(i).y}) scale(${COMMAND_SPOT.r / 7})`}>
            <CommandTokenMark color={o.color} />
          </g>
        ))}

        {hasCommandToken && (
          <g role="img" aria-label={t('map.commandToken')} transform={`translate(${COMMAND_SPOT.x} ${COMMAND_SPOT.y}) scale(${COMMAND_SPOT.r / 7})`}>
            <CommandTokenMark />
          </g>
        )}

        {ingress && (
          <g role="img" aria-label={t('map.ingress')} transform={`translate(${INGRESS_SPOT.x} ${INGRESS_SPOT.y}) scale(${INGRESS_SPOT.scale})`}>
            <IngressMark />
          </g>
        )}
    </>
  );

  const body = (
    <g
      transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}
      role={stage ? 'group' : 'button'} tabIndex={stage ? undefined : 0} aria-label={label}
      data-fracture-tile={fracture ? tileId : undefined}
      className={`tile${stage ? ' tile-stage' : ''}${fracture ? ' tile-fracture' : ''}${highlight ? ` tile-${highlight}` : ''}${selected ? ' tile-selected' : ''}${hasCommandToken ? ' tile-activated' : ''}${quiet ? ' tile-quiet' : ''}`}
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

      {!liftInto && movable}

      {!liftInto && top}
    </g>
  );
  if (!liftInto) return body;
  return (
    <>
      {body}
      {createPortal(<g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`} className={`tile tile-lifted${quiet ? ' tile-quiet' : ''}`}>{movable}{top}</g>, liftInto)}
    </>
  );
}
