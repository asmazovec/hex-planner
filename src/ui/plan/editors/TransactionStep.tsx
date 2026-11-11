import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { componentById } from '../../../domain/components';
import { tradable } from '../../../domain/holdings';
import { opponentsBySeat } from '../../../domain/players';
import type { Act, DataPack, Game, GameState, Goods, Warning } from '../../../domain/types';
import { ComponentCard } from '../../components/ComponentCard';
import { ComponentPicker } from '../../components/ComponentPicker';
import { noteMark } from '../../components/noteMark';
import { placeWarnings } from '../../feedback/warningPlaces';
import { WarningList } from '../../feedback/WarningText';
import { opponentName } from '../../players/names';
import { EditorFrame } from '../../primitives/EditorFrame';
import { PlayerChoice, type PlayerOption } from '../../primitives/player';
import { Section } from '../../primitives/Section';
import { Stepper } from '../../primitives/Stepper';

type Transaction = Extract<Act, { kind: 'transaction' }>;
type Side = 'give' | 'get';

export interface TransactionStepProps {
  game: Game;
  pack: DataPack;
  act: Transaction;
  /** Whose turn it is: `me` or an opponent's id; the other side is chosen among the rest. */
  owner: string;
  /** The whole board just before the turn's entry, every opponent in `rivals`: what each side holds to hand over. */
  board: GameState;
  /** The turn's warnings: the step shows those of transactions. */
  warnings: Warning[];
  onChange: (act: Transaction) => void;
  onBack: () => void;
  onRemove: () => void;
}

/**
 * A transaction with a neighbour (LRR 94): who with, then what is given and what is got. The components of a side are
 * chosen among what the giving side holds and a transaction hands over; nothing else is limited, the replay warns.
 */
export function TransactionStep({ game, pack, act, owner, board, warnings, onChange, onBack, onRemove }: TransactionStepProps) {
  const { t } = useTranslation();
  const [picking, setPicking] = useState<Side | null>(null);
  // The game is seen by the turn's owner: its opponents are every other player, me among them in an opponent's turn.
  const players: PlayerOption[] = opponentsBySeat(game).filter(o => o.id !== owner)
    .map(o => ({ value: o.id, label: opponentName(game, pack, o.id, t), color: o.color }));
  const giver = (key: Side): string => (key === 'give' ? owner : act.with);
  const set = (key: Side, patch: Partial<Goods>) => {
    const next: Goods = { ...act[key], ...patch };
    for (const field of ['tradeGoods', 'commodities'] as const) if (!next[field]) delete next[field];
    if (!next.components?.length) delete next.components;
    onChange({ ...act, [key]: next });
  };
  /** What the giving side of `key` can still add: its notes and action cards before the entry, less those chosen. */
  const offer = (key: Side): string[] => {
    const held = giver(key) === 'me' ? board.holdings : board.rivals?.[giver(key)]?.holdings;
    return held ? tradable(held, act[key].components ?? []) : [];
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
              key={`${id}-${index}`} def={def} pack={pack} held {...noteMark(game, pack, id, t, owner)}
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
      <WarningList warnings={placeWarnings(warnings).at('deal')} game={game} pack={pack} />
      {picking && (
        <ComponentPicker
          ids={offer(picking)} player={giver(picking)} onClose={() => setPicking(null)}
          onPick={id => { set(picking, { components: [...(act[picking].components ?? []), id] }); setPicking(null); }}
        />
      )}
    </EditorFrame>
  );
}
