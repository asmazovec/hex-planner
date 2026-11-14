import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { strategyCards } from '../../data/loadPack';
import { textOf } from '../../domain/components';
import { turnOfEntry } from '../../state/projection';
import { upgradesOf } from '../../domain/holdings';
import { cardCost, strategyTokensOwed } from '../../domain/strategy';
import type { DataPack, Entry, Game, GameState, Payment, UnitCounts, Warning } from '../../domain/types';
import type { KernelView } from './kernelView';
import { opponentName } from '../players/names';
import { playerColour } from '../units/sprites';
import { UnitPictures } from '../units/UnitPictures';
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
  /** The state just before the entry. */
  before: GameState;
  /** The entry's warnings about its flights; each stands in the flight it speaks of. */
  warnings?: Warning[];
}

/** What an entry plans, with no controls: a tactical action along its lines, the others as numbered steps. Pass has nothing to say. */
export function EntrySteps({ entry, game, pack, view, before, warnings = [] }: EntryStepsProps) {
  const { t } = useTranslation();
  const name = (slot: string) => systemTitle(game, pack, slot, t);
  const pictures = (units: UnitCounts) => <UnitPictures units={units} colour={playerColour(game.color)} />;
  const planetName = (id: string) => pack.planets[id]?.name ?? id;
  const steps: ReactNode[] = [];
  const paid = (payment: Payment | undefined) => {
    if (!payment || (payment.planets.length === 0 && payment.tradeGoods === 0)) return null;
    return t('plan.steps.paid', {
      list: [...payment.planets.map(planetName), ...(payment.tradeGoods > 0 ? [t('plan.steps.tradeGoods', { n: payment.tradeGoods })] : [])].join(', '),
    });
  };

  const cardSteps = (e: Extract<Entry, { type: 'strategic' | 'secondary' }>) => {
    const card = strategyCards(game.expansions).find(c => c.initiative === e.card);
    if (!card) {
      steps.push(t('plan.steps.noCard'));
      return;
    }
    const primary = e.type === 'strategic';
    const mode = e.forToken ? 'forToken' : primary ? 'primary' : 'secondary';
    steps.push(<><b>{card.name}</b>, {t(`plan.strategy.mode.${mode}`).toLowerCase()}{strategyTokensOwed(e, {}, game, before, before, pack) > 0 && <small>{t('plan.steps.strategyToken')}</small>}<small>{textOf(pack, primary ? `strategy:${card.id}` : `strategy:${card.id}#secondary`)}</small></>);
    const effects = e.effects ?? {};
    const cost = cardCost(e, game.faction, before.holdings, pack, { game, state: before });
    if (cost.amount > 0) steps.push(<>{t(`plan.steps.cost.${cost.kind}`, { n: cost.amount })}{paid(effects.payment) && <small>{paid(effects.payment)}</small>}</>);
    if (effects.boughtTokens) steps.push(t('plan.steps.bought', { n: effects.boughtTokens }));
    const tokens = effects.tokens ?? {};
    if (tokens.tactic || tokens.fleet || tokens.strategy) steps.push(t('plan.steps.tokens', { tactic: tokens.tactic ?? 0, fleet: tokens.fleet ?? 0, strategy: tokens.strategy ?? 0 }));
    if (effects.systemId) steps.push(t('plan.steps.system', { name: name(effects.systemId) }));
    if (effects.readied?.length) steps.push(t('plan.steps.readied', { list: effects.readied.map(planetName).join(', ') }));
    if (effects.speaker) steps.push(t('plan.steps.speaker', { name: opponentName(game, pack, effects.speaker, t) }));
    if (effects.freeSecondary?.length) steps.push(t('plan.steps.freeSecondary', { list: effects.freeSecondary.map(id => opponentName(game, pack, id, t)).join(', ') }));
    if (effects.mecatol) steps.push(t('plan.steps.mecatol'));
    if (effects.production) steps.push(<>{t('plan.steps.buildIn', { name: name(effects.production.systemId) })}{pictures(effects.production.units)}</>);
    for (const { kind, planetId } of effects.structures ?? []) steps.push(t('plan.steps.structure', { what: t(kind === 'pds' ? 'map.pds' : 'map.spaceDock'), planet: planetName(planetId) }));
    // A unit upgrade is drawn as its unit; the other technologies researched are counted.
    const upgrades = upgradesOf({ technologies: effects.researched ?? [] }, pack);
    const others = (effects.researched?.length ?? 0) - upgrades.length;
    if (others > 0) steps.push(t('plan.steps.researched', { n: others }));
    if (upgrades.length > 0) steps.push(<>{t('plan.steps.upgrades')}{pictures(Object.fromEntries(upgrades.map(u => [u, 1])))}</>);
  };

  switch (entry.type) {
    case 'tactical':
      return <TacticalSteps view={view} pack={pack} turn={turnOfEntry(view.table, entry, pack)} warnings={warnings} />;
    case 'strategic':
    case 'secondary':
      cardSteps(entry);
      break;
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
