import { useMemo, useState, type ReactNode } from 'react';
import type { KernelView } from '../kernelView';
import { useTranslation } from 'react-i18next';
import { componentById } from '../../../domain/components';
import type { ComponentKind, DataPack, Warning } from '../../../domain/types';
import type { Payment, Turn } from '../../../game/actions';
import { withChoicesOf, withNote, withPlayEffects, withPlayed, withPlayPayment, withProducedPayment } from '../../../game/edit/turn';
import { legacyKey } from '../../../game/keys';
import { autoPayOn, effectOfComponent as effectOf, playedCostOf, productionDueOnBoard, readyToPlayOn } from '../../../game/planQueries';
import { mapSource } from '../../../game/space';
import { ComponentPicker } from '../../components/ComponentPicker';
import { noteMark } from '../../components/noteMark';
import { placeWarnings, usingOf } from '../../feedback/warningPlaces';
import { WarningList } from '../../feedback/WarningText';
import { StepHints } from '../../feedback/StepHints';
import { EditorFrame } from '../../primitives/EditorFrame';
import { EditorPart } from '../../primitives/EditorPart';
import { HexRemove } from '../../primitives/Icon';
import { MapPickButton } from '../../primitives/MapPickButton';
import { systemTitle } from '../../map/systemName';
import { unitsText } from '../../units/unitsText';
import { NoteField } from '../../primitives/NoteField';
import { Section } from '../../primitives/Section';
import { ChoicesBlock } from '../blocks/ChoicesBlock';
import { ComponentSlot } from '../blocks/ComponentSlot';
import { PaymentBlock } from '../blocks/PaymentBlock';

/** What a component action can play. */
const PLAYED_KINDS: ComponentKind[] = ['actionCard', 'leader', 'relic', 'technology', 'promissory', 'ability', 'breakthrough', 'legendary', 'exploration'];

/** The production a component action makes (`Ability.produces`): the system on the map, the shop of the big hex, the payment. */
export interface TurnProduction {
  /** The next tap on the map chooses the system. */
  picking: boolean;
  onPick: () => void;
  onOpenShop: (slot: string) => void;
  /** The payment is the player's own choice. */
  manual: boolean;
  onManual: (open: boolean) => void;
}

export interface TurnEditorProps {
  /** The table and the board just before the entry, as the kernel keeps them: names, notes, reminders and the places of warnings are read from it. */
  view: KernelView;
  /** The turn of a component action or a pass. */
  turn: Turn;
  pack: DataPack;
  /** The turn's warnings: those its blocks do not show stand first, such as what an expedition lacks to pay. */
  warnings: Warning[];
  /** «В этом ходу», the common part of the turn under its own heading: it stands last. */
  common: ReactNode;
  /** A component action just added from the menu: the choice of its component opens at once. */
  pickFirst?: boolean;
  /** The turn after an edit: its note, the component it plays and what was chosen for it, the payment, the production. */
  onChange: (turn: Turn) => void;
  /** The production of a component whose effect produces; the block is shown only then. */
  production?: TurnProduction;
  onDone: () => void;
  onRemove: () => void;
}

/**
 * A component action or a pass as a turn: the component the action plays, first and as wide as the editor, and its note
 * in a part of their own, then what any turn holds; a pass has only that.
 */
