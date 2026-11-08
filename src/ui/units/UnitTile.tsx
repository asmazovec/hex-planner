import type { TokenKind } from '../../domain/hexLayout';
import { TokenPicture, UnitToken } from './UnitToken';

/**
 * What a tap does: `take` offers one, `taken` gives one back, `loss` returns a lost unit, `shop` buys or places one,
 * `mini` names a unit in a line of text, `stack` shows who already stands somewhere. One box and one counter badge for
 * all of them; a variant changes only the edge and the lines under the picture.
 */
export type UnitTileVariant = 'take' | 'taken' | 'loss' | 'shop' | 'mini' | 'stack';

export interface UnitTileProps {
  kind: TokenKind;
  colour: string;
  count: number;
  /** What a tap does, or for a picture with no tap what it shows. */
  label: string;
  variant: UnitTileVariant;
  /** Writes a count of one too. */
  showOne?: boolean;
  /** A small line under the picture: the planet of a loss, the name in the shop. */
  caption?: string;
  /** The price in the shop. */
  price?: string;
  disabled?: boolean;
  onClick?: () => void;
}

/** The picture inside the box; a unit in a line of text is drawn smaller and without a box. */
const PICTURE = 52;
const MINI = 32;

/** The counter in its badge, or nothing where the variant leaves it out. */
function badge(variant: UnitTileVariant, count: number, showOne?: boolean): string | null {
  if (variant === 'shop') return count > 0 ? `+${count}` : null;
  if (variant === 'loss' || variant === 'mini') return count > 1 ? String(count) : null;
  return showOne || count !== 1 ? String(count) : null;
}

/** The picture of a unit with its count: the one tile for the shop, flights, landings, losses and the lines of a plan. */
export function UnitTile({ kind, colour, count, label, variant, showOne, caption, price, disabled, onClick }: UnitTileProps) {
  if (variant === 'stack') {
    return (
      <svg viewBox="-68 -68 136 136" width={40} height={40}>
        <UnitToken kind={kind} colour={colour} count={count} size={100} label={label} />
      </svg>
    );
  }
  const counter = badge(variant, count, showOne);
  if (variant === 'mini') {
    return (
      <span className="unit-tile unit-tile-mini" title={label}>
        <TokenPicture kind={kind} colour={colour} px={MINI} />
        <span className="visually-hidden">{label}</span>
        {counter && <i>{counter}</i>}
      </span>
    );
  }
  // A unit taken along, or one bought in the shop, is marked by the edge.
  const marked = variant === 'taken' || (variant === 'shop' && count > 0);
  return (
    <button
      type="button" className={`unit-tile unit-tile-${variant}${marked ? ' unit-tile-marked' : ''}`}
      aria-label={label} disabled={disabled} onClick={onClick}
    >
      <TokenPicture kind={kind} colour={colour} px={PICTURE} />
      {counter && <i>{counter}</i>}
      {caption && <small>{caption}</small>}
      {price !== undefined && <b>{price}</b>}
    </button>
  );
}
