import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode  } from 'react';
import { useTranslation } from 'react-i18next';
import { seatSlots, slotsFor } from '../../domain/mapBuilder';
import { curveThrough, type Point, type RouteShape } from '../../domain/route';
import { fractureSlots } from '../../domain/thundersEdge';
import { slotKeyOf } from '../../domain/newGame';
import { playersOf } from '../../domain/players';
import type { DataPack, Game, GameState } from '../../domain/types';
import { RowIcon } from '../plan/RowIcon';
import type { RouteArrow } from '../plan/tactical';
import { prepareSprites, tokenColours } from '../units/sprites';
import { HEX_SIZE, hexToPixel, mapBounds, slotToPixel, type Rect } from './geometry';
import { TilePopover } from './TilePopover';
import { TileView, type Highlight } from './TileView';
import { capFit } from './viewLimits';
// TODO(P2-234) #ws:ui-structure #type:arch #dep:P2-235 #size:s #motion — animates берётся из хука жестов: импортировать из common/motion.ts
import { animates, usePanZoom } from './usePanZoom';

/** A drawn route. `number` is its action's place in the round; `active` is the action being edited, shown or played. */
export interface Arrow extends RouteArrow { key: string; number: number; tone: 'planned' | 'done' | 'active'; shape: RouteShape;
  /** The colour of the opponent whose action this is. */ player?: number }

// TODO(P2-233) #ws:ui-structure #type:dup #size:s #route-draft — RouteDraftView почти совпадает с ArrowPreview из useArrowDrag: один тип черновика маршрута
/** The route under way, in the order it was drawn. The screen point is given while a finger pulls it. */
export interface RouteDraftView { path: string[]; reverse?: boolean; clientX?: number; clientY?: number }

export interface HexMapProps {
  game: Game;
  state: GameState;
  pack: DataPack;
  highlights?: Record<string, Highlight>;
  arrows?: Arrow[];
  arrowPreview?: RouteDraftView | null;
  /** The area the camera shows; back to the whole map when it turns null. */
  focusRect?: Rect | null;
  /** Each new value sends the camera to the whole map, as the reset button does. */
  resetSignal?: number;
  /** Drawn over the arrows, in the coordinates of the map. */
  overlay?: ReactNode;
  selectedId?: string | null;
  onTileTap?: (systemId: string) => void;
  onTilePointerDown?: (systemId: string, event: PointerEvent) => void;
  /** A drag from this tile draws an arrow; from any other tile it moves the map. */
  startsArrow?: (systemId: string) => boolean;
  /** More controls in the strip above the map. */
  tools?: ReactNode;
  /** Shown in a window beside the selected tile. */
  popover?: ReactNode;
  onPopoverClose?: () => void;
}

// TODO(P2-231) #ws:ui-structure #type:arch #size:s #fracture #geometry — Геометрия группы Излома (fractureFrame, LABEL_*) лежит в файле компонента и импортируется тестом: перенести в geometry.ts
/**
 * Where the Fracture group is drawn: its systems at the given slots, one label outside the apex, and the rectangle
 * holding map and group. The label stands beyond the middle system, away from the map centre.
 */
export function fractureFrame(
  mapSlots: { q: number; r: number }[], slots: { tileId: string; q: number; r: number }[],
): { spots: { tileId: string; x: number; y: number }[]; bounds: Rect; labelX: number; labelY: number } {
  const spots = slots.map(s => ({ tileId: s.tileId, ...hexToPixel(s.q, s.r) }));
  const apex = spots[Math.floor(spots.length / 2)];
  const length = Math.hypot(apex.x, apex.y) || 1;
  const labelX = apex.x + (apex.x / length) * (HEX_SIZE + 14);
  const labelY = apex.y + (apex.y / length) * (HEX_SIZE + 14);
  const tiles = mapBounds([...mapSlots, ...slots]);
  const left = Math.min(tiles.x, labelX - LABEL_HALF_WIDTH);
  const top = Math.min(tiles.y, labelY - LABEL_HEIGHT);
  const right = Math.max(tiles.x + tiles.width, labelX + LABEL_HALF_WIDTH);
  const bottom = Math.max(tiles.y + tiles.height, labelY + 4);
  return { spots, labelX, labelY, bounds: { x: left, y: top, width: right - left, height: bottom - top } };
}

