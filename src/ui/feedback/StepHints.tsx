import { useTranslation } from 'react-i18next';
import type { DataPack, RuleStep } from '../../domain/types';
import { remindersAtSteps, type Reminder } from '../../game/abilities/registry';
import type { Board, PlayerId, Table } from '../../game/types';
import { ComponentCard } from '../components/ComponentCard';
import { playerShortName } from '../players/names';

export interface StepHintsProps {
  pack: DataPack;
  table: Table;
  /** The whole board just before the entry; without it nothing is shown. */
  board: Board | undefined;
  step: RuleStep;
  /** Whose components count, the actor first. */
  players: PlayerId[];
}

/**
 * The reminders of a step, under its block: the components the players hold ready that speak of this step, each a
 * card whose press opens the printed text. Those of the player of the action stand first, as the action's own; what
 * another player holds for this step (an answer to the action, a part in its battle) comes after them and names its
 * holder in their colour. It computes nothing and draws nothing when there is none.
 */
export function StepHints({ pack, table, board, step, players }: StepHintsProps) {
  const { t } = useTranslation();
  const actor = players.find(id => table.players.some(p => p.id === id));
  const told = board ? hintsOf(table, board, pack, step, players) : [];
  if (told.length === 0) return null;
  const own = ({ holders }: Reminder): boolean => actor !== undefined && holders.includes(actor);
  const hints = [...told.filter(own), ...told.filter(reminder => !own(reminder))];
  /** Whose a reminder of another player is: their short names, in the colour of the first. */
  const holderOf = (reminder: Reminder) => (own(reminder) ? undefined : {
    label: reminder.holders.map(id => playerShortName(table, pack, id, t)).join(', '),
    color: table.players.find(p => p.id === reminder.holders[0])?.color,
  });
  return (
    <div className="component-list step-hints" role="group" aria-label={t('components.hints')}>
      <small className="muted">{t('components.hints')}</small>
      {hints.map(reminder => <ComponentCard key={reminder.def.id} def={reminder.def} pack={pack} where={holderOf(reminder)} />)}
    </div>
  );
}

/** The reminders of a step for the players named (the actor first); an id of nobody at the table counts for nobody. */
function hintsOf(table: Table, board: Board, pack: DataPack, step: RuleStep, players: PlayerId[]): Reminder[] {
  const ids = players.filter(id => table.players.some(p => p.id === id));
  const actor: PlayerId | undefined = ids[0];
  return actor === undefined ? [] : remindersAtSteps(table, board, pack, actor, [step], () => ids).get(step) ?? [];
}
