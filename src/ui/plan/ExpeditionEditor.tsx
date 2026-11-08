import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { autoPay, EXPEDITION_SLICES } from '../../domain/payment';
import type { DataPack, Game, GameState, Payment, Warning } from '../../domain/types';
import { PaymentBlock } from './PaymentBlock';
import type { SliceOwners } from './ExpeditionWidget';
import { placeWarnings } from './warningPlaces';
import { WarningList } from './WarningText';

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
  warnings?: Warning[];
  onChange: (patch: { sliceId?: string | null; payment?: Payment }) => void;
}

/** Choice of the expedition part and its payment. A part taken by someone else cannot be chosen. */
export function ExpeditionEditor({ game, sliceId, payment, owners, before, pack, warnings = [], onChange }: ExpeditionEditorProps) {
  const { t } = useTranslation();
  // TODO(P2-356) #ws:ui-containers #type:arch #size:s — флаг ручной оплаты хранится здесь, а TacticalEditor и StrategyEditor получают его от PlanScreen; одно место для всех PaymentBlock
  const [manual, setManual] = useState(false);
  // TODO(P2-366) #ws:payment #type:dup #size:s — «платится ресурсами или влиянием» проверяется дважды и трижды приводится as 'resources' | 'influence'; доменный помощник оплаты части
  const cost = EXPEDITION_SLICES.find(s => s.id === sliceId)?.cost;
  const paidWith = cost?.kind === 'resources' || cost?.kind === 'influence' ? cost : null;

  // TODO(P2-365) #ws:thunders-edge #type:bug #rule:expedition-4.5 #test:te-expedition — часть технологий без cost получает пустую оплату и считается оплаченной; нужна оплата истощением своей планеты с технологической специализацией
  const choose = (id: string | null) => {
    const next = EXPEDITION_SLICES.find(s => s.id === id)?.cost;
    const pays = next?.kind === 'resources' || next?.kind === 'influence';
    setManual(false);
    onChange({ sliceId: id, payment: pays ? autoPay(before, next.amount, next.kind as 'resources' | 'influence', pack) : NO_PAYMENT });
  };

  const placer = placeWarnings(warnings);
  const sliceWarnings = placer.at('slice');
  const paymentWarnings = paidWith ? placer.at('payment') : [];

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
      {/* TODO(P2-367) #ws:ui-warnings #type:ui #size:s — остаток предупреждений стоит у выбора части; по CLAUDE.md — вверху редактора */}
      {/* A part paid in trade goods has no payment block: its shortage stands by the choice of the part. */}
      <WarningList warnings={[...sliceWarnings, ...placer.rest()]} game={game} pack={pack} />
      {paidWith && (
        <PaymentBlock
          need={paidWith.amount} kind={paidWith.kind as 'resources' | 'influence'} payment={payment} state={before} pack={pack}
          manual={manual}
          onManual={open => {
            setManual(open);
            if (!open) onChange({ payment: autoPay(before, paidWith.amount, paidWith.kind as 'resources' | 'influence', pack) });
          }}
          onChange={next => onChange({ payment: next })}
        >
          <WarningList warnings={paymentWarnings} game={game} pack={pack} />
        </PaymentBlock>
      )}
    </div>
  );
}