/** Where a Fracture tile flies in from: out from the middle of the group, further for those at its ends. */
const FLY_FROM = 1.6;
const FLY_OUT = 150;
const FLY_STEP_MS = 55;

/** As long as the tiles of the Fracture take to arrive. */
const CAMERA_MS = 760;
const easeOut = (t: number): number => 1 - (1 - t) ** 3;

/** What the frame of the map shows, moving smoothly to a new frame when the map grows or shrinks. */
function useSmoothRect(target: Rect): Rect {
  const [shown, setShown] = useState(target);
  const current = useRef(target);
  const { x, y, width, height } = target;
  useEffect(() => {
    const to = { x, y, width, height };
    const from = current.current;
    if (from.x === x && from.y === y && from.width === width && from.height === height) return undefined;
    const show = (rect: Rect) => { current.current = rect; setShown(rect); };
    if (!animates()) { show(to); return undefined; }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / CAMERA_MS);
      const e = easeOut(t);
      show({ x: from.x + (x - from.x) * e, y: from.y + (y - from.y) * e, width: from.width + (width - from.width) * e, height: from.height + (height - from.height) * e });
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [x, y, width, height]);
  return shown;
}

const LABEL_HALF_WIDTH = 45;
const LABEL_HEIGHT = 20;

const NO_ARROWS: Arrow[] = [];

const parseKey = (key: string): { q: number; r: number } => {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
};

