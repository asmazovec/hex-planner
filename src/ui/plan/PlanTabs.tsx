import { useTranslation } from 'react-i18next';
import { strategyCards } from '../../domain/cards';
import type { Game } from '../../domain/types';
import { useGame } from '../../state/gameStore';

/** The store names new plans "Plan N"; those show in the interface language, names the player gave stay as they are. */
export function planDisplayName(name: string, t: (key: string, options: { n: number }) => string): string {
  const match = /^Plan (\d+)$/.exec(name);
  return match ? t('plan.defaultName', { n: Number(match[1]) }) : name;
}

export interface PlanTabsProps {
  game: Game;
  roundNo: number;
  /** Called before the plan changes, so that what is open still closes in its own plan. */
  onSelectPlan: () => void;
  onSelectRound: (roundNo: number) => void;
  onAddRound: () => void;
}

/** Plan tabs with Copy, then the rounds of the active plan and Undo. */
export function PlanTabs({ game, roundNo, onSelectPlan, onSelectRound, onAddRound }: PlanTabsProps) {
  const { t } = useTranslation();
  const setActivePlan = useGame(s => s.setActivePlan);
  const copyPlan = useGame(s => s.copyPlan);
  const undo = useGame(s => s.undo);
  const canUndo = useGame(s => s.canUndo);
  const cards = strategyCards(game.expansions);
  const active = game.plans.find(p => p.id === game.activePlanId);

  return (
    <div className="plan-top">
      <div className="plan-tabs" role="tablist" aria-label={t('plan.tabs')}>
        {game.plans.map(plan => {
          const card = plan.rounds.find(r => r.number === roundNo)?.strategyCard;
          return (
            <button
              key={plan.id} type="button" role="tab" className="plan-tab" aria-selected={plan.id === game.activePlanId}
              onClick={() => { onSelectPlan(); setActivePlan(plan.id); }}
            >
              {planDisplayName(plan.name, t)}
              {card != null && <small>{cards.find(c => c.initiative === card)?.name}</small>}
            </button>
          );
        })}
        <button type="button" className="plan-copy" onClick={() => { onSelectPlan(); copyPlan(); }}>{t('plan.copy')}</button>
      </div>
      <div className="plan-rounds" role="group" aria-label={t('plan.rounds')}>
        {active?.rounds.map(round => (
          <button
            key={round.number} type="button" aria-pressed={round.number === roundNo}
            aria-label={t('plan.round', { n: round.number })} onClick={() => onSelectRound(round.number)}
          >
            {round.number}
          </button>
        ))}
        <button type="button" aria-label={t('plan.addRound')} onClick={onAddRound}>+</button>
      </div>
      <button type="button" className="plan-undo" disabled={!canUndo} onClick={undo}>{t('plan.undo')}</button>
    </div>
  );
}
