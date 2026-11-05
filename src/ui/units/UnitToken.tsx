import { useSyncExternalStore } from 'react';
import { HEX_SCALE, type TokenKind } from '../../domain/hexLayout';
import { getSprite, SPRITE_REACH, subscribeSprites, tokenMarkup } from './sprites';

export interface UnitTokenProps {
  kind: TokenKind;
  /** A `--player-<n>` value. */
  colour: string;
  count?: number;
  /** The size it is drawn at, in the units around it; only the counter depends on it. */
  size: number;
  /** Accessible name; without it the token is decorative. */
  label?: string;
}

/** The token as a ready bitmap once sprites are baked, and as vector art before that. Drawn 100 across at the origin. */
export function UnitToken({ kind, colour, count = 1, size, label }: UnitTokenProps) {
  const sprite = useSyncExternalStore(subscribeSprites, () => getSprite(kind, colour));
  // The counter has a minimum size on the tile, whatever the size of the token.
  const counter = Math.max(size / 32, 0.5 * HEX_SCALE) / (size / 100);
  return (
    <g role={label ? 'img' : undefined} aria-label={label} data-unit={kind}>
      {sprite
        ? <image href={sprite} x={-SPRITE_REACH} y={-SPRITE_REACH} width={2 * SPRITE_REACH} height={2 * SPRITE_REACH} />
        : <g dangerouslySetInnerHTML={{ __html: tokenMarkup(kind, colour) }} />}
      {count > 1 && (
        <>
          <circle cx={44} cy={40} r={7 * counter} strokeWidth={counter} className="unit-counter" />
          <text x={44} y={40 + 3.6 * counter} fontSize={10 * counter} className="unit-count">{count}</text>
        </>
      )}
    </g>
  );
}