/** A line from the last hex to the pointer. It follows the pointer by itself, so a move renders nothing. */
function PreviewLine({ start, clientX, clientY, reverse, outline }: { start: Point; clientX: number; clientY: number; reverse?: boolean; outline?: boolean }) {
  const ref = useRef<SVGLineElement>(null);
  useLayoutEffect(() => {
    const place = (x: number, y: number) => {
      const line = ref.current;
      const matrix = line?.getScreenCTM?.();
      if (!line || !matrix) return;
      const end = new DOMPoint(x, y).matrixTransform(matrix.inverse());
      line.setAttribute('x2', String(end.x));
      line.setAttribute('y2', String(end.y));
    };
    place(clientX, clientY);
    const onMove = (e: globalThis.PointerEvent) => place(e.clientX, e.clientY);
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [clientX, clientY]);
  return <line ref={ref} x1={start.x} y1={start.y} x2={start.x} y2={start.y} className={outline ? 'route-casing' : 'route-pull'} markerEnd={reverse ? undefined : `url(#${outline ? 'arrow-head-casing' : 'arrow-head'})`} />;
}

const svgPath = (points: Point[]): string => `M${points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L')}`;

// TODO(P2-230) #ws:ui-containers #type:dup #size:s #route-badge #svg — Вершины бейджа и выреза заданы строками, хотя это hexPoints(10.5) и hexPoints(15); бейдж номера и метка «+N» повторены в MapLegend и OrderHex в EntryList: общий компонент RouteBadge
const BADGE_HEX = '10.5,0 5.25,9.1 -5.25,9.1 -10.5,0 -5.25,-9.1 5.25,-9.1';
/** The gap in the arrows around a badge: the same hexagon, 1.4 times its size. */
const BADGE_CUT = '15,0 7.5,13 -7.5,13 -15,0 -7.5,-13 7.5,-13';
const CUT_MARGIN = 300;
const HEAD_FORWARD = 5.6;
const HEAD_BACK = 14.4;
const HEAD_HALF = 10;
const TAG_OFFSET = 30;
const TAG_STEP = 20;

function arrowHead(curve: Point[]): string {
  const end = curve[curve.length - 1];
  const before = curve[curve.length - 2];
  const length = Math.hypot(end.x - before.x, end.y - before.y) || 1;
  const dir = { x: (end.x - before.x) / length, y: (end.y - before.y) / length };
  const at = (forward: number, side: number) => `${(end.x + dir.x * forward - dir.y * side).toFixed(1)},${(end.y + dir.y * forward + dir.x * side).toFixed(1)}`;
  return `${at(HEAD_FORWARD, 0)} ${at(-HEAD_BACK, HEAD_HALF)} ${at(-HEAD_BACK, -HEAD_HALF)}`;
}

/** Every arrow stays the same nodes across renders, so their colours can change smoothly. They take no taps. */
const RouteArrows = memo(function RouteArrows({ arrows, bounds }: { arrows: Arrow[]; bounds: Rect }) {
  const { t } = useTranslation();
  const tagged = new Map<string, number>();
  return (
    <g className="routes">
      {arrows.length > 0 && (
        <mask
          id="route-gaps" maskUnits="userSpaceOnUse" x={bounds.x - CUT_MARGIN} y={bounds.y - CUT_MARGIN}
          width={bounds.width + 2 * CUT_MARGIN} height={bounds.height + 2 * CUT_MARGIN}
        >
          <rect x={bounds.x - CUT_MARGIN} y={bounds.y - CUT_MARGIN} width={bounds.width + 2 * CUT_MARGIN} height={bounds.height + 2 * CUT_MARGIN} fill="#fff" />
          {arrows.map(a => <polygon key={a.key} points={BADGE_CUT} transform={`translate(${a.shape.badge.x.toFixed(1)} ${a.shape.badge.y.toFixed(1)})`} fill="#000" />)}
        </mask>
      )}
      <g mask="url(#route-gaps)">
        {/* TODO(P2-228) #ws:ui-containers #type:ui #dep:P2-223 #size:s #player-colour #inline-style #rivals — Цвет стрелки соперника через style --route: var(--player-N): data-player или playerVar() */}
        {arrows.map(a => (
          <g key={a.key} className={`route route-${a.tone}`} style={a.player ? { '--route': `var(--player-${a.player})` } as CSSProperties : undefined} role="img" aria-label={t('map.arrow', { from: a.from, to: a.to })}>
            <g className="route-casings">
              {a.shape.segments.map((segment, i) => <path key={i} d={svgPath(segment.points)} className={`route-casing${segment.gap ? ' route-gap' : ''}`} />)}
              <polygon points={arrowHead(a.shape.curve)} className="route-head-casing" />
            </g>
            {a.shape.segments.map((segment, i) => <path key={i} d={svgPath(segment.points)} className={`route-line${segment.gap ? ' route-gap' : ''}`} />)}
            {a.shape.segments.slice(1).map((segment, i) => <circle key={i} cx={segment.points[0].x.toFixed(1)} cy={segment.points[0].y.toFixed(1)} r={4} className="route-dot" />)}
            <polygon points={arrowHead(a.shape.curve)} className="route-head" />
          </g>
        ))}
      </g>
      {/* TODO(P2-229) #ws:ui-containers #type:ui #dep:P2-223 #size:s #player-colour #inline-style #rivals — Бейдж повторяет style --route стрелки: data-player или playerVar() */}
      {arrows.map(a => (
        <g key={a.key} className={`route route-badge route-${a.tone}`} style={a.player ? { '--route': `var(--player-${a.player})` } as CSSProperties : undefined} transform={`translate(${a.shape.badge.x.toFixed(1)} ${a.shape.badge.y.toFixed(1)})`}>
          <polygon points={BADGE_HEX} className="route-badge-casing" />
          <polygon points={BADGE_HEX} className="route-badge-hex" />
          <text y={4} className="route-badge-number">{a.number}</text>
        </g>
      ))}
      {arrows.flatMap(a => a.pickups.map(({ slot, count }) => {
        const at = slotToPixel(slot);
        const row = tagged.get(slot) ?? 0;
        tagged.set(slot, row + 1);
        return (
          <g key={`${a.key}:${slot}`} className={`route route-tag route-${a.tone}`} transform={`translate(${at.x + TAG_OFFSET} ${at.y - TAG_OFFSET + row * TAG_STEP})`}>
            <rect x={-14} y={-9} width={28} height={18} rx={9} />
            <text y={4}>+{count}</text>
          </g>
        );
      }))}
    </g>
  );
});

function RouteDraftLine({ draft }: { draft: RouteDraftView }) {
  const points = draft.path.map(slotToPixel);
  const curve = curveThrough(points);
  const pulled = draft.clientX !== undefined && draft.clientY !== undefined
    ? { start: points[points.length - 1], clientX: draft.clientX, clientY: draft.clientY, reverse: draft.reverse }
    : null;
  return (
    <g className="routes route route-active route-draft">
      <g className="route-casings">
        {points.length > 1 && <path d={svgPath(curve)} className="route-casing" />}
        {pulled && <PreviewLine {...pulled} outline />}
      </g>
      {points.length > 1 && <path d={svgPath(curve)} className="route-line" />}
      {points.slice(0, -1).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={4} className="route-dot" />)}
      {pulled && <PreviewLine {...pulled} />}
    </g>
  );
}

