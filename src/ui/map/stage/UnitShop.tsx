import type { TokenKind } from '../../../domain/hexLayout';
import { UnitTile } from '../../units/UnitTile';

export interface ShopItem {
  kind: TokenKind;
  label: string;
  /** A `--player-<n>` value. */
  colour: string;
  /** The price of one in build mode. */
  price?: number;
  disabled?: boolean;
}

/** A space dock or a PDS: built, not produced. */
export const isStructure = (kind: TokenKind): kind is 'pds' | 'spacedock' => kind === 'pds' || kind === 'spacedock';

/** Fighters and infantry cost half a resource. */
export const priceText = (price: number): string => (price === 0.5 ? '½' : String(price));

/** One picture per unit or structure, its name under it: a tap places one on the hex. Buying goes through `UnitDraft`. */
export function UnitShop({ items, onPick }: { items: ShopItem[]; onPick: (kind: TokenKind) => void }) {
  return (
    <div className="shop">
      {items.map(({ kind, label, colour, disabled }) => (
        <UnitTile
          key={kind} variant="shop" kind={kind} colour={colour} count={0} label={label} caption={label} disabled={disabled} onClick={() => onPick(kind)}
        />
      ))}
    </div>
  );
}
