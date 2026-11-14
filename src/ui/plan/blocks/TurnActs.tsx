import { useTranslation } from 'react-i18next';
import type { KernelView } from '../kernelView';
import { EXPEDITION_SLICES } from '../../../domain/payment';
import type { SliceOwners } from '../../../domain/thundersEdge';
import type { DataPack, Warning } from '../../../domain/types';
import type { Turn } from '../../../game/actions';
import { withNewAct, withoutAct } from '../../../game/edit/turn';
import { placeWarnings } from '../../feedback/warningPlaces';
import { WarningList } from '../../feedback/WarningText';
import { HexRemove } from '../../primitives/Icon';
import { Section } from '../../primitives/Section';
import { turnActLine } from '../actLines';

export interface TurnActsProps {
  /** The table and the board just before the entry, as the kernel keeps them: names, notes, reminders and the places of warnings are read from it. */
  view: KernelView;
  pack: DataPack;
  /** A turn: tactical, strategic, component or pass. */
  turn: Turn;
  /** The entry's warnings: the block shows those of its acts. */
  warnings: Warning[];
  /** Who holds each expedition part, so a full expedition offers none. */
  owners: SliceOwners;
  /** The turn with an act added or taken off. */
  onChange: (turn: Turn) => void;
  /** Opens the step of the act at this index. */
  onOpen: (index: number) => void;
}

/**
 * The first block of «В этом ходу», the part of an editor common to every turn: the acts the turn holds beside its
 * action, each a card that opens its own step, with a cross inside it. The block is named by what it can hold.
 * A transaction is added with the first opponent (or me in an opponent's turn); an expedition only with Thunder's Edge
 * while a part is free.
 */
export function TurnActs({ pack, view, turn, warnings, owners, onChange, onOpen }: TurnActsProps) {
  const { t } = useTranslation();
  const { table, board } = view;
  const acts = turn.acts;
  const te = table.expansions.includes('te');
  const placer = placeWarnings(warnings);
  // The first other player at the table; in a rival's turn that is the viewer.
  const first = turn.player !== table.viewer ? table.viewer : table.players.filter(p => p.id !== turn.player && p.seat <= 8).sort((a, b) => a.seat - b.seat)[0]?.id;
  const sliceFree = te && EXPEDITION_SLICES.some(s => !owners[s.id] && !board.common.expedition[s.id]);
  const add = (kind: 'transaction' | 'expedition') => {
    onChange(withNewAct(turn, kind, first));
    onOpen(acts.length);
  };
  const title = t(te ? 'plan.acts.blockTe' : 'plan.acts.block');
  return (
    <Section label={title} title={title} warnings={<WarningList warnings={[...placer.at('deal'), ...placer.at('slice')]} table={view.table} board={view.board} pack={pack} />}>
      {acts.map((act, index) => (
        <div key={index} className="source-row in-card">
          <button type="button" className="source-button" onClick={() => onOpen(index)}>{turnActLine(act, table, pack, t)}</button>
          <HexRemove label={t('plan.acts.remove', { name: t(`plan.acts.kind.${act.kind}`) })} onClick={() => onChange(withoutAct(turn, index))} />
        </div>
      ))}
      <div className="side-actions">
        {first !== undefined && <button type="button" onClick={() => add('transaction')}>{t('plan.acts.addTransaction')}</button>}
        {sliceFree && <button type="button" onClick={() => add('expedition')}>{t('plan.acts.addExpedition')}</button>}
      </div>
    </Section>
  );
}
