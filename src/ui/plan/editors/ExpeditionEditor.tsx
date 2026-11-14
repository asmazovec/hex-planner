import { useTranslation } from 'react-i18next';
import type { KernelView } from '../kernelView';
import { EXPEDITION_SLICES, slicePlanetCost } from '../../../domain/payment';
import type { DataPack, Warning } from '../../../domain/types';
import type { Expedition, Payment, Turn } from '../../../game/actions';
import { withAct } from '../../../game/edit/turn';
import { autoPayOn, sliceAutoPaymentOn, techSlicePlanetsOn } from '../../../game/planQueries';
import { PaymentBlock } from '../blocks/PaymentBlock';
import type { SliceOwners } from '../../../domain/thundersEdge';
import { placeWarnings } from '../../feedback/warningPlaces';
import { WarningList } from '../../feedback/WarningText';
import { EditorFrame } from '../../primitives/EditorFrame';
import { Section } from '../../primitives/Section';

const NO_PAYMENT: Payment = { planets: [], tradeGoods: 0 };

export interface ExpeditionEditorProps {
  /** The table and the board just before the entry, as the kernel keeps them: names, notes, reminders and the places of warnings are read from it. */
  view: KernelView;
  /** The turn the contribution is in, and its place among the turn's acts; the turn's player is whose it is. */
  turn: Turn;
  index: number;
  pack: DataPack;
  /** Parts already held, mine and others'; this entry's own part is not counted against it. */
  owners: SliceOwners;
  warnings?: Warning[];
  /** The payment is chosen by hand, kept by the plan screen like every payment's. */
  manualPayment: boolean;
  onManualPayment: (open: boolean) => void;
  /** The turn with its contribution changed. */
  onChange: (turn: Turn) => void;
  onDone: () => void;
  /** The cross of the head: the contribution goes. */
  onRemove: () => void;
}

/** The editor of an expedition contribution: the part and its payment. A part taken by someone else cannot be chosen. */
export function ExpeditionEditor({
  turn, index, view, owners, pack, warnings = [], manualPayment, onManualPayment, onChange, onDone, onRemove,
}: ExpeditionEditorProps) {
  const { t } = useTranslation();
  const act = turn.acts[index] as Expedition;
  const sliceId = act.slice;
  const payment = act.payment;
  const change = (patch: Partial<Pick<Expedition, 'slice' | 'payment'>>) => onChange(withAct(turn, index, { ...act, ...patch }));
  const paidWith = slicePlanetCost(sliceId);

  // The technology part is paid by exhausting one planet of mine with a technology specialty.
  const techPlanet = EXPEDITION_SLICES.find(s => s.id === sliceId)?.techPlanet === true;
  const player = turn.player;
  const techPlanets = techSlicePlanetsOn(view.table, view.board, pack, player);
  const choose = (id: string | null) => {
    onManualPayment(false);
    change({ slice: id, payment: sliceAutoPaymentOn(view.table, view.board, pack, player, id) });
  };

  const placer = placeWarnings(warnings);
  const paymentWarnings = paidWith || techPlanet ? placer.at('payment') : [];
  // A part paid in trade goods has no payment block: its shortage stands by the choice of the part, as does the turn it is taken in.
  const sliceWarnings = [...placer.at('slice'), ...placer.at('payment'), ...placer.at('action')];

  return (
    <EditorFrame title={t('expedition.title')} removeLabel={t('editor.remove')} onRemove={onRemove} onDone={onDone}>
      {/* A warning whose block is not on the screen stands first, where it cannot be missed. */}
      <WarningList warnings={placer.rest()} table={view.table} board={view.board} pack={pack} />
      <Section label={t('expedition.part')} title={t('expedition.part')} warnings={<WarningList warnings={sliceWarnings} table={view.table} board={view.board} pack={pack} />}>
        <div className="slice-grid">
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
      </Section>
      {paidWith && (
        <PaymentBlock
          need={paidWith.amount} kind={paidWith.kind} payment={payment} view={view} player={player} pack={pack}
          manual={manualPayment}
          onManual={open => {
            onManualPayment(open);
            if (!open) change({ payment: autoPayOn(view.table, view.board, pack, player, paidWith.amount, paidWith.kind) });
          }}
          onChange={next => change({ payment: next })}
        >
          <WarningList warnings={paymentWarnings} table={view.table} board={view.board} pack={pack} />
        </PaymentBlock>
      )}
      {techPlanet && (
        <Section label={t('expedition.techPlanet')} title={t('expedition.techPlanet')} warnings={<WarningList warnings={paymentWarnings} table={view.table} board={view.board} pack={pack} />}>
          {techPlanets.length === 0 && <p className="muted">{t('expedition.noTechPlanet')}</p>}
          {techPlanets.map(id => (
            <button
              key={id} type="button" className="option" aria-pressed={payment.planets.includes(id)}
              onClick={() => change({ payment: payment.planets.includes(id) ? NO_PAYMENT : { planets: [id], tradeGoods: 0 } })}
            >
              {pack.planets[id]?.name ?? id}
            </button>
          ))}
        </Section>
      )}
    </EditorFrame>
  );
}
