import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { strategyCards } from '../../data/loadPack';
import type { SavedGame } from '../../game/save';
import { useGame } from '../../state/gameStore';
import { useReorderDrag } from '../common/useReorderDrag';
import { HexRemove } from '../primitives/Icon';

/** The store names new plans "Plan N"; those show in the interface language, names the player gave stay as they are. */
export function planDisplayName(name: string, t: (key: string, options: { n: number }) => string): string {
  const match = /^Plan (\d+)$/.exec(name);
  return match ? t('plan.defaultName', { n: Number(match[1]) }) : name;
}

/** The name of the active plan, renamed when the field is left. */
export function PlanName({ plan }: { plan: { name: string } }) {
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
  saved: SavedGame;
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

/** Copy and the plan tabs, then the rounds of the active plan and Undo. A tab is dragged along the row to change the order of the plans. */
export function PlanTabs({ saved, roundNo, onSelectPlan, onSelectRound, onAddRound, onDeleteRound, onDeletePlan, afterRounds }: PlanTabsProps) {
  const { t } = useTranslation();
  const setActivePlan = useGame(s => s.setActivePlan);
  const movePlan = useGame(s => s.movePlan);
  const row = useRef<HTMLDivElement>(null);
  const rounds = useRef<HTMLDivElement>(null);
  const copyPlan = useGame(s => s.copyPlan);
  const undo = useGame(s => s.undo);
  const canUndo = useGame(s => s.canUndo);
  const cards = strategyCards(saved.table.expansions);
  const active = saved.plans.find(p => p.id === saved.activePlanId);
  const roundCount = active?.rounds.length ?? 0;
  // The rounds scroll under their plus once they are many: the one in view is brought out from under it.
  useEffect(() => {
    rounds.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [roundNo, roundCount]);

  const drag = useReorderDrag({
    axis: 'x', threshold: DRAG_START,
    element: id => row.current?.querySelector(`[data-plan-id="${id}"]`),
    siblings: () => saved.plans.map(p => p.id),
    onDrop: movePlan,
  });

  return (
    <div className="plan-top">
      <div ref={row} className="plan-tabs" role="tablist" aria-label={t('plan.tabs')}>
        {/* Before the tabs, not after them: a new tab would push it from under the finger. */}
        <button type="button" className="plan-copy" onClick={() => { onSelectPlan(); copyPlan(); }}>{t('plan.copy')}</button>
        {saved.plans.map(plan => {
          const card = plan.rounds.find(r => r.number === roundNo)?.strategyCard;
          const selected = plan.id === saved.activePlanId;
          const name = planDisplayName(plan.name, t);
          const dragging = drag.draggingId === plan.id ? ' plan-tab-dragging' : '';
          const tab = (
            <button
              key={plan.id} type="button" role="tab" className={`plan-tab${selected ? '' : dragging}`} aria-selected={selected}
              {...(selected ? {} : { 'data-plan-id': plan.id, style: drag.styleOf(plan.id) })} {...drag.handlers(plan.id)}
              onClick={() => {
                if (drag.wasDrag()) return;
                onSelectPlan();
                setActivePlan(plan.id);
              }}
            >
              {name}
              {card != null && <small>{cards.find(c => c.initiative === card)?.name}</small>}
            </button>
          );
          if (!selected) return tab;
          // The selected tab holds its own cross at its right edge, and the two move together when it is dragged.
          return (
            <div key={plan.id} className={`in-card plan-tab-card${dragging}`} data-plan-id={plan.id} style={drag.styleOf(plan.id)}>
              {tab}
              <HexRemove label={t('plan.deletePlan', { name })} disabled={saved.plans.length <= 1} onClick={onDeletePlan} />
            </div>
          );
        })}
      </div>
      <div className="plan-rounds-group">
      <div ref={rounds} className="plan-rounds" role="group" aria-label={t('plan.rounds')}>
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
      <HexRemove label={t('plan.deleteRound', { n: roundNo })} className="plan-round-remove" disabled={(active?.rounds.length ?? 0) <= 1} onClick={onDeleteRound} />
      {afterRounds}
      </div>
      <button type="button" className="plan-undo" disabled={!canUndo} onClick={undo}>{t('plan.undo')}</button>
    </div>
  );
}
