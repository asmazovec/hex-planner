import { useState } from 'react';
import type { KernelView } from '../kernelView';
import { useTranslation } from 'react-i18next';
import { componentById } from '../../../domain/components';
import { notesOfFirst, tradable, TRANSACTION_KINDS } from '../../../domain/holdings';
import type { ComponentKind, DataPack, Warning } from '../../../domain/types';
import type { Goods, Transaction, Turn } from '../../../game/actions';
import { withAct } from '../../../game/edit/turn';
import { legacyKey } from '../../../game/keys';
import { effectOfComponent as effectOf } from '../../../game/planQueries';
import { shelfOf } from '../../../game/shelf';
import { ComponentCard } from '../../components/ComponentCard';
import { ComponentPicker } from '../../components/ComponentPicker';
import { noteMark } from '../../components/noteMark';
import { placeWarnings } from '../../feedback/warningPlaces';
import { WarningList } from '../../feedback/WarningText';
import { StepHints } from '../../feedback/StepHints';
import { nameOfPlayer } from '../../players/names';
import { EditorFrame } from '../../primitives/EditorFrame';
import { PlayerChoice, playerOptions } from '../../primitives/player';
import { Section } from '../../primitives/Section';
import { Stepper } from '../../primitives/Stepper';

type Side = 'give' | 'get';

export interface TransactionStepProps {
  /** The table and the board just before the entry, as the kernel keeps them: names, notes, reminders and the places of warnings are read from it. */
  view: KernelView;
  pack: DataPack;
  /** The turn the transaction is in, and the place of the transaction among its acts. Its player is the one whose turn it is; the other side is chosen among the rest. */
  turn: Turn;
  index: number;
  /** The turn's warnings: the step shows those of transactions. */
  warnings: Warning[];
  /** The turn with its transaction changed; the components the turn uses beside its action count: one that lifts the check of the kind (Black Market Dealings) opens relics and secret objectives to the deal. */
  onChange: (turn: Turn) => void;
  onBack: () => void;
  onRemove: () => void;
}

/**
 * A transaction with a neighbour (LRR 94): who with, then what is given and what is got. The components of a side are
 * chosen among what the giving side holds and a transaction hands over; nothing else is limited, the replay warns.
 */
export function TransactionStep({ pack, view, turn, index, warnings, onChange, onBack, onRemove }: TransactionStepProps) {
  const { t } = useTranslation();
  const act = turn.acts[index] as Transaction;
  const owner = turn.player;
  const uses = turn.used.map(u => u.component);
  const change = (next: Transaction) => onChange(withAct(turn, index, next));
  const [picking, setPicking] = useState<Side | null>(null);
  // The game is seen by the turn's owner: its opponents are every other player, me among them in an opponent's turn.
  // They are named as everywhere: the short name of the faction, a tag when the line is crowded.
  const players = playerOptions(
    view.table.players.filter(p => p.seat <= 8 && p.id !== owner).sort((a, b) => a.seat - b.seat)
      .map(p => ({ id: p.id, faction: p.faction, vp: 0, seat: p.seat, color: p.color })),
    pack, id => nameOfPlayer(view.table, pack, id, t),
  );
  const giver = (key: Side) => (key === 'give' ? owner : act.with);
  const set = (key: Side, patch: Partial<Goods>) => {
    const next: Goods = { ...act[key], ...patch };
    for (const field of ['tradeGoods', 'commodities'] as const) if (!next[field]) delete next[field];
    if (!next.components?.length) delete next.components;
    change({ ...act, [key]: next });
  };
  /**
   * What the giving side of `key` can still add: its notes and action cards before the entry, less those chosen. The
   * notes of the side that gets them stand first: a note goes back to its owner without a search.
   */
  // A used component that lifts the warning of the kind of a component lets relics and unscored secret objectives be offered as well.
  const kinds: readonly ComponentKind[] = uses.some(id => effectOf(pack, id)?.permit?.some(w => w.code === 'transactionKind'))
    ? [...TRANSACTION_KINDS, 'relic', 'secretObjective'] : TRANSACTION_KINDS;
  const offer = (key: Side): string[] => {
    return notesOfFirst(tradable(shelfOf(view.table, view.board, giver(key)), act[key].components ?? [], kinds), legacyKey(view.table, giver(key === 'give' ? 'get' : 'give')));
  };
  const side = (key: Side, title: string) => {
    const goods = act[key];
    const components = goods.components ?? [];
    return (
      <Section label={title} title={title}>
        <Stepper name={t('plan.summary.tradeGoods')} value={goods.tradeGoods ?? 0} min={0} onChange={n => set(key, { tradeGoods: n })} />
        <Stepper name={t('plan.summary.commodities')} value={goods.commodities ?? 0} min={0} onChange={n => set(key, { commodities: n })} />
        {/* The components stand under the counters and under their button: adding one moves nothing above it. */}
        <div className="side-actions">
          <button type="button" disabled={offer(key).length === 0} onClick={() => setPicking(key)}>{t('plan.acts.addComponent')}</button>
          {offer(key).length === 0 && <span className="muted">{t('plan.acts.nothingToGive')}</span>}
        </div>
        {components.map((id, index) => {
          const def = componentById(pack, id);
          return def && (
            <ComponentCard
              key={`${id}-${index}`} def={def} pack={pack} held {...noteMark(view.table, pack, id, t)}
              note={def.kind === 'actionCard' ? t('plan.acts.byAbility') : undefined}
              onRemove={() => set(key, { components: components.filter((_, i) => i !== index) })}
            />
          );
        })}
      </Section>
    );
  };
  return (
    <EditorFrame title={t('plan.acts.transactionTitle')} removeLabel={t('plan.acts.remove', { name: t('plan.acts.kind.transaction') })} onRemove={onRemove} onBack={onBack}>
      <PlayerChoice label={t('plan.acts.withWhom')} options={players} chosen={value => value === act.with} onPick={value => { if (value !== null) change({ ...act, with: value }); }} />
      {side('give', t('plan.acts.give'))}
      {side('get', t('plan.acts.get'))}
      {/* Under the goods: a warning above them would push the counters from under the finger. */}
      <WarningList warnings={placeWarnings(warnings).at('deal')} table={view.table} board={view.board} pack={pack} />
      <StepHints pack={pack} table={view.table} board={view.board} step="transaction" players={[legacyKey(view.table, owner), legacyKey(view.table, act.with)]} />
      {picking && (
        <ComponentPicker
          ids={offer(picking)} table={view.table} player={giver(picking)} onClose={() => setPicking(null)}
          onPick={id => { set(picking, { components: [...(act[picking].components ?? []), id] }); setPicking(null); }}
        />
      )}
    </EditorFrame>
  );
}
