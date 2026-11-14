import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { DataPack, UnitCounts, Warning } from '../../domain/types';
import type { Turn } from '../../game/actions';
import { roundPointsOf } from '../../game/edit/turn';
import { mapSource } from '../../game/space';
import type { KernelView } from './kernelView';
import { nameOfPlayer } from '../players/names';
import { StrategySteps } from './StrategySteps';
import { TacticalSteps } from './TacticalSteps';
import { unitsText } from '../units/unitsText';
import { systemTitle } from '../map/systemName';
import { agendaOf } from './editors/AdjustmentEditor';

export interface EntryStepsProps {
  turn: Turn;
  pack: DataPack;
  /** The table and the board just before the turn, as the kernel keeps them. */
  view: KernelView;
  /** The turn's warnings about its flights; each stands in the flight it speaks of. */
  warnings?: Warning[];
}

/** What a turn plans, with no controls: a tactical action along its lines, the others as numbered steps. Pass has nothing to say. */
export function EntrySteps({ turn, pack, view, warnings = [] }: EntryStepsProps) {
  const { t } = useTranslation();
  const name = (slot: string) => systemTitle(mapSource(view.table, view.board), pack, slot, t);
  const planetName = (id: string) => pack.planets[id]?.name ?? id;
  const steps: ReactNode[] = [];
  const action = turn.action;

  switch (action.kind) {
    case 'tactical':
      return <TacticalSteps view={view} pack={pack} turn={turn} warnings={warnings} />;
    case 'strategic':
    case 'secondary':
      return <StrategySteps view={view} pack={pack} turn={turn} />;
    case 'component':
      steps.push(action.note || t('plan.steps.noNote'));
      break;
    case 'agenda':
    case 'correction': {
      const { delta } = action;
      // The agenda an entry of the agenda phase names, and whether it stays in play.
      const agenda = action.kind === 'agenda' ? agendaOf(turn, pack) : undefined;
      if (agenda) steps.push(<>{agenda.name}<small>{t(agenda.detail?.type === 'directive' ? 'plan.agenda.directive' : 'plan.agenda.law')}</small></>);
      if (action.label) steps.push(action.label);
      for (const field of ['tradeGoods', 'tactic', 'fleet', 'strategy', 'vp'] as const) {
        const value = delta[field] ?? 0;
        if (value !== 0) steps.push(`${t(`plan.summary.${field}`)} ${value > 0 ? '+' : ''}${value}`);
      }
      const signed = (units: UnitCounts) => unitsText(units, t, true);
      if (delta.units && signed(delta.units.units)) steps.push(`${name(delta.units.systemId)}: ${signed(delta.units.units)}`);
      for (const [planetId, units] of Object.entries(delta.ground ?? {})) if (signed(units)) steps.push(`${planetName(planetId)}: ${signed(units)}`);
      if (steps.length === 0) steps.push(t('plan.steps.noChanges'));
      break;
    }
    case 'status': {
      steps.push(t('plan.steps.tokens', { tactic: action.tactic, fleet: action.fleet, strategy: action.strategy }));
      const own = roundPointsOf(turn, turn.player);
      if (own) steps.push(t('plan.steps.points', { n: own }));
      for (const player of view.table.players.filter(p => p.id !== turn.player)) {
        const points = roundPointsOf(turn, player.id);
        if (points) steps.push(t('plan.steps.opponentPoints', { name: nameOfPlayer(view.table, pack, player.id, t), n: points }));
      }
      break;
    }
    case 'pass':
      return null;
  }

  return (
    <div className="entry-steps">
      <ol>{steps.map((step, i) => <li key={i}><span>{step}</span></li>)}</ol>
    </div>
  );
}
