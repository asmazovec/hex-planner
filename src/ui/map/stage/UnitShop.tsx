import type { TokenKind } from '../../../domain/hexLayout';
import { TokenPicture } from '../../units/UnitToken';

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

/** One picture per unit or structure: a tap takes one. */
export function UnitShop({ items, onPick }: { items: ShopItem[]; onPick: (kind: TokenKind) => void }) {
  return (
    <div className="shop">
      {items.map(({ kind, label, colour, price, bought, disabled }) => (
        // TODO(P2-261) #ws:ui-containers #type:dup #needs:prototype #size:m #unit-tile — Ячейка .shop-item — одна из пяти плиток юнита с числом (UnitTile take/taken/loss/mini/stack in ui/units): UnitTile с вариантами take/taken/loss/shop
        <button key={kind} type="button" className="shop-item" aria-label={label} disabled={disabled} onClick={() => onPick(kind)}>
          {(bought ?? 0) > 0 && <i>+{bought}</i>}
          <TokenPicture kind={kind} colour={colour} px={46} />
          <span>{label}</span>
          {price !== undefined && <b>{priceText(price)}</b>}
        </button>
      ))}
    </div>
  );
}
