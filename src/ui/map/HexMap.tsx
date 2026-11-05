import { useEffect, useLayoutEffect, useMemo, useRef, type PointerEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { seatSlots, slotsFor } from '../../domain/mapBuilder';
import { fractureSlots } from '../../domain/thundersEdge';
import { slotKeyOf } from '../../domain/newGame';
import { playersOf } from '../../domain/players';
import type { DataPack, Game, GameState } from '../../domain/types';
import { prepareSprites, tokenColours } from '../units/sprites';
import { UnitLegend } from '../units/UnitLegend';
import { HEX_SIZE, hexToPixel, mapBounds, type Rect } from './geometry';
import { TilePopover } from './TilePopover';
import { TileView, type Highlight } from './TileView';
import { capFit } from './viewLimits';
import type { ArrowPreview } from './useArrowDrag';
import { usePanZoom } from './usePanZoom';

/** `from` and `to` are slot keys. */
export interface Arrow { from: string; to: string; warn?: boolean }

export interface HexMapProps {
  game: Game;
  state: GameState;
  pack: DataPack;
  highlights?: Record<string, Highlight>;
  arrows?: Arrow[];
  /** The arrow being drawn by a drag, in screen coordinates. */
  arrowPreview?: ArrowPreview | null;
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

const parseKey = (key: string): { q: number; r: number } => {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
};

/** A line from a tile to the pointer; the screen point is mapped through the current pan and zoom. */
function PreviewLine({ start, preview }: { start: { x: number; y: number }; preview: ArrowPreview }) {
  const ref = useRef<SVGLineElement>(null);
  const { clientX, clientY } = preview;
  useLayoutEffect(() => {
    const line = ref.current;
    const matrix = line?.getScreenCTM?.();
    if (!line || !matrix) return;
    const end = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    line.setAttribute('x2', String(end.x));
    line.setAttribute('y2', String(end.y));
  }, [clientX, clientY]);
  return (
    <line
      ref={ref} x1={start.x} y1={start.y} x2={start.x} y2={start.y} className="arrow arrow-preview"
      {...(preview.reverse ? { markerStart: 'url(#arrow-head)' } : { markerEnd: 'url(#arrow-head)' })}
    />
  );
}

export function HexMap({
  game, state, pack, highlights, arrows, arrowPreview, selectedId, onTileTap, onTilePointerDown, startsArrow, tools, popover, onPopoverClose,
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
  useEffect(() => { void prepareSprites([colours.me, colours.enemy]); }, [colours.me, colours.enemy]);

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
  const { view, handlers, reset } = usePanZoom(bounds, svgRef, onPopoverClose, mapRect, startsArrow);
  const center = (key: string) => {
    const { q, r } = parseKey(key);
    return hexToPixel(q, r);
  };
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
        <marker id="arrow-head-warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 Z" className="arrow-head arrow-warn" />
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
        {(arrows ?? []).map(({ from, to, warn }) => {
          const a = center(from);
          const b = center(to);
          return (
            <line
              key={`${from}>${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              className={`arrow${warn ? ' arrow-warn' : ''}`}
              markerEnd={`url(#arrow-head${warn ? '-warn' : ''})`}
              aria-label={t('map.arrow', { from, to })}
            />
          );
        })}
        {arrowPreview && <PreviewLine start={center(arrowPreview.from)} preview={arrowPreview} />}
      </g>
    </svg>
    {selectedId && popover && onPopoverClose && (
      <TilePopover slot={selectedId} view={view} areaRef={areaRef} onClose={onPopoverClose}>{popover}</TilePopover>
    )}
    </div>
    </div>
  );
}
