import { useEffect, useRef, useState } from 'react';
import { flightAt } from './geometry';
import type { FlightRoute } from '../plan/tactical';
import { UnitToken } from '../units/UnitToken';

export interface FlightLayerProps {
  routes: FlightRoute[];
  colour: string;
  /** Indexes of the moves whose units have come on board so far. */
  passed: number[];
  /** The leader has passed the hex of this move. */
  onPass: (move: number) => void;
  onDone: () => void;
}

const GHOST_OPACITY = '0.4';
/** The click of a press that ended the flight comes this long after the release, at most. */
const CLICK_WINDOW_MS = 50;

/**
 * Sprites over the map, in its coordinates. One loop writes `transform` on their nodes and React draws them only when a
 * stack comes on board, so tiles and arrows stay untouched per frame. Mount it with a new key for each flight: the
 * routes are read once. A press on the map finishes the flight at once, and that press is no tap on a tile.
 */
export function FlightLayer({ routes, colour, passed, onPass, onDone }: FlightLayerProps) {
  const layer = useRef<SVGGElement>(null);
  const callbacks = useRef({ onPass, onDone });
  useEffect(() => { callbacks.current = { onPass, onDone }; });
  const [flying] = useState(routes);

  useEffect(() => {
    const nodes = [...(layer.current?.querySelectorAll<SVGGElement>('[data-flight-stack]') ?? [])];
    const svg = layer.current?.ownerSVGElement ?? null;
    const reported = new Set<number>();
    const startedAt = performance.now();
    let frame: number | null = null;
    const finish = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      callbacks.current.onDone();
    };
    const tick = (now: number) => {
      let running = false;
      let at = 0;
      flying.forEach(route => {
        const progress = (now - startedAt - route.delayMs) / route.durationMs;
        if (progress < 1) running = true;
        const { point, frac, gap } = flightAt(route.segments, Math.max(0, Math.min(1, progress)));
        for (const stack of route.stacks) {
          for (const join of stack.joins) {
            if (join.at > 0 && frac >= join.at && !reported.has(join.move)) {
              reported.add(join.move);
              callbacks.current.onPass(join.move);
            }
          }
          const node = nodes[at];
          at += 1;
          node.setAttribute('transform', `translate(${(point.x + stack.x).toFixed(2)} ${(point.y + stack.y).toFixed(2)}) scale(${(stack.size / 100).toFixed(4)})`);
          node.style.opacity = gap ? GHOST_OPACITY : '1';
          node.style.visibility = progress >= 0 ? 'visible' : 'hidden';
        }
      });
      if (running) frame = requestAnimationFrame(tick);
      else finish();
    };
    frame = requestAnimationFrame(tick);

    const onPress = () => {
      const swallow = (e: MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
      };
      svg?.addEventListener('click', swallow, { capture: true, once: true });
      const release = () => {
        window.removeEventListener('pointerup', release);
        window.removeEventListener('pointercancel', release);
        setTimeout(() => svg?.removeEventListener('click', swallow, { capture: true }), CLICK_WINDOW_MS);
      };
      window.addEventListener('pointerup', release);
      window.addEventListener('pointercancel', release);
      finish();
    };
    svg?.addEventListener('pointerdown', onPress, { capture: true });
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      svg?.removeEventListener('pointerdown', onPress, { capture: true });
    };
  }, [flying]);

  return (
    <g ref={layer} className="flight-layer" aria-hidden="true">
      {flying.map((route, r) => route.stacks.map(stack => {
        const count = stack.joins.reduce((sum, join) => (join.at === 0 || passed.includes(join.move) ? sum + join.count : sum), 0);
        return (
          <g key={`${r}:${stack.kind}`} data-flight-stack={stack.kind} style={{ visibility: 'hidden' }}>
            {count > 0 && <UnitToken kind={stack.kind} colour={colour} count={count} size={stack.size} />}
          </g>
        );
      }))}
    </g>
  );
}