export function TurnEditor({ turn, pack, view, warnings, common, pickFirst, onChange, production, onDone, onRemove }: TurnEditorProps) {
  const { t } = useTranslation();
  const [manualPayment, setManualPayment] = useState(false);
  const [picking, setPicking] = useState(() => Boolean(pickFirst) && turn.action.kind === 'component' && turn.action.component === undefined);
  // What the owner holds ready just before the entry stands first in the choice; the rest can be played too, and the plan warns.
  const player = turn.player;
  const key = legacyKey(view.table, player);
  const action = turn.action;
  const ready = useMemo(() => readyToPlayOn(view.table, view.board, pack, player), [view, pack, player]);
  const map = mapSource(view.table, view.board);
  const played = action.kind === 'component' && action.component ? componentById(pack, action.component) : undefined;
  const cost = playedCostOf(view.table, pack, turn);
  const payment: Payment = action.kind === 'component' && action.payment ? action.payment : { planets: [], tradeGoods: 0 };
  const makes = action.kind === 'component' && played ? effectOf(pack, played.id)?.produces === true : false;
  const made = action.kind === 'component' ? action.effects?.production : undefined;
  const producedPayment: Payment = action.kind === 'component' && action.effects?.payment ? action.effects.payment : { planets: [], tradeGoods: 0 };
  const effects = action.kind === 'component' ? action.effects : undefined;
  const placer = placeWarnings(warnings, usingOf(turn));
  // The acts block shows its own; the rest stands first, where it cannot be missed.
  placer.at('deal');
  placer.at('slice');
  // What the component itself breaks stands with the component, under the rest.
  const ofComponent = placer.at('component');
  const ofProduction = makes ? placer.at('production') : [];
  return (
    <EditorFrame title={t(`plan.menu.${action.kind}`)} removeLabel={t('editor.remove')} onRemove={onRemove} onDone={onDone}>
      <WarningList warnings={placer.rest()} table={view.table} board={view.board} pack={pack} />
      {action.kind === 'component' && (
        <EditorPart title={t('editor.setup')}>
          <Section label={t('components.played')} title={t('components.played')} warnings={<WarningList warnings={ofComponent} table={view.table} board={view.board} pack={pack} />}>
            <ComponentSlot
              label={t('components.pickPlayed')} def={played} pack={pack} card={played && noteMark(view.table, pack, played.id, t)}
              onPick={() => setPicking(true)} onRemove={() => onChange(withPlayed(turn, undefined))}
            />
          </Section>
          {played && (
            <ChoicesBlock id={played.id} turn={turn} view={view} pack={pack} onChange={chosen => onChange(withChoicesOf(turn, played.id, chosen))} />
          )}
          {cost && (
            <PaymentBlock
              need={cost.amount} kind={cost.kind} payment={payment} view={view} player={player} pack={pack} manual={manualPayment}
              onManual={open => { setManualPayment(open); if (!open) onChange(withPlayPayment(turn, autoPayOn(view.table, view.board, pack, player, cost.amount, cost.kind))); }}
              onChange={next => onChange(withPlayPayment(turn, next))}
            />
          )}
          {makes && production && (
            <Section label={t('components.produce')} title={t('components.produce')} warnings={<WarningList warnings={ofProduction} table={view.table} board={view.board} pack={pack} />}>
              {made
                ? (
                  <div className="source-row in-card">
                    <button type="button" className="source-button" onClick={() => production.onOpenShop(made.systemId)}>
                      {systemTitle(map, pack, made.systemId, t)}
                      <small>{unitsText(made.units, t)}</small>
                    </button>
                    <HexRemove label={t('components.produceClear')} onClick={() => onChange(withPlayEffects(turn, undefined))} />
                  </div>
                )
                : <MapPickButton className="option" active={production.picking} onToggle={production.onPick}>{t('components.pickProduce')}</MapPickButton>}
              {made && (
                <PaymentBlock
                  need={productionDueOnBoard(view.table, view.board, pack, player, made.units, turn)} payment={producedPayment} view={view} player={player} pack={pack}
                  manual={production.manual}
                  onManual={open => { production.onManual(open); if (!open) onChange(withProducedPayment(view.table, view.board, pack, turn, effects, false)); }}
                  onChange={next => onChange(withPlayEffects(turn, { ...effects, payment: next }))}
                />
              )}
            </Section>
          )}
          <StepHints pack={pack} table={view.table} board={view.board} step="component" players={[key]} />
          <NoteField label={t('plan.entries.note')} value={action.note} onCommit={note => onChange(withNote(turn, note))} />
        </EditorPart>
      )}
      {common}
      {picking && (
        <ComponentPicker
          kinds={PLAYED_KINDS} table={view.table} player={player} owned={ready} prefer="owned" onClose={() => setPicking(false)}
          onPick={id => {
            const played = withPlayed(turn, id);
            const picked = effectOf(pack, id)?.cost;
            onChange(picked ? withPlayPayment(played, autoPayOn(view.table, view.board, pack, player, picked.amount, picked.kind)) : played);
            setPicking(false);
          }}
        />
      )}
    </EditorFrame>
  );
}
