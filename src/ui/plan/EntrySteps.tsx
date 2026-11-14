import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { turnOfEntry } from '../../state/projection';
import type { DataPack, Entry, Game, UnitCounts, Warning } from '../../domain/types';
import type { KernelView } from './kernelView';
import { opponentName } from '../players/names';
import { StrategySteps } from './StrategySteps';
import { TacticalSteps } from './TacticalSteps';
import { unitsText } from '../units/unitsText';
import { systemTitle } from '../map/systemName';
import { agendaOf } from './editors/AdjustmentEditor';

export interface EntryStepsProps {
  entry: Entry;
  game: Game;
  pack: DataPack;
  /** The table and the board just before the entry, as the kernel keeps them. */
  view: KernelView;
  /** The entry's warnings about its flights; each stands in the flight it speaks of. */
  warnings?: Warning[];
}

/** What an entry plans, with no controls: a tactical action along its lines, the others as numbered steps. Pass has nothing to say. */
export function EntrySteps({ entry, game, pack, view, warnings = [] }: EntryStepsProps) {
  const { t } = useTranslation();
  const name = (slot: string) => systemTitle(game, pack, slot, t);
  const planetName = (id: string) => pack.planets[id]?.name ?? id;
  const steps: ReactNode[] = [];

  switch (entry.type) {
    case 'tactical':
      return <TacticalSteps view={view} pack={pack} turn={turnOfEntry(view.table, entry, pack)} warnings={warnings} />;
    case 'strategic':
    case 'secondary':
      return <StrategySteps view={view} pack={pack} turn={turnOfEntry(view.table, entry, pack)} />;
    case 'component':
      steps.push(entry.note || t('plan.steps.noNote'));
      break;
    case 'adjustment': {
      const { delta } = entry;
      // The agenda an entry of the agenda phase names, and whether it stays in play.
      const agenda = entry.phase === 'agenda' ? agendaOf(entry, pack) : undefined;
      if (agenda) steps.push(<>{agenda.name}<small>{t(agenda.detail?.type === 'directive' ? 'plan.agenda.directive' : 'plan.agenda.law')}</small></>);
      if (entry.label) steps.push(entry.label);
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
    case 'statusTokens':
      steps.push(t('plan.steps.tokens', { tactic: entry.tactic, fleet: entry.fleet, strategy: entry.strategy }));
      if (entry.vp) steps.push(t('plan.steps.points', { n: entry.vp }));
      for (const [id, points] of Object.entries(entry.opponentVp ?? {})) {
        if (points) steps.push(t('plan.steps.opponentPoints', { name: opponentName(game, pack, id, t), n: points }));
      }
      break;
    case 'pass':
      return null;
  }

  return (
    <div className="entry-steps">
      <ol>{steps.map((step, i) => <li key={i}><span>{step}</span></li>)}</ol>
    </div>
  );
}
