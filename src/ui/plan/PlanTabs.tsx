import { useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { strategyCards } from '../../data/loadPack';
import type { Game, Plan } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { useReorderDrag } from '../common/useReorderDrag';

/** The store names new plans "Plan N"; those show in the interface language, names the player gave stay as they are. */
export function planDisplayName(name: string, t: (key: string, options: { n: number }) => string): string {
  const match = /^Plan (\d+)$/.exec(name);
  return match ? t('plan.defaultName', { n: Number(match[1]) }) : name;
}

/** The name of the active plan, renamed when the field is left. */
export function PlanName({ plan }: { plan: Plan }) {
  const { t } = useTranslation();
  const renamePlan = useGame(s => s.renamePlan);
  const shown = planDisplayName(plan.name, t);
  const [text, setText] = useState(shown);
  const commit = () => {
    if (text.trim() === '') {
      // The store falls back to the default name; the field must show a name again even if that changes nothing.
      renamePlan('');
      setText(shown);
    } else if (text !== shown) {
      renamePlan(text);
    }
  };
  return (
    <input
      type="text" aria-label={t('plan.name')} value={text} onChange={e => setText(e.target.value)} onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); }}
    />
  );
}

export interface PlanTabsProps {
  game: Game;
  roundNo: number;
  /** Called before the plan changes, so that what is open still closes in its own plan. */
  onSelectPlan: () => void;
  onSelectRound: (roundNo: number) => void;
  onAddRound: () => void;
  /** Removes the round in view. */
  onDeleteRound: () => void;
  /** Removes the active plan. */
  onDeletePlan: () => void;
  /** Stands to the right of the rounds. */
  afterRounds?: ReactNode;
}

/** A press becomes a drag past this many pixels; less is a tap. */
const DRAG_START = 6;

/** Plan tabs with Copy, then the rounds of the active plan and Undo. A tab is dragged along the row to change the order of the plans. */
export function PlanTabs({ game, roundNo, onSelectPlan, onSelectRound, onAddRound, onDeleteRound, onDeletePlan, afterRounds }: PlanTabsProps) {
  const { t } = useTranslation();
  const setActivePlan = useGame(s => s.setActivePlan);
  const movePlan = useGame(s => s.movePlan);
  const row = useRef<HTMLDivElement>(null);
  const copyPlan = useGame(s => s.copyPlan);
  const undo = useGame(s => s.undo);
  const canUndo = useGame(s => s.canUndo);
  const cards = strategyCards(game.expansions);
  const active = game.plans.find(p => p.id === game.activePlanId);

  const drag = useReorderDrag({
    axis: 'x', threshold: DRAG_START,
    element: id => row.current?.querySelector(`[data-plan-id="${id}"]`),
    siblings: () => game.plans.map(p => p.id),
    onDrop: movePlan,
  });

  return (
    <div className="plan-top">
      <div ref={row} className="plan-tabs" role="tablist" aria-label={t('plan.tabs')}>
        {game.plans.map(plan => {
          const card = plan.rounds.find(r => r.number === roundNo)?.strategyCard;
          return (
            <button
              key={plan.id} type="button" role="tab" className={`plan-tab${drag.draggingId === plan.id ? ' plan-tab-dragging' : ''}`} data-plan-id={plan.id} aria-selected={plan.id === game.activePlanId}
              style={drag.styleOf(plan.id)} {...drag.handlers(plan.id)}
              onClick={() => {
                if (drag.wasDrag()) return;
                onSelectPlan();
                setActivePlan(plan.id);
              }}
            >
              {planDisplayName(plan.name, t)}
              {card != null && <small>{cards.find(c => c.initiative === card)?.name}</small>}
            </button>
          );
        })}
        <button type="button" className="plan-copy" onClick={() => { onSelectPlan(); copyPlan(); }}>{t('plan.copy')}</button>
        {/* TODO(P2-383) #ws:ui-containers #type:ui #needs:prototype — удаление плана текстовой кнопкой и раунда «−» ниже вместо HexRemove */}
        <button type="button" className="plan-copy plan-delete" disabled={game.plans.length <= 1} onClick={onDeletePlan}>{t('plan.deletePlan')}</button>
      </div>
      <div className="plan-rounds-group">
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
        <button type="button" aria-label={t('plan.deleteRound', { n: roundNo })} title={t('plan.deleteRound', { n: roundNo })} disabled={(active?.rounds.length ?? 0) <= 1} onClick={onDeleteRound}>−</button>
      </div>
      {afterRounds}
      </div>
      <button type="button" className="plan-undo" disabled={!canUndo} onClick={undo}>{t('plan.undo')}</button>
    </div>
  );
}