export function HexMap({
  game, state, pack, highlights, arrows, arrowPreview, focusRect, resetSignal = 0, overlay, selectedId, onTileTap, onTilePointerDown, startsArrow, tools, popover, onPopoverClose,
}: HexMapProps) {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const slotKeys = useMemo(() => {
    const keys = new Set(slotsFor(game.playerCount, pack, game.layout).map(s => slotKeyOf(s.q, s.r)));
    for (const key of Object.keys(game.map)) keys.add(key);
    return [...keys];
  }, [pack, game.playerCount, game.layout, game.map]);

  const colours = tokenColours(game);
  const palette = Object.values(colours).join();
  useEffect(() => { void prepareSprites(palette.split(',')); }, [palette]);

  /** Home slots by slot key, with the player sitting there. */
  const seats = useMemo(() => {
    const players = playersOf(game);
    return new Map(seatSlots(game.playerCount, pack, game.layout).flatMap((key, i) => {
      const player = players.find(p => p.seat === i + 1);
      return player ? [[key, { number: i + 1, color: player.color }] as const] : [];
    }));
  }, [game, pack]);

  const mapRect = useMemo(() => mapBounds(slotKeys.map(parseKey)), [slotKeys]);
  const fractureAt = useMemo(() => (game.fracture.active ? fractureSlots(game.fracture.seat, game.playerCount, pack, game.layout) : []), [pack, game.fracture.active, game.fracture.seat, game.playerCount, game.layout]);
  const fracture = useMemo(() => (fractureAt.length === 0 ? null : fractureFrame(slotKeys.map(parseKey), fractureAt)), [fractureAt, slotKeys]);
  // TODO(P2-232) #ws:ui-structure #type:arch #size:m #fracture #srp — HexMap держит и камеру, и полоску инструментов, и автомат прилёта Излома (seenPlace, opening, flyRun, leftSeat, flyStyle): вынести хук useFractureFlight, RouteArrows в свой файл
  // Only opening it or moving it plays: coming back to a map where it stands open does not. A new run starts the animation anew.
  const [seenPlace, setSeenPlace] = useState({ active: game.fracture.active, seat: game.fracture.seat });
  const [opening, setOpening] = useState(false);
  const [flyRun, setFlyRun] = useState(0);
  /** The seat the Fracture has just left: it stays there a moment, fading, and no longer counts for the frame of the map. */
  const [leftSeat, setLeftSeat] = useState<{ seat: number | null } | null>(null);
  if (seenPlace.active !== game.fracture.active || seenPlace.seat !== game.fracture.seat) {
    setSeenPlace({ active: game.fracture.active, seat: game.fracture.seat });
    setOpening(game.fracture.active);
    setLeftSeat(seenPlace.active && animates() ? { seat: seenPlace.seat } : null);
    setFlyRun(flyRun + 1);
  }
  const leaving = useMemo(() => {
    if (!leftSeat) return null;
    const slots = fractureSlots(leftSeat.seat, game.playerCount, pack, game.layout);
    return slots.length === 0 ? null : fractureFrame(slotKeys.map(parseKey), slots);
  }, [leftSeat, game.playerCount, pack, game.layout, slotKeys]);
  /** How a Fracture tile comes to its place. */
  const flyStyle = (index: number): CSSProperties | undefined => {
    if (!fracture) return undefined;
    const apex = fracture.spots[Math.floor(fracture.spots.length / 2)];
    const spot = fracture.spots[index];
    const length = Math.hypot(apex.x, apex.y) || 1;
    const x = (spot.x - apex.x) * FLY_FROM + (apex.x / length) * FLY_OUT;
    const y = (spot.y - apex.y) * FLY_FROM + (apex.y / length) * FLY_OUT;
    const step = Math.abs(index - Math.floor(fracture.spots.length / 2));
    return { '--fly-x': `${x.toFixed(1)}px`, '--fly-y': `${y.toFixed(1)}px`, animationDelay: `${step * FLY_STEP_MS}ms` } as CSSProperties;
  };
  const bounds = useMemo(() => (fracture ? capFit(mapRect, fracture.bounds) : mapRect), [fracture, mapRect]);
  const { view, handlers, reset, focus } = usePanZoom(bounds, svgRef, onPopoverClose, mapRect, startsArrow);
  const focusKey = focusRect ? JSON.stringify(focusRect) : null;
  useEffect(() => { focus(focusKey === null ? null : JSON.parse(focusKey) as Rect); }, [focusKey, focus]);
  useEffect(() => { if (resetSignal > 0) reset(); }, [resetSignal, reset]);
  // The view scales around the middle of the map.
  const camera = useSmoothRect(bounds);
  const midX = camera.x + camera.width / 2;
  const midY = camera.y + camera.height / 2;
  // The tiles stay as they are on every frame of a movement; only the transform around them changes.
  const content = useMemo(() => slotKeys.map(key => (
    <TileView
      key={key} slotKey={key} pack={pack} game={game} state={state}
      highlight={highlights?.[key]} selected={selectedId === key} ingress={game.fracture.ingress.includes(key)} seat={seats.get(key)}
      onTap={onTileTap} onPointerDown={onTilePointerDown}
    />
  )), [slotKeys, pack, game, state, seats, highlights, selectedId, onTileTap, onTilePointerDown]);

  return (
    <div className="hexmap-frame">
    <div className="map-strip">
      <div className="map-strip-start">
        <button type="button" className="hex-button" aria-label={t('map.resetView')} title={t('map.resetView')} onClick={reset}><RowIcon name="reset" /></button>
      </div>
      {tools}
    </div>
    <div className="hexmap-wrap" ref={areaRef}>
    <svg
      ref={svgRef} className="hexmap" role="group" aria-label={t('map.label')}
      viewBox={`${camera.x} ${camera.y} ${camera.width} ${camera.height}`}
      {...handlers}
    >
      <defs>
        <marker id="arrow-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 Z" className="arrow-head" />
        </marker>
        {/* The same head at the same size: a marker scales with its line by default, and the outline's line is wider. */}
        <marker id="arrow-head-casing" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="24" markerHeight="24" orient="auto-start-reverse" overflow="visible">
          <path d="M0,0 L10,5 L0,10 Z" className="arrow-head-casing" />
        </marker>
      </defs>
      <g transform={`translate(${midX + view.x - midX * view.scale} ${midY + view.y - midY * view.scale}) scale(${view.scale})`}>
        {content}
        {leaving && (
          <g key={`left-${flyRun}`} className="fracture-group fracture-closing" aria-hidden="true" onAnimationEnd={e => { if (e.target === e.currentTarget) setLeftSeat(null); }}>
            <text x={leaving.labelX} y={leaving.labelY} className="fracture-label">{t('map.fractureLabel')}</text>
            {leaving.spots.map((spot, i) => (
              <TileView key={spot.tileId} slotKey={`left-${spot.tileId}`} pack={pack} game={game} state={state} fracture={{ tileId: spot.tileId, index: i, x: spot.x, y: spot.y }} />
            ))}
          </g>
        )}
        {fracture && (
          <g key={flyRun} role="group" aria-label={t('map.fractureGroup')} className={`fracture-group${opening ? ' fracture-opening' : ''}`}>
            <text x={fracture.labelX} y={fracture.labelY} className="fracture-label">{t('map.fractureLabel')}</text>
            {fracture.spots.map((spot, i) => (
              <g key={spot.tileId} className="fracture-fly" style={opening ? flyStyle(i) : undefined}>
              <TileView slotKey={slotKeyOf(fractureAt[i].q, fractureAt[i].r)} pack={pack} game={game} state={state}
                fracture={{ tileId: spot.tileId, index: i, x: spot.x, y: spot.y }}
                highlight={highlights?.[slotKeyOf(fractureAt[i].q, fractureAt[i].r)]} ingress={game.fracture.ingress.includes(slotKeyOf(fractureAt[i].q, fractureAt[i].r))}
                onTap={onTileTap} onPointerDown={onTilePointerDown}
              />
              </g>
            ))}
          </g>
        )}
        <RouteArrows arrows={arrows ?? NO_ARROWS} bounds={bounds} />
        {arrowPreview && <RouteDraftLine draft={arrowPreview} />}
        {overlay}
      </g>
    </svg>
    {selectedId && popover && onPopoverClose && (
      <TilePopover slot={selectedId} view={view} areaRef={areaRef} onClose={onPopoverClose}>{popover}</TilePopover>
    )}
    </div>
    </div>
  );
}
