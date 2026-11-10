import { useTranslation } from 'react-i18next';
import { hintsAt } from '../../domain/effects/registry';
import type { DataPack, GameState, RuleStep } from '../../domain/types';
import { ComponentCard } from '../components/ComponentCard';

export interface StepHintsProps {
  pack: DataPack;
  /** The whole board just before the entry, every opponent in `rivals`; without it nothing is shown. */
  board: GameState | undefined;
  step: RuleStep;
  /** Whose components count: `me` or opponent ids. */
  players: string[];
}

/**
 * The reminders of a step, under its block: the components the players hold ready that speak of this step, each a
 * card whose press opens the printed text. It computes nothing and draws nothing when there is none.
 */
export function StepHints({ pack, board, step, players }: StepHintsProps) {
  const { t } = useTranslation();
  const hints = board ? hintsAt(pack, board, step, players) : [];
  if (hints.length === 0) return null;
  return (
    <div className="component-list step-hints" role="group" aria-label={t('components.hints')}>
      <small className="muted">{t('components.hints')}</small>
      {hints.map(def => <ComponentCard key={def.id} def={def} pack={pack} />)}
    </div>
  );
}
