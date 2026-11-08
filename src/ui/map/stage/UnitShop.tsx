import type { TokenKind } from '../../../domain/hexLayout';
import { UnitTile } from '../../units/UnitTile';

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

/** One picture per unit or structure, its name under it: a tap takes one. */
export function UnitShop({ items, onPick }: { items: ShopItem[]; onPick: (kind: TokenKind) => void }) {
  return (
    <div className="shop">
      {items.map(({ kind, label, colour, price, bought, disabled }) => (
        <UnitTile
          key={kind} variant="shop" kind={kind} colour={colour} count={bought ?? 0} label={label} caption={label} disabled={disabled}
          price={price === undefined ? undefined : priceText(price)} onClick={() => onPick(kind)}
        />
      ))}
    </div>
  );
}
