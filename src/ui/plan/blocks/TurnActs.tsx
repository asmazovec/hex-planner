import { useTranslation } from 'react-i18next';
import type { KernelView } from '../kernelView';
import { EXPEDITION_SLICES } from '../../../domain/payment';
import type { SliceOwners } from '../../../domain/thundersEdge';
import type { Act, DataPack, Entry, Game, Warning } from '../../../domain/types';
import { placeWarnings } from '../../feedback/warningPlaces';
import { WarningList } from '../../feedback/WarningText';
import { HexRemove } from '../../primitives/Icon';
import { Section } from '../../primitives/Section';
import { actLine } from '../actLines';

export interface TurnActsProps {
  /** The table and the board just before the entry, as the kernel keeps them: names, notes, reminders and the places of warnings are read from it. */
  view: KernelView;
  /** The game as the turn's owner sees it. */
  game: Game;
  pack: DataPack;
  /** A turn entry: tactical, strategic, component or pass. */
  entry: Entry;
  /** The entry's warnings: the block shows those of its acts. */
  warnings: Warning[];
  /** Who holds each expedition part, so a full expedition offers none. */
  owners: SliceOwners;
  onChange: (acts: Act[]) => void;
  /** Opens the step of the act at this index. */
  onOpen: (index: number) => void;
}

const NO_PAYMENT = { planets: [], tradeGoods: 0 };

/**
 * The first block of «В этом ходу», the part of an editor common to every turn: the acts the turn holds beside its
 * action, each a card that opens its own step, with a cross inside it. The block is named by what it can hold.
 * A transaction is added with the first opponent (or me in an opponent's turn); an expedition only with Thunder's Edge
 * while a part is free.
 */
export function TurnActs({ game, pack, view, entry, warnings, owners, onChange, onOpen }: TurnActsProps) {
  const { t } = useTranslation();
  const acts = 'acts' in entry && entry.acts ? entry.acts : [];
  const placer = placeWarnings(warnings);
  const first = entry.owner ? 'me' : game.opponents[0]?.id;
  const sliceFree = game.expansions.includes('te') && EXPEDITION_SLICES.some(s => !owners[s.id] && !game.expedition.slices[s.id]);
  const add = (act: Act) => {
    onChange([...acts, act]);
    onOpen(acts.length);
  };
  const title = t(game.expansions.includes('te') ? 'plan.acts.blockTe' : 'plan.acts.block');
  return (
    <Section label={title} title={title} warnings={<WarningList warnings={[...placer.at('deal'), ...placer.at('slice')]} table={view.table} board={view.board} pack={pack} />}>
      {acts.map((act, index) => (
        <div key={index} className="source-row in-card">
          <button type="button" className="source-button" onClick={() => onOpen(index)}>{actLine(act, view.table, pack, t)}</button>
          <HexRemove label={t('plan.acts.remove', { name: t(`plan.acts.kind.${act.kind}`) })} onClick={() => onChange(acts.filter((_, i) => i !== index))} />
        </div>
      ))}
      <div className="side-actions">
        {first !== undefined && <button type="button" onClick={() => add({ kind: 'transaction', with: first, give: {}, get: {} })}>{t('plan.acts.addTransaction')}</button>}
        {sliceFree && <button type="button" onClick={() => add({ kind: 'expedition', sliceId: null, payment: NO_PAYMENT })}>{t('plan.acts.addExpedition')}</button>}
      </div>
    </Section>
  );
}
