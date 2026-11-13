import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { componentById } from '../../../domain/components';
import { effectOf } from '../../../domain/effects/registry';
import { autoPay } from '../../../domain/payment';
import { playedCost } from '../../../domain/effects/playedCost';
import { readyToPlay } from '../../../domain/project';
import { playerState } from '../../../domain/stacks';
import type { ComponentKind, DataPack, Entry, Game, GameState, Payment, Warning } from '../../../domain/types';
import { ComponentPicker } from '../../components/ComponentPicker';
import { noteMark } from '../../components/noteMark';
import { placeWarnings } from '../../feedback/warningPlaces';
import { WarningList } from '../../feedback/WarningText';
import { StepHints } from '../../feedback/StepHints';
import { EditorFrame } from '../../primitives/EditorFrame';
import { EditorPart } from '../../primitives/EditorPart';
import { NoteField } from '../../primitives/NoteField';
import { Section } from '../../primitives/Section';
import { ChoicesBlock } from '../blocks/ChoicesBlock';
import { ComponentSlot } from '../blocks/ComponentSlot';
import { PaymentBlock } from '../blocks/PaymentBlock';

/** What a component action can play. */
const PLAYED_KINDS: ComponentKind[] = ['actionCard', 'leader', 'relic', 'technology', 'promissory', 'ability', 'breakthrough', 'legendary'];

export interface TurnEditorProps {
  entry: Extract<Entry, { type: 'component' | 'pass' }>;
  game: Game;
  pack: DataPack;
  /** The whole board just before the entry: what its owner can play as a component action is reminded of. */
  board?: GameState;
  /** The turn's warnings: those its blocks do not show stand first, such as what an expedition lacks to pay. */
  warnings: Warning[];
  /** «В этом ходу», the common part of the turn under its own heading: it stands last. */
  common: ReactNode;
  /** A component action just added from the menu: the choice of its component opens at once. */
  pickFirst?: boolean;
  onNote: (note: string) => void;
  /** The component the action plays; none takes it off. */
  onComponent: (id: string | undefined) => void;
  /** What the player chose for the component the action plays (`ComponentEffect.choose`); empty when none is left. */
  onChoices?: (choices: Record<string, string | number>) => void;
  /** What a component with a declared cost is paid with (resources or influence, planets and trade goods). */
  onPayment?: (payment: Payment) => void;
  onDone: () => void;
  onRemove: () => void;
}

/**
 * A component action or a pass as a turn: the component the action plays, first and as wide as the editor, and its note
 * in a part of their own, then what any turn holds; a pass has only that.
 */
export function TurnEditor({ entry, game, pack, board, warnings, common, pickFirst, onNote, onComponent, onChoices, onPayment, onDone, onRemove }: TurnEditorProps) {
  const { t } = useTranslation();
  const [manualPayment, setManualPayment] = useState(false);
  const [picking, setPicking] = useState(() => Boolean(pickFirst) && entry.type === 'component' && entry.componentId === undefined);
  // What the owner holds ready just before the entry stands first in the choice; the rest can be played too, and the plan warns.
  const ready = useMemo(() => {
    if (!board) return undefined;
    const own = playerState(board, entry.owner);
    return readyToPlay(pack, own.holdings, game.faction, own.control);
  }, [board, pack, entry.owner, game.faction]);
  const played = entry.type === 'component' && entry.componentId ? componentById(pack, entry.componentId) : undefined;
  const cost = playedCost(pack, entry, effectOf);
  const own = board ? playerState(board, entry.owner) : undefined;
  const payment: Payment = entry.type === 'component' && entry.payment ? entry.payment : { planets: [], tradeGoods: 0 };
  const placer = placeWarnings(warnings);
  // The acts block shows its own; the rest stands first, where it cannot be missed.
  placer.at('deal');
  placer.at('slice');
  // What the component itself breaks stands with the component, under the rest.
  const ofComponent = placer.at('component');
  return (
    <EditorFrame title={t(`plan.menu.${entry.type}`)} removeLabel={t('editor.remove')} onRemove={onRemove} onDone={onDone}>
      <WarningList warnings={placer.rest()} game={game} pack={pack} />
      {entry.type === 'component' && (
        <EditorPart title={t('editor.setup')}>
          <Section label={t('components.played')} title={t('components.played')} warnings={<WarningList warnings={ofComponent} game={game} pack={pack} />}>
            <ComponentSlot
              label={t('components.pickPlayed')} def={played} pack={pack} card={played && noteMark(game, pack, played.id, t, entry.owner ?? 'me')}
              onPick={() => setPicking(true)} onRemove={() => onComponent(undefined)}
            />
          </Section>
          {played && board && onChoices && (
            <ChoicesBlock id={played.id} entry={entry} game={game} pack={pack} before={playerState(board, entry.owner)} shared={board} onChange={onChoices} />
          )}
          {cost && own && onPayment && (
            <PaymentBlock
              need={cost.amount} kind={cost.kind} payment={payment} state={own} pack={pack} faction={game.faction} manual={manualPayment}
              onManual={open => { setManualPayment(open); if (!open) onPayment(autoPay(own, cost.amount, cost.kind, pack, { faction: game.faction })); }}
              onChange={onPayment}
            />
          )}
          <StepHints pack={pack} board={board} step="component" players={[entry.owner ?? 'me']} />
          <NoteField label={t('plan.entries.note')} value={entry.note} onCommit={onNote} />
        </EditorPart>
      )}
      {common}
      {picking && (
        <ComponentPicker
          kinds={PLAYED_KINDS} player={entry.owner ?? 'me'} owned={ready} prefer="owned" onClose={() => setPicking(false)}
          onPick={id => {
            onComponent(id);
            const picked = effectOf(pack, id)?.cost;
            if (picked && own && onPayment) onPayment(autoPay(own, picked.amount, picked.kind, pack, { faction: game.faction }));
            setPicking(false);
          }}
        />
      )}
    </EditorFrame>
  );
}
