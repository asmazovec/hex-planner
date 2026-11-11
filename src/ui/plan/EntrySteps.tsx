import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { strategyCards } from '../../data/loadPack';
import { textOf } from '../../domain/components';
import { tacticalMeters } from '../../domain/project';
import { upgradesOf } from '../../domain/holdings';
import { cardCost, costsStrategyToken } from '../../domain/strategy';
import type { DataPack, Entry, Game, GameState, Payment, UnitCounts, Warning } from '../../domain/types';
import { flightOf as warningFlightOf, placeWarnings } from '../feedback/warningPlaces';
import { WarningList } from '../feedback/WarningText';
import { opponentName } from '../players/names';
import { playerColour } from '../units/sprites';
import { UnitTile } from '../units/UnitTile';
import { unitsText } from '../units/unitsText';
import { UNIT_ORDER } from '../units/unitOrder';
import { flightOf, hasUnits, sourcesOf, viaOf, type TacticalEntry } from '../../domain/tactical';
import { systemTitle } from '../map/systemName';
import { agendaOf } from './editors/AdjustmentEditor';

function UnitPictures({ units, game, t }: { units: UnitCounts; game: Game; t: (key: string) => string }) {
  return (
    <span className="upics">
      {UNIT_ORDER.filter(u => (units[u] ?? 0) > 0).map(unit => (
        <UnitTile key={unit} variant="mini" kind={unit} colour={playerColour(game.color)} count={units[unit] ?? 0} label={t(`unit.${unit}`)} />
      ))}
    </span>
  );
}

export interface EntryStepsProps {
  entry: Entry;
  game: Game;
  pack: DataPack;
  /** The state just before the entry. */
  before: GameState;
  /** The entry's warnings about its flights; each stands in the flight it speaks of. */
  warnings?: Warning[];
}

/** What an entry plans, with no controls: a tactical action along its lines, the others as numbered steps. Pass has nothing to say. */
export function EntrySteps({ entry, game, pack, before, warnings = [] }: EntryStepsProps) {
  const { t } = useTranslation();
  const name = (slot: string) => systemTitle(game, pack, slot, t);
  const pictures = (units: UnitCounts) => <UnitPictures units={units} game={game} t={t} />;
  const planetName = (id: string) => pack.planets[id]?.name ?? id;
  const steps: ReactNode[] = [];
  const paid = (payment: Payment | undefined) => {
    if (!payment || (payment.planets.length === 0 && payment.tradeGoods === 0)) return null;
    return t('plan.steps.paid', {
      list: [...payment.planets.map(planetName), ...(payment.tradeGoods > 0 ? [t('plan.steps.tradeGoods', { n: payment.tradeGoods })] : [])].join(', '),
    });
  };

  /** An action reads as one thing: what it activates, each flight along its line, then what happens on arrival. */
  const tacticalView = (e: TacticalEntry) => {
    const target = e.systemId;
    if (target === null) return null;
    const landings = e.landings.filter(landing => hasUnits(landing.units));
    const lost = [e.losses, ...Object.values(e.groundLosses ?? {})].filter((units): units is UnitCounts => hasUnits(units));
    // What happens on arrival: battle losses, landings, then what is built there.
    const after: ReactNode[] = [];
    if (lost.length > 0) {
      after.push(<p key="lost" className="flight-after"><span className="flight-after-label">{t('plan.steps.losses')}</span>{lost.map((units, i) => <UnitPictures key={i} units={units} game={game} t={t} />)}</p>);
    }
    for (const landing of landings) {
      after.push(<p key={`land:${landing.planetId}`} className="flight-after"><span className="flight-after-label">{t('plan.steps.landing', { planet: planetName(landing.planetId) })}</span>{pictures(landing.units)}</p>);
    }
    if (hasUnits(e.production)) {
      after.push(<p key="build" className="flight-after"><span className="flight-after-label">{t('plan.steps.build')}</span>{pictures(e.production)}{paid(e.payment) && <small>{paid(e.payment)}</small>}</p>);
    }
    const sources = sourcesOf(game, pack, e);
    return (
      <div className="entry-steps entry-flights">
        <p className="flight-activate">
          <span>{t('plan.steps.activate', { name: name(target) })}</span>
          <small>{e.free ? t('plan.steps.free') : t('plan.steps.token')}</small>
        </p>
        {sources.map((source, index) => {
          const { ships, board, stops } = flightOf(game, pack, before.holdings, e, source);
          const via = viaOf(e, source);
          const { group: load } = tacticalMeters(game, e, source, before, pack);
          // What rides with the ships is said by the cargo, the rest of the flight by its start.
          const placer = placeWarnings(warnings.filter(w => warningFlightOf(w, game, pack, e) === source));
          const cargoWarnings = placer.at('cargo');
          const startWarnings = placer.rest();
          const over = cargoWarnings.length > 0;
          // The last flight ends where the action happens: what follows on arrival stands at its end.
          const last = index === sources.length - 1;
          return (
            <section key={source} className="flight">
              <strong>{t('plan.steps.fly', { path: [source, ...via, target].map(name).join(' → ') })}</strong>
              <ol className={`stops${over ? ' stops-over' : ''}`}>
                {/* The start and what is taken along the way, on one line: the path is already in the heading. */}
                <li className="stop">
                  <span className="stop-name">{name(source)}</span>
                  {hasUnits(ships) ? pictures(ships) : <span className="stop-name">{t('plan.steps.nobody')}</span>}
                  {hasUnits(board) && <span className="stop-take"><span className="stop-name">{t('plan.steps.board', { name: name(source) })}</span>{pictures(board)}</span>}
                  {via.map(slot => {
                    const taken = stops.get(slot);
                    return taken && hasUnits(taken)
                      ? <span key={slot} className="stop-take"><span className="stop-name">{t('plan.steps.pickup', { name: name(slot) })}</span>{pictures(taken)}</span>
                      : null;
                  })}
                  <WarningList variant="row" warnings={startWarnings} game={game} pack={pack} />
                </li>
                <li className="stop stop-target">
                  <span className="stop-name">{name(target)}</span>
                  {load.load > 0 && <span className="stop-name">{t('plan.steps.cargo', { load: load.load, capacity: load.capacity })}</span>}
                  <WarningList variant="row" warnings={cargoWarnings} game={game} pack={pack} />
                  {last && after.length > 0 && <div className="stop-after">{after}</div>}
                </li>
              </ol>
            </section>
          );
        })}
        {sources.length === 0 && after}
      </div>
    );
  };

  const cardSteps = (e: Extract<Entry, { type: 'strategic' | 'secondary' }>) => {
    const card = strategyCards(game.expansions).find(c => c.initiative === e.card);
    if (!card) {
      steps.push(t('plan.steps.noCard'));
      return;
    }
    const primary = e.type === 'strategic';
    const mode = e.forToken ? 'forToken' : primary ? 'primary' : 'secondary';
    steps.push(<><b>{card.name}</b>, {t(`plan.strategy.mode.${mode}`).toLowerCase()}{costsStrategyToken(e) && <small>{t('plan.steps.strategyToken')}</small>}<small>{textOf(pack, primary ? `strategy:${card.id}` : `strategy:${card.id}#secondary`)}</small></>);
    const effects = e.effects ?? {};
    const cost = cardCost(e, game.faction, before.holdings, pack);
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
      return tacticalView(entry);
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
