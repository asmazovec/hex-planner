import type { TokenKind } from '../../domain/hexLayout';
import { TokenPicture, UnitToken } from './UnitToken';

/**
 * How a tile looks and what a tap does: `take` offers one, `taken` gives one back, `loss` returns a lost unit, `mini`
 * names a unit in a line of text, `stack` shows who already stands somewhere.
 */
export type UnitTileVariant = 'take' | 'taken' | 'loss' | 'mini' | 'stack';

export interface UnitTileProps {
  kind: TokenKind;
  colour: string;
  count: number;
  /** What a tap does, or for a picture with no tap what it shows. */
  label: string;
  variant: UnitTileVariant;
  /** Writes a count of one too. */
  showOne?: boolean;
  /** A small line under the picture, e.g. the planet of a loss. */
  caption?: string;
  onClick?: () => void;
}

const PX: Record<UnitTileVariant, number> = { take: 58, taken: 58, loss: 52, mini: 32, stack: 40 };

/** The picture of a unit with its count: the one tile for flights, landings, losses and the lines of a plan. */
export function UnitTile({ kind, colour, count, label, variant, showOne, caption, onClick }: UnitTileProps) {
  const px = PX[variant];
  if (variant === 'stack') {
    return (
      <svg viewBox="-68 -68 136 136" width={px} height={px}>
        <UnitToken kind={kind} colour={colour} count={count} size={100} label={label} />
      </svg>
    );
  }
  if (variant === 'mini') {
    return (
      <span className="upic" title={label}>
        <TokenPicture kind={kind} colour={colour} px={px} />
        <span className="visually-hidden">{label}</span>
        {count > 1 && <i>{count}</i>}
      </span>
    );
  }
  if (variant === 'loss') {
    return (
      <button type="button" className="stage-loss" onClick={onClick} aria-label={label}>
        <TokenPicture kind={kind} colour={colour} px={px} />
        {count > 1 && <i>{count}</i>}
        {caption && <small>{caption}</small>}
      </button>
    );
  }
  return (
    <button type="button" className={`pic${variant === 'taken' ? ' pic-taken' : ''}`} aria-label={label} onClick={onClick}>
      <TokenPicture kind={kind} colour={colour} px={px} />
      {(showOne || count !== 1) && <i>{count}</i>}
    </button>
  );
}
