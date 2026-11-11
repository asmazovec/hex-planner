import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { seatSlots, slotsFor } from '../../domain/mapBuilder';
import { slotKeyOf } from '../../domain/newGame';
import { playersOf } from '../../domain/players';
import type { DataPack, Game, GameState } from '../../domain/types';
import { animates } from '../common/motion';
import { RowIcon } from '../primitives/Icon';
import { prepareSprites, tokenColours } from '../units/sprites';
import type { MapPan } from './edgePan';
import { hexToPixel, mapBounds, type Rect } from './geometry';
import { RouteArrows, RouteDraftLine, type Arrow } from './RouteArrows';
import { TileView, type Highlight } from './TileView';
import type { RouteDraftView } from './useArrowDrag';
import { useFractureFlight } from './useFractureFlight';
import { usePanZoom, type View } from './usePanZoom';
import { capFit, fitBox } from './viewLimits';

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
  /** Drawn over the arrows, in the coordinates of the map, in a layer of its own that takes no presses. */
  overlay?: ReactNode;
  onTileTap?: (systemId: string) => void;
  onTilePointerDown?: (systemId: string, event: PointerEvent) => void;
  /** A drag from this tile draws an arrow; from any other tile it moves the map. */
  startsArrow?: (systemId: string) => boolean;
  /** Ships come and go from the tiles without growing or sliding: a flight in the air shows their movement already. */
  still?: boolean;
  /** Every tile changes at once, those of `animateOnly` too. */
  quietAll?: boolean;
  /**
   * Only these systems move their tokens, drawn in the layer over the map so that their moving repaints them alone; on
   * every other tile tokens change at once. Without it every tile moves on the map.
   */
  animateOnly?: ReadonlySet<string> | null;
  /** What hangs over the edges of the map area, as a CSS selector: the map opens with no hex under it. By default the tabs of the drawers. */
  clearOf?: string;
  /** What a route drawn near the edge of the map area needs to move the map: the area on screen and steps of the view. */
  panRef?: Ref<MapPan>;
}

/** The map area on screen and what hangs over it, in pixels from its top left corner. */
interface MapArea { width: number; height: number; tabs: Rect[] }

/** Where an element is laid out on the page, whatever transform moves it now: an open drawer carries its tabs away. */
function laidOut(element: HTMLElement): Rect {
  let x = 0;
  let y = 0;
  for (let at: HTMLElement | null = element; at; at = at.offsetParent as HTMLElement | null) {
    x += at.offsetLeft;
    y += at.offsetTop;
  }
  return { x, y, width: element.offsetWidth, height: element.offsetHeight };
}

function measureArea(wrap: HTMLElement, clearOf: string): MapArea {
  const own = laidOut(wrap);
  const tabs = [...document.querySelectorAll<HTMLElement>(clearOf)].map(laidOut)
    .filter(tab => tab.width > 0 && tab.height > 0)
    .map(tab => ({ ...tab, x: tab.x - own.x, y: tab.y - own.y }));
  return { width: own.width, height: own.height, tabs };
}

const sameArea = (a: MapArea | null, b: MapArea): boolean => a !== null && JSON.stringify(a) === JSON.stringify(b);

/** As long as the tiles of the Fracture take to arrive. */
const CAMERA_MS = 760;
const easeOut = (t: number): number => 1 - (1 - t) ** 3;

/** The transform of the groups that carry the view: it scales around the middle of the map. */
const transformOf = (view: View, midX: number, midY: number): string =>
  `translate(${midX + view.x - midX * view.scale} ${midY + view.y - midY * view.scale}) scale(${view.scale})`;

/**
 * What the frame of the map shows, moving smoothly to a new frame when the map grows or shrinks. A new `area` of the
 * screen is no movement of the map: the frame follows it at once, before the screen is drawn.
 */
function useSmoothRect(target: Rect, area: string): Rect {
  const [shown, setShown] = useState(target);
  const current = useRef(target);
  const shownArea = useRef(area);
  const { x, y, width, height } = target;
  useLayoutEffect(() => {
    const to = { x, y, width, height };
    const from = current.current;
    const resized = shownArea.current !== area;
    shownArea.current = area;
    if (from.x === x && from.y === y && from.width === width && from.height === height) return undefined;
    const show = (rect: Rect) => { current.current = rect; setShown(rect); };
    if (resized || !animates()) { show(to); return undefined; }
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
  }, [x, y, width, height, area]);
  return shown;
}

const NO_ARROWS: Arrow[] = [];

const parseKey = (key: string): { q: number; r: number } => {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
};

