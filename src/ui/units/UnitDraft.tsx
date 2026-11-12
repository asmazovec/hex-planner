import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { TokenKind } from '../../domain/hexLayout';
import { RowIcon } from '../primitives/Icon';
import { TokenPicture } from './UnitToken';

export interface UnitDraftItem {
  kind: TokenKind;
  /** Tells apart two items of one kind in a row (the same unit taken from two places); the callbacks get it as their third argument. */
  id?: string;
  /** How many of the kind this row has taken. */
  picked: number;
  /** What is left for this row alone, below zero by what was taken beyond it; without it the shared `stock` counts, and with neither the stock never ends. */
  left?: number;
  /** The price on the button to take. */
  price?: string;
  takeLabel: string;
  returnLabel: string;
  /** Why this one cannot be taken at all: a reason of its own, never an empty stock. */
  blockedReason?: string;
}

/** `horizontal`: the buttons, then the tray beside them, on one line. `vertical`, for a narrow panel or many kinds: the buttons on a line, the tray under them in the same columns. */
export type UnitDraftLayout = 'horizontal' | 'vertical';

/** How many kinds a narrow panel (the plan, the big hex) holds on one line with their place and their tray. */
const BESIDE = 2;

/** The layout a row of so many kinds takes in a narrow panel: beside its tray while both fit on one line, above it after that. */
export const layoutFor = (kinds: number): UnitDraftLayout => (kinds > BESIDE ? 'vertical' : 'horizontal');

export interface UnitDraftRow {
  id: string;
  /** What a screen reader calls the row. */
  label: string;
  /** What the rows differ by, at the start of the row: a planet, the space area. */
  place?: ReactNode;
  items: UnitDraftItem[];
  /** Why nothing can be taken into this row. */
  blockedReason?: string;
  /** What stands at the end of the row: who is already there. */
  aside?: ReactNode;
  /** The layout of this row alone; without it the row follows the draft. */
  layout?: UnitDraftLayout;
}

export interface UnitDraftProps {
  rows: UnitDraftRow[];
  /** How a row lays out its buttons and its tray, `horizontal` unless asked; a row may ask for its own. */
  layout?: UnitDraftLayout;
  /** What is left of each kind for all the rows together, below zero by what was taken beyond it: the caller counts it, and a kind that ran out changes its look in every row. */
  stock?: Partial<Record<TokenKind, number>>;
  colour: string;
  onTake: (rowId: string, kind: TokenKind, itemId?: string) => void;
  onReturn: (rowId: string, kind: TokenKind, itemId?: string) => void;
  /** The names of the two zones of a row for a screen reader. */
  stockLabel: string;
  pickedLabel: string;
}

const PICTURE = 40;

/**
 * Units taken from a known stock, a row per place. A row is its place, a button to take per kind, a quiet arrow and the
 * tray of what was taken. A button is the stock: a plus and what is left. An empty stock forbids nothing, since an
 * ability may change the rule and the domain warns: with nothing left the button stays where it is and still takes,
 * dashed, with the number taken beyond the stock in its corner. Only a reason of its own disables it. The tray keeps one place per kind in the order of the buttons: an outline while empty, a filled
 * chip with its count once taken, and a tap on the chip returns one. Nothing appears, leaves or changes its width from
 * a tap, so the finger stays on what it pressed. The one way to take units from a stock anywhere in the app.
 *
 * Two layouts, both in cells of one size. Horizontal: the place, the buttons, the arrow and the tray on one line, what
 * stands beside the row at its end. Vertical: the place and what stands beside it on a line of their own, the buttons
 * under it, the tray under the buttons in the same columns, so a kind and its place of the tray stand one above the other.
 */
export function UnitDraft({ rows, layout = 'horizontal', stock, colour, onTake, onReturn, stockLabel, pickedLabel }: UnitDraftProps) {
  const { t } = useTranslation();
  return (
    <div className="unit-draft">
      {rows.map(row => {
        const vertical = (row.layout ?? layout) === 'vertical';
        const place = row.place && <div className="draft-place">{row.place}</div>;
        return (
          <div key={row.id} className={`draft-row draft-row-${vertical ? 'vertical' : 'horizontal'}`} role="group" aria-label={row.label} style={{ '--kinds': row.items.length } as CSSProperties}>
            {vertical ? (row.place || row.aside) && <div className="draft-head">{place}{row.aside}</div> : place}
            <div className="draft-stock" role="group" aria-label={stockLabel}>
              {row.items.map(item => {
                const left = item.left ?? stock?.[item.kind];
                const counted = left !== undefined && Number.isFinite(left);
                const blocked = row.blockedReason ?? item.blockedReason;
                const out = !blocked && counted && left <= 0;
                const over = out ? -left : 0;
                const note = blocked ?? (out ? [t('draft.over'), ...(over > 0 ? [t('draft.overBy', { n: over })] : [])].join(' · ') : undefined);
                return (
                  <button
                    key={item.id ?? item.kind} type="button" className={blocked ? 'draft-take draft-take-out' : out ? 'draft-take draft-take-over' : 'draft-take'} aria-label={item.takeLabel}
                    title={note ? `${item.takeLabel}: ${note}` : item.takeLabel} disabled={Boolean(blocked)} onClick={() => onTake(row.id, item.kind, item.id)}
                  >
                    <span className="draft-plus" aria-hidden="true">+</span>
                    {over > 0 && <span className="draft-over">+{over}</span>}
                    <TokenPicture kind={item.kind} colour={colour} px={PICTURE} />
                    <span className="draft-foot">
                      {item.price !== undefined && <b>{item.price}</b>}
                      {counted && <i>{Math.max(0, left)}</i>}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="draft-picked">
              {!vertical && <span className="draft-arrow" aria-hidden="true"><RowIcon name="chevron" /></span>}
              <div className="draft-tray" role="group" aria-label={pickedLabel}>
                {row.items.map(item => (item.picked > 0 ? (
                  <button key={item.id ?? item.kind} type="button" className="draft-chip" aria-label={item.returnLabel} title={item.returnLabel} onClick={() => onReturn(row.id, item.kind, item.id)}>
                    <TokenPicture kind={item.kind} colour={colour} px={PICTURE} />
                    <i>×{item.picked}</i>
                  </button>
                ) : (
                  <span key={item.id ?? item.kind} className="draft-slot" aria-hidden="true">
                    <TokenPicture kind={item.kind} colour={colour} px={PICTURE} />
                  </span>
                )))}
              </div>
            </div>
            {!vertical && row.aside}
          </div>
        );
      })}
    </div>
  );
}
