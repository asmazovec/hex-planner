import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { autoPay, EXPEDITION_SLICES, sliceAutoPayment, slicePlanetCost, techSlicePlanets } from '../../../domain/payment';
import type { DataPack, Game, GameState, Payment, Warning } from '../../../domain/types';
import { PaymentBlock } from '../blocks/PaymentBlock';
import type { SliceOwners } from '../../../domain/thundersEdge';
import { placeWarnings } from '../../feedback/warningPlaces';
import { WarningList } from '../../feedback/WarningText';

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
  const paidWith = slicePlanetCost(sliceId);

  // The technology part is paid by exhausting one planet of mine with a technology specialty.
  const techPlanet = EXPEDITION_SLICES.find(s => s.id === sliceId)?.techPlanet === true;
  const techPlanets = techSlicePlanets(before, pack);
  const choose = (id: string | null) => {
    setManual(false);
    onChange({ sliceId: id, payment: sliceAutoPayment(before, id, pack) });
  };

  const placer = placeWarnings(warnings);
  const paymentWarnings = paidWith || techPlanet ? placer.at('payment') : [];
  // A part paid in trade goods has no payment block: its shortage stands by the choice of the part, as does the turn it is taken in.
  const sliceWarnings = [...placer.at('slice'), ...placer.at('payment'), ...placer.at('action')];

  return (
    <div className="panel-stack">
      {/* A warning whose block is not on the screen stands first, where it cannot be missed. */}
      <WarningList warnings={placer.rest()} game={game} pack={pack} />
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
      <WarningList warnings={sliceWarnings} game={game} pack={pack} />
      {paidWith && (
        <PaymentBlock
          need={paidWith.amount} kind={paidWith.kind} payment={payment} state={before} pack={pack}
          manual={manual}
          onManual={open => {
            setManual(open);
            if (!open) onChange({ payment: autoPay(before, paidWith.amount, paidWith.kind, pack) });
          }}
          onChange={next => onChange({ payment: next })}
        >
          <WarningList warnings={paymentWarnings} game={game} pack={pack} />
        </PaymentBlock>
      )}
      {techPlanet && (
        <div className="editor-section" role="group" aria-label={t('expedition.techPlanet')}>
          <strong>{t('expedition.techPlanet')}</strong>
          {techPlanets.length === 0 && <p className="muted">{t('expedition.noTechPlanet')}</p>}
          {techPlanets.map(id => (
            <button
              key={id} type="button" className="option" aria-pressed={payment.planets.includes(id)}
              onClick={() => onChange({ payment: payment.planets.includes(id) ? NO_PAYMENT : { planets: [id], tradeGoods: 0 } })}
            >
              {pack.planets[id]?.name ?? id}
            </button>
          ))}
          <WarningList warnings={paymentWarnings} game={game} pack={pack} />
        </div>
      )}
    </div>
  );
}
