import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { autoPay, EXPEDITION_SLICES } from '../../domain/payment';
import type { DataPack, Game, GameState, Payment } from '../../domain/types';
import { PaymentBlock } from './PaymentBlock';
import type { SliceOwners } from './ExpeditionWidget';

const NO_PAYMENT: Payment = { planets: [], tradeGoods: 0 };

export interface ExpeditionEditorProps {
  game: Game;
  pack: DataPack;
  sliceId: string | null;
  payment: Payment;
  /** Parts already held, mine and others'; this entry's own part is not counted against it. */
  owners: SliceOwners;
  /** The state just before the entry. */
  before: GameState;
  onChange: (patch: { sliceId?: string | null; payment?: Payment }) => void;
}

/** Choice of the expedition part and its payment. A part taken by someone else cannot be chosen. */
export function ExpeditionEditor({ sliceId, payment, owners, before, pack, onChange }: ExpeditionEditorProps) {
  const { t } = useTranslation();
  const [manual, setManual] = useState(false);
  const cost = EXPEDITION_SLICES.find(s => s.id === sliceId)?.cost;
  const paidWith = cost?.kind === 'resources' || cost?.kind === 'influence' ? cost : null;

  const choose = (id: string | null) => {
    const next = EXPEDITION_SLICES.find(s => s.id === id)?.cost;
    const pays = next?.kind === 'resources' || next?.kind === 'influence';
    setManual(false);
    onChange({ sliceId: id, payment: pays ? autoPay(before, next.amount, next.kind as 'resources' | 'influence', pack) : NO_PAYMENT });
  };

  return (
    <div className="panel-stack">
      <div className="slice-grid" role="group" aria-label={t('expedition.part')}>
        {EXPEDITION_SLICES.map(({ id }) => (
          <button
            key={id} type="button" className="slice" aria-pressed={sliceId === id}
            disabled={sliceId !== id && owners[id] !== undefined}
            onClick={() => choose(sliceId === id ? null : id)}
          >
            {t(`plan.slice.${id}`)}
          </button>
        ))}
      </div>
      {paidWith && (
        <PaymentBlock
          need={paidWith.amount} kind={paidWith.kind as 'resources' | 'influence'} payment={payment} state={before} pack={pack}
          manual={manual}
          onManual={open => {
            setManual(open);
            if (!open) onChange({ payment: autoPay(before, paidWith.amount, paidWith.kind as 'resources' | 'influence', pack) });
          }}
          onChange={next => onChange({ payment: next })}
        />
      )}
    </div>
  );
}
