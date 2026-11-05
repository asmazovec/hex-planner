import { useMemo, useRef, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { slotKeyOf } from '../../domain/newGame';
import type { DataPack, Game, GameState } from '../../domain/types';
import { hexToPixel, mapBounds } from './geometry';
import { TileView, type Highlight } from './TileView';
import { usePanZoom } from './usePanZoom';

/** `from` and `to` are slot keys. */
export interface Arrow { from: string; to: string; warn?: boolean }

export interface HexMapProps {
  game: Game;
  state: GameState;
  pack: DataPack;
  highlights?: Record<string, Highlight>;
  arrows?: Arrow[];
  selectedId?: string | null;
  onTileTap?: (systemId: string) => void;
  onTilePointerDown?: (systemId: string, event: PointerEvent) => void;
}

const parseKey = (key: string): { q: number; r: number } => {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
};

export function HexMap({
  game, state, pack, highlights, arrows, selectedId, onTileTap, onTilePointerDown,
}: HexMapProps) {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);

  const slotKeys = useMemo(() => {
    const template = pack.templates.find(tpl => tpl.playerCount === game.playerCount);
    const keys = new Set((template?.slots ?? []).map(s => slotKeyOf(s.q, s.r)));
    for (const key of Object.keys(game.map)) keys.add(key);
    return [...keys];
  }, [pack, game.playerCount, game.map]);

  const bounds = useMemo(() => mapBounds(slotKeys.map(parseKey)), [slotKeys]);
  const { view, handlers } = usePanZoom(bounds, svgRef);
  const center = (key: string) => {
    const { q, r } = parseKey(key);
    return hexToPixel(q, r);
  };

  return (
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
      <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
        {slotKeys.map(key => (
          <TileView
            key={key} slotKey={key} mapValue={game.map[key]} pack={pack} game={game} state={state}
            highlight={highlights?.[key]} selected={selectedId === key}
            onTap={onTileTap} onPointerDown={onTilePointerDown}
          />
        ))}
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
      </g>
    </svg>
  );
}
