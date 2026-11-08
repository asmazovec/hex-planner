import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { seatSlots, slotsFor } from '../../domain/mapBuilder';
import { slotKeyOf } from '../../domain/newGame';
import { playersOf } from '../../domain/players';
import type { DataPack, Game, GameState } from '../../domain/types';
import { animates } from '../common/motion';
import { RowIcon } from '../primitives/Icon';
import { prepareSprites, tokenColours } from '../units/sprites';
import { mapBounds, type Rect } from './geometry';
import { RouteArrows, RouteDraftLine, type Arrow } from './RouteArrows';
import { TileView, type Highlight } from './TileView';
import type { RouteDraftView } from './useArrowDrag';
import { useFractureFlight } from './useFractureFlight';
import { usePanZoom } from './usePanZoom';
import { capFit } from './viewLimits';

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
  onTileTap?: (systemId: string) => void;
  onTilePointerDown?: (systemId: string, event: PointerEvent) => void;
  /** A drag from this tile draws an arrow; from any other tile it moves the map. */
  startsArrow?: (systemId: string) => boolean;
}

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

const NO_ARROWS: Arrow[] = [];

const parseKey = (key: string): { q: number; r: number } => {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
};

export function HexMap({
  game, state, pack, highlights, arrows, arrowPreview, focusRect, resetSignal = 0, overlay, onTileTap, onTilePointerDown, startsArrow,
}: HexMapProps) {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);

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

  const mapSlots = useMemo(() => slotKeys.map(parseKey), [slotKeys]);
  const mapRect = useMemo(() => mapBounds(mapSlots), [mapSlots]);
  const { fractureAt, fracture, leaving, opening, flyRun, flyStyle, leftGone } = useFractureFlight(game, pack, mapSlots);
  const bounds = useMemo(() => (fracture ? capFit(mapRect, fracture.bounds) : mapRect), [fracture, mapRect]);
  const { view, handlers, reset, focus } = usePanZoom(bounds, svgRef, undefined, mapRect, startsArrow);
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
      highlight={highlights?.[key]} ingress={game.fracture.ingress.includes(key)} seat={seats.get(key)}
      onTap={onTileTap} onPointerDown={onTilePointerDown}
    />
  )), [slotKeys, pack, game, state, seats, highlights, onTileTap, onTilePointerDown]);

  return (
    <div className="hexmap-frame">
    <div className="map-strip">
      <div className="map-strip-start">
        <button type="button" className="hex-button" aria-label={t('map.resetView')} title={t('map.resetView')} onClick={reset}><RowIcon name="reset" /></button>
      </div>
    </div>
    <div className="hexmap-wrap">
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
          <g key={`left-${flyRun}`} className="fracture-group fracture-closing" aria-hidden="true" onAnimationEnd={e => { if (e.target === e.currentTarget) leftGone(); }}>
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
    </div>
    </div>
  );
}
