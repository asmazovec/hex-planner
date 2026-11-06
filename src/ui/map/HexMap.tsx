import { Fragment, memo, useEffect, useLayoutEffect, useMemo, useRef, type PointerEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { seatSlots, slotsFor } from '../../domain/mapBuilder';
import { curveThrough, type Point, type RouteShape } from '../../domain/route';
import { fractureSlots } from '../../domain/thundersEdge';
import { slotKeyOf } from '../../domain/newGame';
import { playersOf } from '../../domain/players';
import type { DataPack, Game, GameState } from '../../domain/types';
import type { RouteArrow } from '../plan/tactical';
import { prepareSprites, tokenColours } from '../units/sprites';
import { UnitLegend } from '../units/UnitLegend';
import { HEX_SIZE, hexToPixel, mapBounds, slotToPixel, type Rect } from './geometry';
import { TilePopover } from './TilePopover';
import { TileView, type Highlight } from './TileView';
import { capFit } from './viewLimits';
import { usePanZoom } from './usePanZoom';

/** A drawn route. `number` is its action's place in the round; `active` is the action being edited, shown or played. */
export interface Arrow extends RouteArrow { key: string; number: number; tone: 'planned' | 'done' | 'active'; shape: RouteShape }

/** The route under way, in the order it was drawn. The screen point is given while a finger pulls it. */
export interface RouteDraftView { path: string[]; reverse?: boolean; clientX?: number; clientY?: number }

export interface HexMapProps {
  game: Game;
  state: GameState;
  pack: DataPack;
  highlights?: Record<string, Highlight>;
  arrows?: Arrow[];
  arrowPreview?: RouteDraftView | null;
  /** The area the camera shows; back to the earlier view when it turns null. */
  focusRect?: Rect | null;
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

const LABEL_HALF_WIDTH = 45;
const LABEL_HEIGHT = 20;

const NO_ARROWS: Arrow[] = [];

const parseKey = (key: string): { q: number; r: number } => {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
};

/** A line from the last hex to the pointer. It follows the pointer by itself, so a move renders nothing. */
function PreviewLine({ start, clientX, clientY, reverse }: { start: Point; clientX: number; clientY: number; reverse?: boolean }) {
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
  return <line ref={ref} x1={start.x} y1={start.y} x2={start.x} y2={start.y} className="route-pull" markerEnd={reverse ? undefined : 'url(#arrow-head)'} />;
}

const svgPath = (points: Point[]): string => `M${points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L')}`;

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
        {arrows.map(a => (
          <g key={a.key} className={`route route-${a.tone}${a.warn ? ' arrow-warn' : ''}`} role="img" aria-label={t('map.arrow', { from: a.from, to: a.to })}>
            {a.shape.segments.map((segment, i) => (
              <Fragment key={i}>
                <path d={svgPath(segment.points)} className={`route-casing${segment.gap ? ' route-gap' : ''}`} />
                <path d={svgPath(segment.points)} className={`route-line${segment.gap ? ' route-gap' : ''}`} />
              </Fragment>
            ))}
            {a.shape.segments.slice(1).map((segment, i) => <circle key={i} cx={segment.points[0].x.toFixed(1)} cy={segment.points[0].y.toFixed(1)} r={4} className="route-dot" />)}
            <polygon points={arrowHead(a.shape.curve)} className="route-head" />
          </g>
        ))}
      </g>
      {arrows.map(a => (
        <g key={a.key} className={`route route-badge route-${a.tone}${a.warn ? ' arrow-warn' : ''}`} transform={`translate(${a.shape.badge.x.toFixed(1)} ${a.shape.badge.y.toFixed(1)})`}>
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
  return (
    <g className="routes route route-active route-draft">
      {points.length > 1 && <path d={svgPath(curve)} className="route-line" />}
      {points.slice(0, -1).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={4} className="route-dot" />)}
      {draft.clientX !== undefined && draft.clientY !== undefined && (
        <PreviewLine start={points[points.length - 1]} clientX={draft.clientX} clientY={draft.clientY} reverse={draft.reverse} />
      )}
    </g>
  );
}

export function HexMap({
  game, state, pack, highlights, arrows, arrowPreview, focusRect, overlay, selectedId, onTileTap, onTilePointerDown, startsArrow, tools, popover, onPopoverClose,
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
  const fracture = useMemo(() => {
    if (!game.fracture.active) return null;
    const slots = fractureSlots(game.fracture.seat, game.playerCount, pack, game.layout);
    return slots.length === 0 ? null : fractureFrame(slotKeys.map(parseKey), slots);
  }, [pack, game.fracture.active, game.fracture.seat, game.playerCount, game.layout, slotKeys]);
  const bounds = useMemo(() => (fracture ? capFit(mapRect, fracture.bounds) : mapRect), [fracture, mapRect]);
  const { view, handlers, reset, focus } = usePanZoom(bounds, svgRef, onPopoverClose, mapRect, startsArrow);
  const focusKey = focusRect ? JSON.stringify(focusRect) : null;
  useEffect(() => { focus(focusKey === null ? null : JSON.parse(focusKey) as Rect); }, [focusKey, focus]);
  // The view scales around the middle of the map.
  const midX = bounds.x + bounds.width / 2;
  const midY = bounds.y + bounds.height / 2;
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
        <button type="button" onClick={reset}>{t('map.resetView')}</button>
        <UnitLegend colour={colours.me} />
      </div>
      {tools}
    </div>
    <div className="hexmap-wrap" ref={areaRef}>
    <svg
      ref={svgRef} className="hexmap" role="group" aria-label={t('map.label')}
      viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
      {...handlers}
    >
      <defs>
        <marker id="arrow-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 Z" className="arrow-head" />
        </marker>
      </defs>
      <g transform={`translate(${midX + view.x - midX * view.scale} ${midY + view.y - midY * view.scale}) scale(${view.scale})`}>
        {content}
        {fracture && (
          <g role="group" aria-label={t('map.fractureGroup')} className="fracture-group">
            <text x={fracture.labelX} y={fracture.labelY} className="fracture-label">{t('map.fractureLabel')}</text>
            {fracture.spots.map((spot, i) => (
              <TileView
                key={spot.tileId} slotKey={spot.tileId} pack={pack} game={game} state={state}
                fracture={{ tileId: spot.tileId, index: i, x: spot.x, y: spot.y }}
              />
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
