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
  /**
   * The ships have reached the middle of the system they arrive in: the map can show them landed while they fade out.
   * Without it they go at once on arrival.
   */
  onArrive?: () => void;
  /**
   * The units stand where they are for `holdMs` first; then the ships leave and the formation grows in at the start of
   * the route, and the map is told so (`onDepart`). Without it the formation is there at once.
   */
  holdMs?: number;
  onDepart?: () => void;
  onDone: () => void;
}

const GHOST_OPACITY = '0.4';
/** How long the ships take to fade out once they have arrived. */
const FADE_MS = 260;
/** How long a formation takes to grow in at the start of its route, when it has a departure. */
const GROW_MS = 220;
const easeOut = (t: number): number => 1 - (1 - t) ** 3;
/** The click of a press that ended the flight comes this long after the release, at most. */
const CLICK_WINDOW_MS = 50;

/**
 * Sprites over the map, in its coordinates and in a layer of its own (`HexMap`'s overlay). One loop writes `transform`
 * on their nodes and React draws them only when a stack comes on board, so tiles and arrows are not painted per frame. Mount it with a new key for each flight: the
 * routes are read once. A press on the map finishes the flight at once, and that press is no tap on a tile.
 */
export function FlightLayer({ routes, colour, passed, onPass, onArrive, holdMs = 0, onDepart, onDone }: FlightLayerProps) {
  const layer = useRef<SVGGElement>(null);
  const callbacks = useRef({ onPass, onArrive, onDepart, onDone });
  useEffect(() => { callbacks.current = { onPass, onArrive, onDepart, onDone }; });
  const [hold] = useState(holdMs);
  const [flying] = useState(routes);

  useEffect(() => {
    const nodes = [...(layer.current?.querySelectorAll<SVGGElement>('[data-flight-stack]') ?? [])];
    // Presses go to the map, under the layer of its own the flight is drawn in.
    const own = layer.current?.ownerSVGElement ?? null;
    const svg = own?.parentElement?.querySelector<SVGSVGElement>('svg.hexmap') ?? own;
    const reported = new Set<number>();
    const startedAt = performance.now() + hold;
    let departed = false;
    /** When each stack came on board: at the start of its route, or when the leader passed the units it picks up. */
    const born = new Map<number, number>();
    let frame: number | null = null;
    const finish = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      callbacks.current.onDone();
    };
    /** When the ships arrived, if they fade out: from then on only their opacity changes. */
    let arrivedAt: number | null = null;
    const tick = (now: number) => {
      if (arrivedAt !== null) {
        const left = 1 - (now - arrivedAt) / FADE_MS;
        if (left <= 0) {
          finish();
          return;
        }
        for (const node of nodes) node.style.opacity = String(left * Number(node.dataset.opacity ?? 1));
        frame = requestAnimationFrame(tick);
        return;
      }
      if (!departed && now >= startedAt) {
        departed = true;
        callbacks.current.onDepart?.();
      }
      let running = false;
      let at = 0;
      flying.forEach(route => {
        const progress = (now - startedAt - route.delayMs) / route.durationMs;
        if (progress < 1) running = true;
        const { point, frac, gap } = flightAt(route.segments, Math.max(0, Math.min(1, progress)));
        for (const stack of route.stacks) {
          const index = at;
          const first = Math.min(...stack.joins.map(join => join.at));
          if (progress >= 0 && frac >= first && !born.has(index)) born.set(index, first === 0 ? startedAt + route.delayMs : now);
          // With a departure each stack grows in as it comes on board: at the start, or where it is picked up.
          const bornAt = born.get(index);
          const grown = !callbacks.current.onDepart ? 1 : bornAt === undefined ? 0 : easeOut(Math.max(0, Math.min(1, (now - bornAt) / GROW_MS)));
          for (const join of stack.joins) {
            if (progress < 0) break;
            // A pickup at the start leaves its planet on the first frame; units of the source itself need no word.
            if ((join.at > 0 || join.pickup) && frac >= join.at && !reported.has(join.move)) {
              reported.add(join.move);
              callbacks.current.onPass(join.move);
            }
          }
          const node = nodes[at];
          at += 1;
          node.setAttribute('transform', `translate(${(point.x + stack.x).toFixed(2)} ${(point.y + stack.y).toFixed(2)}) scale(${((stack.size / 100) * grown).toFixed(4)})`);
          node.style.opacity = gap ? GHOST_OPACITY : '1';
          node.dataset.opacity = node.style.opacity;
          node.style.visibility = progress >= 0 ? 'visible' : 'hidden';
        }
      });
      if (running) frame = requestAnimationFrame(tick);
      else if (callbacks.current.onArrive) {
        arrivedAt = now;
        callbacks.current.onArrive();
        frame = requestAnimationFrame(tick);
      } else finish();
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
  }, [flying, hold]);

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