export function HexMap({
  game, state, pack, highlights, arrows, arrowPreview, focusRect, resetSignal = 0, overlay, onTileTap, onTilePointerDown, startsArrow, still = false, quietAll = false, animateOnly = null, clearOf = '.drawer-rail', panRef,
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
  // The map opens whole in its area, clear of the edges and of the tabs over them. Without a size (no layout yet) it is the plain frame.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState<MapArea | null>(null);
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => setArea(known => {
      const next = measureArea(wrap, clearOf);
      return sameArea(known, next) ? known : next;
    });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [clearOf]);
  const bounds = useMemo(() => {
    const frame = fracture ? capFit(mapRect, fracture.bounds) : mapRect;
    if (!area) return frame;
    const hexes = [...mapSlots.map(s => hexToPixel(s.q, s.r)), ...(fracture?.spots ?? [])];
    return fitBox(frame, area, hexes, area.tabs);
  }, [fracture, mapRect, mapSlots, area]);
  // Frames of a gesture or of the camera's approach go straight to the groups that carry the view, not through React:
  // the map, the moving systems, the arrows and the flight each have one, in layers drawn in that order.
  const viewGroup = useRef<SVGGElement>(null);
  const liftGroup = useRef<SVGGElement>(null);
  const arrowGroup = useRef<SVGGElement>(null);
  const overlayGroup = useRef<SVGGElement>(null);
  // The group the tokens of the moving systems are drawn into; a state, so the tiles draw again once it is there.
  const [liftLayer, setLiftLayer] = useState<SVGGElement | null>(null);
  const middle = useRef({ x: 0, y: 0 });
  const drawFrame = useCallback((next: View) => {
    const text = transformOf(next, middle.current.x, middle.current.y);
    for (const group of [viewGroup, liftGroup, arrowGroup, overlayGroup]) group.current?.setAttribute('transform', text);
  }, []);
  const { view, live, handlers, reset, focus, panBy, rest } = usePanZoom(bounds, svgRef, undefined, mapRect, startsArrow, drawFrame);
  // A route drawn near the edge moves the map under a resting finger: the line to the finger is told of each such frame.
  const panFrames = useRef(new Set<() => void>());
  const onPanned = useCallback((listener: () => void) => {
    panFrames.current.add(listener);
    return () => { panFrames.current.delete(listener); };
  }, []);
  useImperativeHandle(panRef, () => {
    const onScreen = (element: Element): Rect => {
      const { left, top, width, height } = element.getBoundingClientRect();
      return { x: left, y: top, width, height };
    };
    return {
      // Where things are now, not where they are laid out: a tab carried away by its open drawer hides nothing here.
      area: () => ({
        rect: wrapRef.current ? onScreen(wrapRef.current) : { x: 0, y: 0, width: 0, height: 0 },
        tabs: [...document.querySelectorAll(clearOf)].flatMap(rail => [...rail.children]).map(onScreen).filter(tab => tab.width > 0 && tab.height > 0),
      }),
      by: (dx, dy) => {
        const moved = panBy(dx, dy);
        if (moved) panFrames.current.forEach(listener => listener());
        return moved;
      },
      rest,
    };
  }, [clearOf, panBy, rest]);
  const focusKey = focusRect ? JSON.stringify(focusRect) : null;
  useEffect(() => { focus(focusKey === null ? null : JSON.parse(focusKey) as Rect); }, [focusKey, focus]);
  useEffect(() => { if (resetSignal > 0) reset(); }, [resetSignal, reset]);
  // The view scales around the middle of the map.
  const camera = useSmoothRect(bounds, area ? `${area.width}x${area.height}` : '');
  const midX = camera.x + camera.width / 2;
  const midY = camera.y + camera.height / 2;
  const transform = transformOf(view, midX, midY);
  const viewBoxText = `${camera.x} ${camera.y} ${camera.width} ${camera.height}`;
  // A drawing in the middle of a gesture writes the view React knows: the one on screen goes back at once.
  useLayoutEffect(() => {
    middle.current = { x: midX, y: midY };
    drawFrame(live());
  });
  // The tiles stay as they are on every frame of a movement; only the transform around them changes.
  const content = useMemo(() => slotKeys.map(key => (
    <TileView
      key={key} slotKey={key} pack={pack} game={game} state={state}
      highlight={highlights?.[key]} ingress={game.fracture.ingress.includes(key)} seat={seats.get(key)}
      onTap={onTileTap} onPointerDown={onTilePointerDown} quiet={quietAll || (animateOnly !== null && !animateOnly.has(key))}
      liftInto={animateOnly?.has(key) ? liftLayer : null}
    />
  )), [slotKeys, pack, game, state, seats, highlights, onTileTap, onTilePointerDown, animateOnly, quietAll, liftLayer]);

  return (
    <div className="hexmap-frame">
    <div className="map-strip">
      <div className="map-strip-start">
        <button type="button" className="hex-button" aria-label={t('map.resetView')} title={t('map.resetView')} onClick={reset}><RowIcon name="reset" /></button>
      </div>
    </div>
    <div className="hexmap-wrap" ref={wrapRef}>
    <svg
      ref={svgRef} className={`hexmap${still ? ' hexmap-still' : ''}`} role="group" aria-label={t('map.label')}
      viewBox={viewBoxText}
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
      <g ref={viewGroup} transform={transform}>
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
                quiet={quietAll || (animateOnly !== null && !animateOnly.has(slotKeyOf(fractureAt[i].q, fractureAt[i].r)))}
              />
              </g>
            ))}
          </g>
        )}
      </g>
    </svg>
    {animateOnly && (
      // The systems of the action being shown, in a layer of their own: their tokens move without repainting the map.
      <svg className="hexmap-lift" viewBox={viewBoxText}>
        <g ref={liftGroup} transform={transform}>
          <g ref={setLiftLayer} className="lift-layer" />
        </g>
      </svg>
    )}
    {/* Over every tile, the lifted ones too; it takes no presses. */}
    <svg className="hexmap-arrows" viewBox={viewBoxText} aria-hidden="true">
      <g ref={arrowGroup} transform={transform}>
        <RouteArrows arrows={arrows ?? NO_ARROWS} bounds={bounds} />
        {arrowPreview && <RouteDraftLine draft={arrowPreview} onPanned={onPanned} />}
      </g>
    </svg>
    {overlay && (
      // Its own layer over the map and the arrows: what moves here every frame leaves them unpainted.
      <svg className="hexmap-overlay" viewBox={viewBoxText}>
        <g ref={overlayGroup} transform={transform}>{overlay}</g>
      </svg>
    )}
    </div>
    </div>
  );
}
