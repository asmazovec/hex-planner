import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { strategyCards } from '../../data/loadPack';
import { textOf } from '../../domain/components';
import { upgradesOf } from '../../domain/holdings';
import type { DataPack, Payment, UnitCounts } from '../../domain/types';
import type { Turn } from '../../game/actions';
import { cardCostOn, effectsOf, isCardTurn, isPrimary, strategyTokensOwedOn } from '../../game/edit/strategicRead';
import { playerOfKey } from '../../game/keys';
import { mapSource } from '../../game/space';
import type { KernelView } from './kernelView';
import { nameOfPlayer } from '../players/names';
import { systemTitle } from '../map/systemName';
import { playerColour } from '../units/sprites';
import { UnitPictures } from '../units/UnitPictures';

export interface StrategyStepsProps {
  /** The table and the board just before the turn, as the kernel keeps them. */
  view: KernelView;
  pack: DataPack;
  /** The turn that plays a strategy card, a primary or a secondary. */
  turn: Turn;
}

/** What a strategy card played plans, with no controls: the card and its side, what it costs and what was chosen, as numbered steps. */
export function StrategySteps({ view, pack, turn }: StrategyStepsProps) {
  const { t } = useTranslation();
  const { table, board } = view;
  if (!isCardTurn(turn)) return null;
  const name = (slot: string) => systemTitle(mapSource(table, board), pack, slot, t);
  const colour = playerColour(table.players.find(p => p.id === turn.player)?.color ?? 1);
  const pictures = (units: UnitCounts) => <UnitPictures units={units} colour={colour} />;
  const planetName = (id: string) => pack.planets[id]?.name ?? id;
  const playerName = (key: string) => nameOfPlayer(table, pack, playerOfKey(table, key) ?? key, t);
  const steps: ReactNode[] = [];
  const paid = (payment: Payment | undefined) => {
    if (!payment || (payment.planets.length === 0 && payment.tradeGoods === 0)) return null;
    return t('plan.steps.paid', {
      list: [...payment.planets.map(planetName), ...(payment.tradeGoods > 0 ? [t('plan.steps.tradeGoods', { n: payment.tradeGoods })] : [])].join(', '),
    });
  };

  const card = strategyCards(table.expansions).find(c => c.initiative === turn.action.card);
  if (!card) {
    steps.push(t('plan.steps.noCard'));
  } else {
    const primary = isPrimary(turn);
    const forToken = turn.action.kind === 'strategic' && turn.action.forToken === true;
    const mode = forToken ? 'forToken' : primary ? 'primary' : 'secondary';
    steps.push(<><b>{card.name}</b>, {t(`plan.strategy.mode.${mode}`).toLowerCase()}{strategyTokensOwedOn(table, board, pack, turn) > 0 && <small>{t('plan.steps.strategyToken')}</small>}<small>{textOf(pack, primary ? `strategy:${card.id}` : `strategy:${card.id}#secondary`)}</small></>);
    const effects = effectsOf(turn);
    const cost = cardCostOn(table, board, pack, turn);
    if (cost.amount > 0) steps.push(<>{t(`plan.steps.cost.${cost.kind}`, { n: cost.amount })}{paid(effects.payment) && <small>{paid(effects.payment)}</small>}</>);
    if (effects.boughtTokens) steps.push(t('plan.steps.bought', { n: effects.boughtTokens }));
    const tokens = effects.tokens ?? {};
    if (tokens.tactic || tokens.fleet || tokens.strategy) steps.push(t('plan.steps.tokens', { tactic: tokens.tactic ?? 0, fleet: tokens.fleet ?? 0, strategy: tokens.strategy ?? 0 }));
    if (effects.systemId) steps.push(t('plan.steps.system', { name: name(effects.systemId) }));
    if (effects.readied?.length) steps.push(t('plan.steps.readied', { list: effects.readied.map(planetName).join(', ') }));
    if (effects.speaker) steps.push(t('plan.steps.speaker', { name: playerName(effects.speaker) }));
    if (effects.freeSecondary?.length) steps.push(t('plan.steps.freeSecondary', { list: effects.freeSecondary.map(playerName).join(', ') }));
    if (effects.mecatol) steps.push(t('plan.steps.mecatol'));
    if (effects.production) steps.push(<>{t('plan.steps.buildIn', { name: name(effects.production.systemId) })}{pictures(effects.production.units)}</>);
    for (const { kind, planetId } of effects.structures ?? []) steps.push(t('plan.steps.structure', { what: t(kind === 'pds' ? 'map.pds' : 'map.spaceDock'), planet: planetName(planetId) }));
    // A unit upgrade is drawn as its unit; the other technologies researched are counted.
    const upgrades = upgradesOf({ technologies: effects.researched ?? [] }, pack);
    const others = (effects.researched?.length ?? 0) - upgrades.length;
    if (others > 0) steps.push(t('plan.steps.researched', { n: others }));
    if (upgrades.length > 0) steps.push(<>{t('plan.steps.upgrades')}{pictures(Object.fromEntries(upgrades.map(u => [u, 1])))}</>);
  }

  return (
    <div className="entry-steps">
      <ol>{steps.map((step, i) => <li key={i}><span>{step}</span></li>)}</ol>
    </div>
  );
}
