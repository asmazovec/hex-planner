import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cardSummary } from '../../data/cardSummaries';
import { strategyCards } from '../../domain/cards';
import { sourceSlot, tacticalMeters } from '../../domain/project';
import { cardCost, costsStrategyToken } from '../../domain/strategy';
import type { DataPack, Entry, Game, GameState, Payment, UnitCounts, UnitId } from '../../domain/types';
import { opponentName } from '../map/opponentName';
import { playerColour } from '../units/sprites';
import { TokenPicture } from '../units/UnitToken';
import { UNIT_ORDER } from '../units/unitOrder';
import { fliesNow, groupOf, hasUnits, sourcesOf, systemName, viaOf, type TacticalEntry } from './tactical';

const PICTURE_PX = 32;

function UnitPictures({ units, game, t }: { units: UnitCounts; game: Game; t: (key: string) => string }) {
  return (
    <span className="upics">
      {UNIT_ORDER.filter(u => (units[u] ?? 0) > 0).map(unit => (
        <span key={unit} className="upic" title={t(`unit.${unit}`)}>
          <TokenPicture kind={unit} colour={playerColour(game.color)} px={PICTURE_PX} />
          <span className="visually-hidden">{t(`unit.${unit}`)}</span>
          {(units[unit] ?? 0) > 1 && <i>{units[unit]}</i>}
        </span>
      ))}
    </span>
  );
}

const only = (units: UnitCounts, keep: (unit: UnitId) => boolean): UnitCounts =>
  Object.fromEntries((Object.keys(units) as UnitId[]).filter(keep).map(u => [u, units[u]]));

export interface EntryStepsProps {
  entry: Entry;
  game: Game;
  pack: DataPack;
  /** The state just before the entry. */
  before: GameState;
}

/** What an entry plans, as numbered steps with no controls. Pass has nothing to say. */
export function EntrySteps({ entry, game, pack, before }: EntryStepsProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'ru';
  const name = (slot: string) => systemName(game, pack, slot);
  const pictures = (units: UnitCounts) => <UnitPictures units={units} game={game} t={t} />;
  const planetName = (id: string) => pack.planets[id]?.name ?? id;
  const steps: ReactNode[] = [];
  const paid = (payment: Payment | undefined) => {
    if (!payment || (payment.planets.length === 0 && payment.tradeGoods === 0)) return null;
    return t('plan.steps.paid', {
      list: [...payment.planets.map(planetName), ...(payment.tradeGoods > 0 ? [t('plan.steps.tradeGoods', { n: payment.tradeGoods })] : [])].join(', '),
    });
  };

  const tacticalSteps = (e: TacticalEntry) => {
    const target = e.systemId;
    if (target === null) return;
    steps.push(<>{t('plan.steps.activate', { name: name(target) })}<small>{e.free ? t('plan.steps.free') : t('plan.steps.token')}</small></>);
    for (const source of sourcesOf(game, pack, e)) {
      const group = groupOf(game, pack, e.moves, source);
      const flying = group.filter(m => m.from === source && m.pickupOf === undefined).reduce((sum, m) => ({ ...sum, ...m.units }), {} as UnitCounts);
      const ships = only(flying, u => fliesNow(game, pack, before.upgrades, u));
      const path = [source, ...viaOf(e, source), target].map(name).join(' → ');
      steps.push(<>{t('plan.steps.fly', { path })}{hasUnits(ships) ? pictures(ships) : <span className="warning-text">{t('plan.steps.nobody')}</span>}</>);
      const board = group.filter(m => m.pickupOf === undefined).reduce<UnitCounts>((sum, m) => {
        const next = { ...sum };
        for (const unit of Object.keys(m.units) as UnitId[]) if (!fliesNow(game, pack, before.upgrades, unit)) next[unit] = (next[unit] ?? 0) + (m.units[unit] ?? 0);
        return next;
      }, {});
      if (hasUnits(board)) steps.push(<>{t('plan.steps.board', { name: name(source) })}{pictures(board)}</>);
      const stops = new Map<string, UnitCounts>();
      for (const move of group) {
        const slot = move.pickupOf === undefined ? null : sourceSlot(game, pack, move.from);
        if (slot === null) continue;
        const held = { ...stops.get(slot) };
        for (const unit of Object.keys(move.units) as UnitId[]) held[unit] = (held[unit] ?? 0) + (move.units[unit] ?? 0);
        stops.set(slot, held);
      }
      for (const [slot, units] of stops) steps.push(<>{t('plan.steps.pickup', { name: name(slot) })}{pictures(units)}</>);
      const { group: load } = tacticalMeters(game, e, source, before, pack);
      if (load.load > 0) {
        steps.push(<>{t('plan.steps.cargo', { load: load.load, capacity: load.capacity })}{load.load > load.capacity && <span className="warning-text">{t('plan.steps.overCapacity')}</span>}</>);
      }
    }
    for (const landing of e.landings) if (hasUnits(landing.units)) steps.push(<>{t('plan.steps.landing', { planet: planetName(landing.planetId) })}{pictures(landing.units)}</>);
    if (hasUnits(e.production)) steps.push(<>{t('plan.steps.build')}{pictures(e.production)}{paid(e.payment) && <small>{paid(e.payment)}</small>}</>);
  };

  const cardSteps = (e: Extract<Entry, { type: 'strategic' | 'secondary' }>) => {
    const card = strategyCards(game.expansions).find(c => c.initiative === e.card);
    if (!card) {
      steps.push(t('plan.steps.noCard'));
      return;
    }
    const primary = e.type === 'strategic';
    const mode = e.forToken ? 'forToken' : primary ? 'primary' : 'secondary';
    const summary = cardSummary(card.summaryKey, lang);
    steps.push(<><b>{card.name}</b>, {t(`plan.strategy.mode.${mode}`).toLowerCase()}{costsStrategyToken(e) && <small>{t('plan.steps.strategyToken')}</small>}<small>{primary ? summary.primary : summary.secondary}</small></>);
    const effects = e.effects ?? {};
    const cost = cardCost(e, game.faction, before.upgrades, pack);
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
    if (e.upgrades?.length) steps.push(<>{t('plan.steps.upgrades')}{pictures(Object.fromEntries(e.upgrades.map(u => [u, 1])))}</>);
  };

  switch (entry.type) {
    case 'tactical':
      tacticalSteps(entry);
      break;
    case 'strategic':
    case 'secondary':
      cardSteps(entry);
      break;
    case 'component':
      steps.push(entry.note || t('plan.steps.noNote'));
      break;
    case 'expedition':
      steps.push(entry.sliceId
        ? <>{t(`plan.slice.${entry.sliceId}`)}{paid(entry.payment) && <small>{paid(entry.payment)}</small>}</>
        : t('plan.steps.noSlice'));
      break;
    case 'adjustment': {
      const { delta } = entry;
      if (entry.label) steps.push(entry.label);
      for (const field of ['tradeGoods', 'tactic', 'fleet', 'strategy', 'vp'] as const) {
        const value = delta[field] ?? 0;
        if (value !== 0) steps.push(`${t(`plan.summary.${field}`)} ${value > 0 ? '+' : ''}${value}`);
      }
      const signed = (units: UnitCounts) => UNIT_ORDER.filter(u => units[u]).map(u => `${t(`unit.${u}`)} ${(units[u] ?? 0) > 0 ? '+' : ''}${units[u]}`).join(', ');
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
