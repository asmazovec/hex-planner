import { useState } from 'react';
import type { KernelView } from '../kernelView';
import { useTranslation } from 'react-i18next';
import { componentById } from '../../../domain/components';
import { notesOfFirst, tradable, TRANSACTION_KINDS } from '../../../domain/holdings';
import type { Act, ComponentKind, DataPack, Goods, Warning } from '../../../domain/types';
import { legacyKey, playerOfKey } from '../../../game/keys';
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

type Transaction = Extract<Act, { kind: 'transaction' }>;
type Side = 'give' | 'get';

export interface TransactionStepProps {
  /** The table and the board just before the entry, as the kernel keeps them: names, notes, reminders and the places of warnings are read from it. */
  view: KernelView;
  pack: DataPack;
  act: Transaction;
  /** Whose turn it is: `me` or an opponent's id; the other side is chosen among the rest. */
  owner: string;
  /** The turn's warnings: the step shows those of transactions. */
  warnings: Warning[];
  /** The components the turn uses beside its action: one that lifts the check of the kind (Black Market Dealings) opens relics and secret objectives to the deal. */
  uses?: string[];
  onChange: (act: Transaction) => void;
  onBack: () => void;
  onRemove: () => void;
}

/**
 * A transaction with a neighbour (LRR 94): who with, then what is given and what is got. The components of a side are
 * chosen among what the giving side holds and a transaction hands over; nothing else is limited, the replay warns.
 */
export function TransactionStep({ pack, view, act, owner, warnings, uses = [], onChange, onBack, onRemove }: TransactionStepProps) {
  const { t } = useTranslation();
  const [picking, setPicking] = useState<Side | null>(null);
  // The game is seen by the turn's owner: its opponents are every other player, me among them in an opponent's turn.
  // They are named as everywhere: the short name of the faction, a tag when the line is crowded.
  const players = playerOptions(
    view.table.players.filter(p => p.seat <= 8 && legacyKey(view.table, p.id) !== owner).sort((a, b) => a.seat - b.seat)
      .map(p => ({ id: legacyKey(view.table, p.id), faction: p.faction, vp: 0, seat: p.seat, color: p.color })),
    pack, id => nameOfPlayer(view.table, pack, playerOfKey(view.table, id) ?? id, t),
  );
  const giver = (key: Side): string => (key === 'give' ? owner : act.with);
  const set = (key: Side, patch: Partial<Goods>) => {
    const next: Goods = { ...act[key], ...patch };
    for (const field of ['tradeGoods', 'commodities'] as const) if (!next[field]) delete next[field];
    if (!next.components?.length) delete next.components;
    onChange({ ...act, [key]: next });
  };
  /**
   * What the giving side of `key` can still add: its notes and action cards before the entry, less those chosen. The
   * notes of the side that gets them stand first: a note goes back to its owner without a search.
   */
  // A used component that lifts the warning of the kind of a component lets relics and unscored secret objectives be offered as well.
  const kinds: readonly ComponentKind[] = uses.some(id => effectOf(pack, id)?.permit?.some(w => w.code === 'transactionKind'))
    ? [...TRANSACTION_KINDS, 'relic', 'secretObjective'] : TRANSACTION_KINDS;
  const offer = (key: Side): string[] => {
    const who = playerOfKey(view.table, giver(key));
    return who === undefined ? [] : notesOfFirst(tradable(shelfOf(view.table, view.board, who), act[key].components ?? [], kinds), giver(key === 'give' ? 'get' : 'give'));
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
      <PlayerChoice label={t('plan.acts.withWhom')} options={players} chosen={value => value === act.with} onPick={value => { if (value !== null) onChange({ ...act, with: value }); }} />
      {side('give', t('plan.acts.give'))}
      {side('get', t('plan.acts.get'))}
      {/* Under the goods: a warning above them would push the counters from under the finger. */}
      <WarningList warnings={placeWarnings(warnings).at('deal')} table={view.table} board={view.board} pack={pack} />
      <StepHints pack={pack} table={view.table} board={view.board} step="transaction" players={[owner, act.with]} />
      {picking && (
        <ComponentPicker
          ids={offer(picking)} player={giver(picking)} onClose={() => setPicking(null)}
          onPick={id => { set(picking, { components: [...(act[picking].components ?? []), id] }); setPicking(null); }}
        />
      )}
    </EditorFrame>
  );
}
