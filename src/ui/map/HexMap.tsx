import { useLayoutEffect, useMemo, useRef, type PointerEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { seatSlots } from '../../domain/mapBuilder';
import { slotKeyOf } from '../../domain/newGame';
import type { DataPack, Game, GameState } from '../../domain/types';
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
  /** More controls in the strip above the map. */
  tools?: ReactNode;
  /** Shown in a window beside the selected tile. */
  popover?: ReactNode;
  onPopoverClose?: () => void;
}

/**
 * The Fracture systems stand in two touching lines across the outward direction: rows at a top or bottom seat,
 * columns at a side seat or without a seat. Next to the chosen seat's slot they sit at the map edge, outward
 * from the map centre; without a seat they stand to the right of the map. Their real position is only on a
 * diagram (see data-verification), so the seat is the player's choice.
 */
export function fractureLayout(
  tileIds: string[], base: Rect, anchor: { x: number; y: number } | null,
): { spots: { tileId: string; x: number; y: number }[]; bounds: Rect; labelX: number; labelY: number } {
  const step = HEX_SIZE * Math.sqrt(3);
  const perColumn = Math.ceil(tileIds.length / 2);
  const length = anchor ? Math.hypot(anchor.x, anchor.y) : 0;
  const dir = anchor && length > 0 ? { x: anchor.x / length, y: anchor.y / length } : { x: 1, y: 0 };
  const inRows = Math.abs(dir.y) > Math.abs(dir.x);
  const rel = tileIds.map((tileId, i) => {
    if (inRows) return { tileId, x: (i - (tileIds.length - 1) / 2) * 1.5 * HEX_SIZE, y: ((i % 2 === 0 ? -1 : 1) * step) / 4 };
    const second = i >= perColumn;
    return { tileId, x: (second ? 0.75 : -0.75) * HEX_SIZE, y: ((second ? i - perColumn + 0.5 : i) - (perColumn - 1) / 2) * step };
  });
  const halfW = Math.max(...rel.map(s => s.x)) + HEX_SIZE;
  const halfH = Math.max(...rel.map(s => s.y)) + step / 2;
  const reach = HEX_SIZE + 8 + Math.abs(dir.x) * halfW + Math.abs(dir.y) * halfH;
  const centre = anchor
    ? { x: anchor.x + dir.x * reach, y: anchor.y + dir.y * reach }
    : { x: base.x + base.width + HEX_SIZE + 6 + halfW, y: base.y + base.height / 2 };
  const spots = rel.map(s => ({ tileId: s.tileId, x: centre.x + s.x, y: centre.y + s.y }));
  const left = Math.min(base.x, centre.x - halfW - 6);
  const top = Math.min(base.y, centre.y - halfH - 26);
  const right = Math.max(base.x + base.width, centre.x + halfW + 6);
  const bottom = Math.max(base.y + base.height, centre.y + halfH + 6);
  return {
    spots, labelX: centre.x - halfW, labelY: centre.y - halfH - 8,
    bounds: { x: left, y: top, width: right - left, height: bottom - top },
  };
}

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
  game, state, pack, highlights, arrows, arrowPreview, selectedId, onTileTap, onTilePointerDown, tools, popover, onPopoverClose,
}: HexMapProps) {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const slotKeys = useMemo(() => {
    const template = pack.templates.find(tpl => tpl.playerCount === game.playerCount);
    const keys = new Set((template?.slots ?? []).map(s => slotKeyOf(s.q, s.r)));
    for (const key of Object.keys(game.map)) keys.add(key);
    return [...keys];
  }, [pack, game.playerCount, game.map]);

  const mapRect = useMemo(() => mapBounds(slotKeys.map(parseKey)), [slotKeys]);
  const fractureIds = useMemo(
    () => (game.fracture.active
      ? Object.values(pack.tiles).filter(tile => tile.kind === 'fracture').map(tile => tile.id).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
      : []),
    [pack, game.fracture.active],
  );
  const seatKey = game.fracture.seat === null ? undefined : seatSlots(game.playerCount, pack)[game.fracture.seat - 1];
  const fracture = useMemo(() => {
    if (fractureIds.length === 0) return null;
    return fractureLayout(fractureIds, mapRect, seatKey === undefined ? null : hexToPixel(parseKey(seatKey).q, parseKey(seatKey).r));
  }, [fractureIds, mapRect, seatKey]);
  const bounds = useMemo(() => (fracture ? capFit(mapRect, fracture.bounds) : mapRect), [fracture, mapRect]);
  const { view, handlers, reset } = usePanZoom(bounds, svgRef, onPopoverClose, mapRect);
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
      highlight={highlights?.[key]} selected={selectedId === key} ingress={game.fracture.ingress.includes(key)}
      onTap={onTileTap} onPointerDown={onTilePointerDown}
    />
  )), [slotKeys, pack, game, state, highlights, selectedId, onTileTap, onTilePointerDown]);

  return (
    <div className="hexmap-frame">
    <div className="map-strip">
      <button type="button" onClick={reset}>{t('map.resetView')}</button>
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
