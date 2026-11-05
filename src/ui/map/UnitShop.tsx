import type { TokenKind } from '../../domain/hexLayout';
import { UnitToken } from '../units/UnitToken';

export interface ShopItem {
  kind: TokenKind;
  label: string;
  /** A `--player-<n>` value. */
  colour: string;
  /** Shown in build mode only. */
  price?: number;
  /** How many were bought; shown in build mode only. */
  bought?: number;
  disabled?: boolean;
}

/** Fighters and infantry cost half a resource. */
const priceText = (price: number): string => (price === 0.5 ? '½' : String(price));

/** The picture of a token, drawn as on the hex. */
export function TokenPicture({ kind, colour, size }: { kind: TokenKind; colour: string; size: number }) {
  return (
    <svg viewBox="-68 -68 136 136" width={size} height={size} aria-hidden="true">
      <UnitToken kind={kind} colour={colour} size={100} />
    </svg>
  );
}

/** One picture per unit or structure: a tap takes one. */
export function UnitShop({ items, onPick }: { items: ShopItem[]; onPick: (kind: TokenKind) => void }) {
  return (
    <div className="shop">
      {items.map(({ kind, label, colour, price, bought, disabled }) => (
        <button key={kind} type="button" className="shop-item" aria-label={label} disabled={disabled} onClick={() => onPick(kind)}>
          {(bought ?? 0) > 0 && <i>+{bought}</i>}
          <TokenPicture kind={kind} colour={colour} size={46} />
          <span>{label}</span>
          {price !== undefined && <b>{priceText(price)}</b>}
        </button>
      ))}
    </div>
  );
}
