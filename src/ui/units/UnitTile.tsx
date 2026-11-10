import type { TokenKind } from '../../domain/hexLayout';
import { TokenPicture, UnitToken } from './UnitToken';

/**
 * What a tap does: `loss` returns a lost unit, `shop` places one on the hex, `mini` names a unit in a line of text,
 * `stack` shows who already stands somewhere. One box and one counter badge for all of them; a variant changes only the
 * lines under the picture. Units taken from a stock are not tiles: that is `UnitDraft`.
 */
export type UnitTileVariant = 'loss' | 'shop' | 'mini' | 'stack';

export interface UnitTileProps {
  kind: TokenKind;
  colour: string;
  count: number;
  /** What a tap does, or for a picture with no tap what it shows. */
  label: string;
  variant: UnitTileVariant;
  /** A small line under the picture: the planet of a loss, the name in the shop. */
  caption?: string;
  disabled?: boolean;
  onClick?: () => void;
}

/** The picture inside the box; a unit in a line of text is drawn smaller and without a box. */
const PICTURE = 52;
const MINI = 32;

/** The counter in its badge, or nothing where the variant leaves it out. */
function badge(count: number): string | null {
  return count > 1 ? String(count) : null;
}

/** The picture of a unit with its count: the one tile for placing on the hex, losses and the lines of a plan. */
export function UnitTile({ kind, colour, count, label, variant, caption, disabled, onClick }: UnitTileProps) {
  if (variant === 'stack') {
    return (
      <svg viewBox="-68 -68 136 136" width={40} height={40}>
        <UnitToken kind={kind} colour={colour} count={count} size={100} label={label} />
      </svg>
    );
  }
  const counter = badge(count);
  if (variant === 'mini') {
    return (
      <span className="unit-tile unit-tile-mini" title={label}>
        <TokenPicture kind={kind} colour={colour} px={MINI} />
        <span className="visually-hidden">{label}</span>
        {counter && <i>{counter}</i>}
      </span>
    );
  }
  return (
    <button
      type="button" className={`unit-tile unit-tile-${variant}`}
      aria-label={label} disabled={disabled} onClick={onClick}
    >
      <TokenPicture kind={kind} colour={colour} px={PICTURE} />
      {counter && <i>{counter}</i>}
      {caption && <small>{caption}</small>}
    </button>
  );
}
