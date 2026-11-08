import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cardSummary } from '../../data/cardSummaries';
import { strategyCards } from '../../data/loadPack';
import { tacticalMeters } from '../../domain/project';
import { cardCost, costsStrategyToken } from '../../domain/strategy';
import type { DataPack, Entry, Game, GameState, Payment, UnitCounts, Warning } from '../../domain/types';
import { flightOf as warningFlightOf, placeWarnings } from '../feedback/warningPlaces';
import { WarningList } from '../feedback/WarningText';
import { currentLanguage } from '../../i18n';
import { opponentName } from '../players/names';
import { playerColour } from '../units/sprites';
import { UnitTile } from '../units/UnitTile';
import { unitsText } from '../units/unitsText';
import { UNIT_ORDER } from '../units/unitOrder';
import { flightOf, hasUnits, sourcesOf, viaOf, type TacticalEntry } from '../../domain/tactical';
import { systemName } from '../map/systemName';

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
  const lang = currentLanguage();
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

  /** An action reads as one thing: what it activates, each flight along its line, then what happens on arrival. */
  const tacticalView = (e: TacticalEntry) => {
    const target = e.systemId;
    if (target === null) return null;
    const landings = e.landings.filter(landing => hasUnits(landing.units));
    const lost = [e.losses, ...Object.values(e.groundLosses ?? {})].filter((units): units is UnitCounts => hasUnits(units));
    // TODO(P2-346) #ws:ui-nesting #type:ui #needs:prototype — подробности тактики 7 уровней; строки «откуда → куда» с UnitTile, полная схема в поповере
    return (
      <div className="entry-steps entry-flights">
        <p className="flight-activate">
          <span>{t('plan.steps.activate', { name: name(target) })}</span>
          <small>{e.free ? t('plan.steps.free') : t('plan.steps.token')}</small>
        </p>
        {sourcesOf(game, pack, e).map(source => {
          const { ships, board, stops } = flightOf(game, pack, before.upgrades, e, source);
          const via = viaOf(e, source);
          const { group: load } = tacticalMeters(game, e, source, before, pack);
          // What rides with the ships is said by the cargo, the rest of the flight by its start.
          const placer = placeWarnings(warnings.filter(w => warningFlightOf(w, game, pack, e) === source));
          const cargoWarnings = placer.at('cargo');
          const startWarnings = placer.rest();
          const over = cargoWarnings.length > 0;
          return (
            <section key={source} className="flight">
              <strong>{t('plan.steps.fly', { path: [source, ...via, target].map(name).join(' → ') })}</strong>
              <ol className={`stops${over ? ' stops-over' : ''}`}>
                <li className="stop">
                  <span className="stop-name">{name(source)}</span>
                  {hasUnits(ships) ? pictures(ships) : <span className="stop-name">{t('plan.steps.nobody')}</span>}
                  {hasUnits(board) && <><span className="stop-name">{t('plan.steps.board', { name: name(source) })}</span>{pictures(board)}</>}
                  <WarningList variant="row" warnings={startWarnings} game={game} pack={pack} />
                </li>
                {via.map(slot => {
                  const taken = stops.get(slot);
                  return (
                    <li key={slot} className="stop">
                      <span className="stop-name">{taken ? t('plan.steps.pickup', { name: name(slot) }) : name(slot)}</span>
                      {taken && pictures(taken)}
                    </li>
                  );
                })}
                <li className="stop stop-target">
                  <span className="stop-name">{name(target)}</span>
                  {load.load > 0 && <span className="stop-name">{t('plan.steps.cargo', { load: load.load, capacity: load.capacity })}</span>}
                  <WarningList variant="row" warnings={cargoWarnings} game={game} pack={pack} />
                </li>
              </ol>
            </section>
          );
        })}
        {lost.length > 0 && <p className="flight-after"><span>{t('plan.steps.losses')}</span>{lost.map((units, i) => <span key={i}>{pictures(units)}</span>)}</p>}
        {landings.map(landing => (
          <p key={landing.planetId} className="flight-after"><span>{t('plan.steps.landing', { planet: planetName(landing.planetId) })}</span>{pictures(landing.units)}</p>
        ))}
        {hasUnits(e.production) && (
          <p className="flight-after"><span>{t('plan.steps.build')}</span>{pictures(e.production)}{paid(e.payment) && <small>{paid(e.payment)}</small>}</p>
        )}
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
    if (effects.researched) steps.push(t('plan.steps.researched', { n: effects.researched }));
    if (e.upgrades?.length) steps.push(<>{t('plan.steps.upgrades')}{pictures(Object.fromEntries(e.upgrades.map(u => [u, 1])))}</>);
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
