import { useTranslation } from 'react-i18next';
import { opponentsBySeat } from '../../../domain/players';
import type { Act, DataPack, Game, Goods, Warning } from '../../../domain/types';
import { placeWarnings } from '../../feedback/warningPlaces';
import { WarningList } from '../../feedback/WarningText';
import { opponentName } from '../../players/names';
import { EditorFrame } from '../../primitives/EditorFrame';
import { PlayerChoice, type PlayerOption } from '../../primitives/player';
import { Section } from '../../primitives/Section';
import { Stepper } from '../../primitives/Stepper';

type Transaction = Extract<Act, { kind: 'transaction' }>;

export interface TransactionStepProps {
  game: Game;
  pack: DataPack;
  act: Transaction;
  /** Whose turn it is: `me` or an opponent's id; the other side is chosen among the rest. */
  owner: string;
  /** The turn's warnings: the step shows those of transactions. */
  warnings: Warning[];
  onChange: (act: Transaction) => void;
  onBack: () => void;
  onRemove: () => void;
}

/** A transaction with a neighbour (LRR 94): who with, then what is given and what is got. Nothing is limited; the replay warns. */
export function TransactionStep({ game, pack, act, owner, warnings, onChange, onBack, onRemove }: TransactionStepProps) {
  const { t } = useTranslation();
  // The game is seen by the turn's owner: its opponents are every other player, me among them in an opponent's turn.
  const players: PlayerOption[] = opponentsBySeat(game).filter(o => o.id !== owner)
    .map(o => ({ value: o.id, label: opponentName(game, pack, o.id, t), color: o.color }));
  const side = (key: 'give' | 'get', title: string) => {
    const goods = act[key];
    const set = (patch: Partial<Goods>) => {
      const next: Goods = { ...goods, ...patch };
      for (const field of ['tradeGoods', 'commodities'] as const) if (!next[field]) delete next[field];
      if (!next.note) delete next.note;
      onChange({ ...act, [key]: next });
    };
    return (
      <Section label={title} title={title}>
        <Stepper name={t('plan.summary.tradeGoods')} value={goods.tradeGoods ?? 0} min={0} onChange={n => set({ tradeGoods: n })} />
        <Stepper name={t('plan.summary.commodities')} value={goods.commodities ?? 0} min={0} onChange={n => set({ commodities: n })} />
        <button type="button" className="option" aria-pressed={goods.note === true} onClick={() => set({ note: !goods.note })}>{t('plan.acts.noteToggle')}</button>
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
    </EditorFrame>
  );
}
