import { useEffect, useState, type KeyboardEvent } from 'react';
import type { PlacedStack } from '../../domain/hexLayout';
import { UnitToken } from './UnitToken';

/** A little longer than the transition, so that a removed token has finished collapsing. */
const LEAVE_MS = 460;
/** Around a token 100 across; ships stick out of their disc. */
const HIT_RADIUS = 66;
const RING_RADIUS = 60;

interface Track {
  signature: string;
  items: PlacedStack[];
  fresh: Set<string>;
  leaving: PlacedStack[];
}

export interface TokenLayerProps {
  items: PlacedStack[];
  colourOf: (item: PlacedStack) => string;
  labelOf: (item: PlacedStack) => string;
  /** Makes every token a button: its whole circle takes the tap, not the corners of its picture. */
  onTap?: (item: PlacedStack) => void;
  /** Tokens with a gold ring. */
  ringed?: (item: PlacedStack) => boolean;
}

/**
 * Every stack stays the same node while it moves, so the browser only moves finished pixels. New stacks grow in, removed
 * ones stay a moment to collapse. Nodes are in key order: moving a node in the document would cut its transition short.
 */
export function TokenLayer({ items, colourOf, labelOf, onTap, ringed }: TokenLayerProps) {
  const signature = JSON.stringify(items);
  const [track, setTrack] = useState<Track>({ signature, items, fresh: new Set(), leaving: [] });
  let current = track;
  if (track.signature !== signature) {
    const now = new Set(items.map(item => item.key));
    const before = new Set(track.items.map(item => item.key));
    current = {
      signature,
      items,
      fresh: new Set([...track.fresh, ...items.filter(item => !before.has(item.key)).map(item => item.key)].filter(key => now.has(key))),
      leaving: [...track.leaving, ...track.items].filter(item => !now.has(item.key)),
    };
    setTrack(current);
  }

  const { leaving } = current;
  useEffect(() => {
    if (leaving.length === 0) return undefined;
    const timer = setTimeout(() => setTrack(latest => ({ ...latest, leaving: [] })), LEAVE_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

  const shown = [
    ...items.map(item => ({ item, gone: false })),
    ...leaving.map(item => ({ item, gone: true })),
  ].sort((a, b) => (a.item.key < b.item.key ? -1 : 1));

  return shown.map(({ item, gone }) => {
    const motion = gone ? 'tk-out' : current.fresh.has(item.key) ? 'tk-in' : undefined;
    const button = onTap && !gone ? {
      role: 'button', tabIndex: 0, 'aria-label': labelOf(item), onClick: () => onTap(item),
      onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onTap(item); } },
    } : {};
    return (
      <g
        key={item.key} className="tk" data-stack={item.key} data-planet={item.planet}
        style={{ transform: `translate(${item.x.toFixed(2)}px,${item.y.toFixed(2)}px) scale(${(item.size / 100).toFixed(4)})` }}
      >
        <g className={motion} {...button}>
          {onTap && <circle r={HIT_RADIUS} className="token-hit" />}
          {!gone && ringed?.(item) && <circle r={RING_RADIUS} className="token-ring" />}
          <UnitToken kind={item.kind} colour={colourOf(item)} count={item.count} size={item.size} label={gone || onTap ? undefined : labelOf(item)} />
        </g>
      </g>
    );
  });
}
