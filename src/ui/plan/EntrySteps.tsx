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

// TODO(P2-341) #ws:ui-containers #type:ui #unit-tile #dep:P2-320 — своя плитка юнита (.upic); UnitTile
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

/** What an entry plans, with no controls: a tactical action along its lines, the others as numbered steps. Pass has nothing to say. */
export function EntrySteps({ entry, game, pack, before }: EntryStepsProps) {
  const { t, i18n } = useTranslation();
  // TODO(P2-342) #ws:ui-structure #type:dup #size:s — язык выводится вручную; currentLanguage() из i18n, как в остальных
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
          const group = groupOf(game, pack, e.moves, source);
          // TODO(P2-343) #ws:ui-logic-to-domain #type:dup #duplicate-of-domain #dep:P2-311 — кто летит, кто на борту и где подобран пересчитаны здесь; брать из домена
          const flying = group.filter(m => m.from === source && m.pickupOf === undefined).reduce((sum, m) => ({ ...sum, ...m.units }), {} as UnitCounts);
          const ships = only(flying, u => fliesNow(game, pack, before.upgrades, u));
          const via = viaOf(e, source);
          const board = group.filter(m => m.pickupOf === undefined).reduce<UnitCounts>((sum, m) => {
            const next = { ...sum };
            for (const unit of Object.keys(m.units) as UnitId[]) if (!fliesNow(game, pack, before.upgrades, unit)) next[unit] = (next[unit] ?? 0) + (m.units[unit] ?? 0);
            return next;
          }, {});
          const stops = new Map<string, UnitCounts>();
          for (const move of group) {
            const slot = move.pickupOf === undefined ? null : sourceSlot(game, pack, move.from);
            if (slot === null) continue;
            const held = { ...stops.get(slot) };
            for (const unit of Object.keys(move.units) as UnitId[]) held[unit] = (held[unit] ?? 0) + (move.units[unit] ?? 0);
            stops.set(slot, held);
          }
          const { group: load } = tacticalMeters(game, e, source, before, pack);
          const over = load.load > load.capacity;
          return (
            <section key={source} className="flight">
              <strong>{t('plan.steps.fly', { path: [source, ...via, target].map(name).join(' → ') })}</strong>
              <ol className={`stops${over ? ' stops-over' : ''}`}>
                <li className="stop">
                  <span className="stop-name">{name(source)}</span>
                  {/* TODO(P2-344) #ws:ui-warnings #type:ui #warning-channel — «никто не летит» и «перегруз» (ниже) — свои span.warning-text по tacticalMeters; показывать коды записи (unitsMissing, capacityGroup) через WarningList */}
                  {hasUnits(ships) ? pictures(ships) : <span className="warning-text">{t('plan.steps.nobody')}</span>}
                  {hasUnits(board) && <><span className="stop-name">{t('plan.steps.board', { name: name(source) })}</span>{pictures(board)}</>}
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
                  {/* TODO(P2-345) #ws:ui-warnings #type:ui #size:s #dep:P2-344 — перегруз из tacticalMeters дублирует capacityGroup */}
                  {over && <span className="warning-text">{t('plan.steps.overCapacity')}</span>}
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
      // TODO(P2-347) #ws:ui-containers #type:dup #size:s #dep:P2-314 — копия signed из AdjustmentEditor
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
