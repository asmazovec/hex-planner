import { memo, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { RouteArrow } from '../plan/tactical';
import { curveThrough, slotToPixel, type Point, type Rect, type RouteShape } from './geometry';
import type { RouteDraftView } from './useArrowDrag';
import { BADGE_CUT, PickupTag, RouteBadge } from './marks';
import { playerStyle } from '../primitives/player';

/** A drawn route. `number` is its action's place in the round; `active` is the action being edited, shown or played. */
export interface Arrow extends RouteArrow { key: string; number: number; tone: 'planned' | 'done' | 'active'; shape: RouteShape;
  /** The colour of the opponent whose action this is. */ player?: number }

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
export const RouteArrows = memo(function RouteArrows({ arrows, bounds }: { arrows: Arrow[]; bounds: Rect }) {
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
          <g key={a.key} className={`route route-${a.tone}`} style={playerStyle('--route', a.player || undefined)} role="img" aria-label={t('map.arrow', { from: a.from, to: a.to })}>
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
      {arrows.map(a => (
        <g key={a.key} className={`route route-badge route-${a.tone}`} style={playerStyle('--route', a.player || undefined)} transform={`translate(${a.shape.badge.x.toFixed(1)} ${a.shape.badge.y.toFixed(1)})`}>
          <RouteBadge number={a.number} casing />
        </g>
      ))}
      {arrows.flatMap(a => a.pickups.map(({ slot, count }) => {
        const at = slotToPixel(slot);
        const row = tagged.get(slot) ?? 0;
        tagged.set(slot, row + 1);
        return (
          <g key={`${a.key}:${slot}`} className={`route route-tag route-${a.tone}`} transform={`translate(${at.x + TAG_OFFSET} ${at.y - TAG_OFFSET + row * TAG_STEP})`}>
            <PickupTag count={count} />
          </g>
        );
      }))}
    </g>
  );
});

/** The route under way: its line so far and, while a finger pulls it, the line to the pointer. */
export function RouteDraftLine({ draft }: { draft: RouteDraftView }) {
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
