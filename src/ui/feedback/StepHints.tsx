import { useTranslation } from 'react-i18next';
import type { DataPack, RuleStep } from '../../domain/types';
import { hintsAtSteps } from '../../game/abilities/registry';
import { playerOfKey } from '../../game/keys';
import type { Board, PlayerId, Table } from '../../game/types';
import { ComponentCard } from '../components/ComponentCard';

export interface StepHintsProps {
  pack: DataPack;
  table: Table;
  /** The whole board just before the entry; without it nothing is shown. */
  board: Board | undefined;
  step: RuleStep;
  /** Whose components count, the actor first: `me` or opponent ids as the entries name them. */
  players: string[];
}

/**
 * The reminders of a step, under its block: the components the players hold ready that speak of this step, each a
 * card whose press opens the printed text. It computes nothing and draws nothing when there is none.
 */
export function StepHints({ pack, table, board, step, players }: StepHintsProps) {
  const { t } = useTranslation();
  const hints = board ? hintsOf(table, board, pack, step, players) : [];
  if (hints.length === 0) return null;
  return (
    <div className="component-list step-hints" role="group" aria-label={t('components.hints')}>
      <small className="muted">{t('components.hints')}</small>
      {hints.map(def => <ComponentCard key={def.id} def={def} pack={pack} />)}
    </div>
  );
}

/** The reminders of a step for the players named by their keys (the actor first); a key of nobody at the table counts for nobody. */
function hintsOf(table: Table, board: Board, pack: DataPack, step: RuleStep, players: string[]) {
  const ids = players.flatMap(key => playerOfKey(table, key) ?? []);
  const actor: PlayerId | undefined = ids[0];
  return actor === undefined ? [] : hintsAtSteps(table, board, pack, actor, [step], () => ids).get(step) ?? [];
}
