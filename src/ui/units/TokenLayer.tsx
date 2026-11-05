import { useEffect, useState } from 'react';
import type { PlacedStack } from '../../domain/hexLayout';
import { UnitToken } from './UnitToken';

/** A little longer than the transition, so that a removed token has finished collapsing. */
const LEAVE_MS = 460;

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
}

/**
 * Every stack stays the same node while it moves, so the browser only moves finished pixels. New stacks grow in, removed
 * ones stay a moment to collapse. Nodes are in key order: moving a node in the document would cut its transition short.
 */
export function TokenLayer({ items, colourOf, labelOf }: TokenLayerProps) {
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
    return (
      <g
        key={item.key} className="tk" data-stack={item.key} data-planet={item.planet}
        style={{ transform: `translate(${item.x.toFixed(2)}px,${item.y.toFixed(2)}px) scale(${(item.size / 100).toFixed(4)})` }}
      >
        <g className={motion}>
          <UnitToken kind={item.kind} colour={colourOf(item)} count={item.count} size={item.size} label={gone ? undefined : labelOf(item)} />
        </g>
      </g>
    );
  });
}
