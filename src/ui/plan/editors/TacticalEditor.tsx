import { holderOf, inForceOf } from '../../../domain/effects/registry';
import type { ReactNode } from 'react';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CUSTODIANS_COST } from '../../../domain/mecatol';
import { autoPay, shownPlanetValues } from '../../../domain/payment';
import { fleetExcess, productionDue, routeSteps, standing, systemPlanets } from '../../../domain/project';
import { stepPlayers } from '../../../game/abilities/registry';
import { legacyKey, playerOfKey } from '../../../game/keys';
import type { KernelView } from '../kernelView';
import type { DataPack, Game, GameState, RuleStep, StructureKind, UnitCounts, UnitId, Warning } from '../../../domain/types';
import { UNIT_ORDER } from '../../units/unitOrder';
import { commitSources } from '../../../domain/commitSources';
import { landingOffers } from '../../../domain/effects/points/landing';
import { LandingBlock } from '../blocks/LandingBlock';
import { PaymentBlock } from '../blocks/PaymentBlock';
import { HexRemove } from '../../primitives/Icon';
import { EditorFrame } from '../../primitives/EditorFrame';
import { EditorPart } from '../../primitives/EditorPart';
import { addUnits, afterBattle, countOf, custodiansLanding, withCustodiansPayment, landedFrom, groupOf, hasStructures, hasUnits, isUntouched, sourcesOf, splitFlight, structuresArrived, unitsIn, viaOf, withLandedStructure, withLanding, withLandingFrom, withoutSource, type TacticalEntry } from '../../../domain/tactical';
import { Section } from '../../primitives/Section';
import { unitsText } from '../../units/unitsText';
import { systemTitle } from '../../map/systemName';
import { limitsSystem, ofSource, placeWarnings } from '../../feedback/warningPlaces';
import { WarningList } from '../../feedback/WarningText';
import { StepHints } from '../../feedback/StepHints';
import { MapPickButton } from '../../primitives/MapPickButton';
import { Vanishing } from '../../primitives/Vanishing';

export interface TacticalEditorProps {
  /** The table and the board just before the entry, as the kernel keeps them: names, notes, reminders and the places of warnings are read from it. */
  view: KernelView;
  game: Game;
  pack: DataPack;
  entry: TacticalEntry;
  /** The state just before the entry. */
  before: GameState;
  /** The whole board just before the entry, every opponent in `rivals`. */
  board?: GameState;
  warnings: Warning[];
  manualPayment: boolean;
  /** What the next tap on the map chooses. */
  choosing: 'system' | 'source' | null;
  onChoose: (what: 'system' | 'source' | null) => void;
  onUpdate: (patch: Partial<TacticalEntry>) => void;
  /** Opens the flight step of a source. */
  onOpenPicker: (source: string) => void;
  /** The sources on their way out: left with nothing chosen, their rows fade and fold before they go. */
  leaving?: string[];
  /** The row of a leaving source has finished its transition. */
  onLeft?: (source: string) => void;
  onManualPayment: (open: boolean) => void;
  /** Opens the shop of the big hex on the active system. */
  onOpenShop: () => void;
  /** Opens the battle of the big hex on the active system. */
  onOpenBattle: () => void;
  /** Opens the big hex on the active system to remove ships beyond the fleet pool. */
  onOpenFleet: () => void;
  onDone: () => void;
  /** The cross of the head: the action goes. */
  onRemove: () => void;
  /** The blocks of «В этом ходу»: what the turn holds beside its action, the last part of the editor under its own heading. */
  common?: ReactNode;
}

/**
 * The whole tactical action on one screen: system, arrows and units, optional battle, landing and build, payment. Each
 * block shows its own warnings. The flight of a source is a step of its own (UnitPicker), shown in its place.
 */
export function TacticalEditor({
  game, pack, view, entry, before, board, warnings, manualPayment, choosing, onChoose,
  onUpdate, onOpenPicker, leaving = [], onLeft, onManualPayment, onOpenShop, onOpenBattle, onOpenFleet, onDone, onRemove, common,
}: TacticalEditorProps) {
  const { t } = useTranslation();
  const target = entry.systemId;
  const planets = target === null ? [] : systemPlanets(game, target, pack);
  // The price asks the laws in play and the components this entry plays, as the replay does.
  const priceOf = (units: UnitCounts) => productionDue(game, before, units, pack, entry);
  const cost = priceOf(entry.production);
  const unitText = (units: UnitCounts): string => unitsText(units, t);

  const sources = sourcesOf(game, pack, entry);
  /** A leaving source no longer counts: what the editor says without it stands from the start, so nothing jumps when it goes. */
  const untouched = isUntouched({ ...entry, moves: leaving.reduce((moves, source) => withoutSource(game, pack, moves, source), entry.moves) });
  /** A source in the list: its ships, then how much rides as cargo. */
  const sourceLine = (source: string): string => {
    const { ships, cargo } = splitFlight(game, pack, before.holdings, unitsIn(groupOf(game, pack, entry.moves, source)));
    // A structure taken on board rides with the cargo.
    const aboard = countOf(cargo) + groupOf(game, pack, entry.moves, source).reduce((sum, m) => sum + Object.values(m.structures ?? {}).reduce((n, count) => n + (count ?? 0), 0), 0);
    return `${unitText(ships) || t('plan.tactical.noShips')}${aboard > 0 ? t('plan.tactical.cargoShort', { n: aboard }) : ''}`;
  };

  const lost = entry.losses ?? {};
  /** What the battle leaves, and the ground force types that arrived or are already assigned: only these can land. */
  const { left: here, landable } = afterBattle(pack, entry, before, UNIT_ORDER);
  /** The structures a flight brought into the space area: the action puts them on planets at its end. */
  const afloat = structuresArrived(entry, before);
  /** What the components in force let the landing offer beyond what the flights brought. */
  const offers = landingOffers(pack, holderOf(game, before));
  const fromSources = offers.fromPlanets && target !== null ? commitSources(game, pack, before, target).map(source => ({ planet: pack.planets[source.planetId], units: source.units })).filter(source => source.planet) : [];
  const showLanding = planets.length > 0 && (landable.length > 0 || entry.landings.length > 0 || hasStructures(afloat) || fromSources.length > 0);

  const landedOn = (planetId: string, unit: UnitId): number => entry.landings.find(l => l.planetId === planetId && l.from === undefined)?.units[unit] ?? 0;
  /** The ability that frees the price of the custodians token (Blood Ties): the payment is then not seeded. */
  const custodiansFree = inForceOf(pack, holderOf(game, before), effect => effect.permit?.some(w => w.code === 'custodians') ?? false).length > 0;
  const custodiansAt = custodiansLanding(before, entry, pack);
  const [custodiansManual, setCustodiansManual] = useState(false);
  const setLanding = (planetId: string, unit: UnitId, count: number) => {
    const patch = withLanding(entry, planetId, unit, count);
    onUpdate({ ...patch, ...withCustodiansPayment({ ...entry, ...patch }, before, game.faction, pack, custodiansFree) });
  };
  const lostAnywhere = unitText(Object.values(entry.groundLosses ?? {}).reduce(addUnits, lost));

  const toggleManual = (open: boolean) => {
    onManualPayment(open);
    if (!open) onUpdate({ payment: autoPay(before, cost, 'resources', pack, { faction: game.faction }) });
  };

  const placer = placeWarnings(warnings, entry);
  const list = (shown: Warning[]) => <WarningList warnings={shown} table={view.table} board={view.board} pack={pack} />;
  /** The warnings of the flight from one source: its route and its cargo. */
  const flight = (source: string) => {
    const mine = (w: Warning) => ofSource(w, game, pack, entry.moves, source);
    return [...placer.at('route', mine), ...placer.at('cargo', mine)];
  };
  const overall = placer.at('action');
  const removed = entry.fleetRemovals ?? {};
  /** How many ships are still to remove, as the replay says of this action. */
  const stillOver = fleetExcess(game, entry, before, pack, standing(warnings)).over;
  const overFleet = standing(warnings).some(w => w.code === 'fleetPool' && w.params.systemId === target);
  const battleWarnings = placer.at('battle');
  /** The reminders of a step: what its players hold for it, under the block of the step. */
  const hints = (step: RuleStep) => {
    const owner = entry.owner ?? 'me';
    const actor = playerOfKey(view.table, owner);
    const players = actor === undefined ? [owner] : stepPlayers(view.table, view.board, actor, step, target, planets.map(p => p.id)).map(id => legacyKey(view.table, id));
    return <StepHints pack={pack} table={view.table} board={view.board} step={step} players={players} />;
  };

  const blocks = target !== null && (
        <>
          <Section>
            {untouched
              ? (
                <MapPickButton className="source-button" active={choosing === 'system'} onToggle={() => onChoose(choosing === 'system' ? null : 'system')}>
                  <strong>{t('plan.tactical.system', { name: systemTitle(game, pack, target, t) })}</strong>
                </MapPickButton>
              )
              : <strong>{t('plan.tactical.system', { name: systemTitle(game, pack, target, t) })}</strong>}
            <span className="muted">{entry.free ? t('plan.tactical.freeToken') : t('plan.tactical.token', { from: before.tactic, to: before.tactic - 1 })}</span>
            {untouched && <span className="muted">{t('plan.tactical.wrongSystem')}</span>}
            {/* The activation: a token already there, or none left to spend. */}
            {list(placer.at('system'))}
          </Section>
          {hints('activation')}

          {/* The rows take the warnings of their sources first: the rest of the route's warnings is placed after them, among the children. */}
          <Section
            title={t('plan.tactical.moves')}
            action={<MapPickButton active={choosing === 'source'} onToggle={() => onChoose(choosing === 'source' ? null : 'source')}>{t('plan.tactical.addSource')}</MapPickButton>}
          >
            <span className="muted">{t('plan.tactical.moveHint')}</span>
            {sources.every(source => leaving.includes(source)) && <span className="muted">{t('plan.tactical.noSources')}</span>}
            {sources.map(source => {
              const via = viaOf(entry, source);
              const name = systemTitle(game, pack, source, t);
              const own = flight(source);
              return (
                <Fragment key={source}>
                  <Vanishing className="source-row in-card" leaving={leaving.includes(source)} onGone={() => onLeft?.(source)}>
                    <button type="button" className="source-button" onClick={() => onOpenPicker(source)}>
                      {via.length > 0 ? t('plan.tactical.via', { name, list: via.map(v => systemTitle(game, pack, v, t)).join(', ') }) : name}
                      <small>{sourceLine(source)}</small>
                      {target !== null && <small>{t('plan.tactical.distance', { n: routeSteps(game, [source, ...via, target], pack) })}</small>}
                    </button>
                    <HexRemove label={t('plan.tactical.removeSource', { name })} onClick={() => onUpdate({ moves: withoutSource(game, pack, entry.moves, source) })} />
                  </Vanishing>
                  {!leaving.includes(source) && list(own)}
                </Fragment>
              );
            })}
            {/* The capacity of the active system is left to the result of the action: the landing below changes it, and a line that comes and goes here would push the landing from under the finger. */}
            {list([...placer.at('route', w => !limitsSystem(w) || (entry.moves.length > 0 && !(w.code === 'capacitySystem' && w.params.systemId === target))), ...placer.at('cargo')])}
          </Section>
          {hints('movement')}

          {/* The battle and the build open the big hex; the row says what they hold, its warnings stand right under it. */}
          <div className="source-row in-card">
            <button type="button" className="source-button" onClick={onOpenBattle}>
              <span>{t('plan.tactical.battle')}</span>{' '}
              <small>{lostAnywhere.length > 0 ? t('plan.tactical.lost', { list: lostAnywhere }) : t('plan.tactical.battleOffer')}</small>
            </button>
          </div>
          {list(battleWarnings)}
          {hints('combat')}

          {showLanding && (
            <Section title={t('plan.tactical.landing')} optional collapsible warnings={list(placer.at('landing'))}>
              <LandingBlock
                game={game} planets={planets} before={before} board={board} units={landable} arrived={here} lost={entry.groundLosses}
                valuesOf={planetId => shownPlanetValues(pack, before, planetId, game.faction)}
                landedOn={landedOn} onLand={setLanding}
                structures={hasStructures(afloat) || offers.structures.length > 0 || entry.landings.some(l => hasStructures(l.structures)) ? {
                  arrived: afloat, reinforced: offers.structures,
                  landedOn: (planetId: string, kind: StructureKind) => entry.landings.find(l => l.planetId === planetId && l.from === undefined)?.structures?.[kind] ?? 0,
                  onLand: (planetId: string, kind: StructureKind, count: number) => onUpdate(withLandedStructure(entry, planetId, kind, count)),
                } : undefined}
                from={fromSources.length > 0 ? {
                  sources: fromSources,
                  landedFrom: (planetId: string, from: string, unit: UnitId) => landedFrom(entry, planetId, from, unit),
                  onLandFrom: (planetId: string, from: string, unit: UnitId, count: number) => onUpdate(withLandingFrom(entry, planetId, from, unit, count)),
                } : undefined}
              />
              {custodiansAt !== undefined && (
                <PaymentBlock
                  label={t('plan.tactical.custodians')} need={CUSTODIANS_COST} kind="influence" payment={entry.custodiansPayment ?? { planets: [], tradeGoods: 0 }}
                  state={before} pack={pack} manual={custodiansManual} faction={game.faction}
                  onManual={open => {
                    setCustodiansManual(open);
                    if (!open) onUpdate({ custodiansPayment: autoPay(before, CUSTODIANS_COST, 'influence', pack, { faction: game.faction }) });
                  }}
                  onChange={custodiansPayment => onUpdate({ custodiansPayment })}
                />
              )}
            </Section>
          )}
          {showLanding && hints('invasion')}

          {/* The limits of the system stand in the action's result; here only what the production itself breaks. */}
          <div className="source-row in-card">
            <button type="button" className="source-button" onClick={onOpenShop}>
              <span>{t('plan.tactical.production')}</span>{' '}
              <small>{hasUnits(entry.production) ? unitText(entry.production) : t('plan.tactical.productionOffer')}</small>
            </button>
          </div>
          {offers.shipsAway && Object.keys(entry.production).some(unit => !pack.units[unit as UnitId]?.ground) && (
            <div className="segment choice-row" role="group" aria-label={t('plan.tactical.shipsTo')}>
              {[...new Set([...before.tokensOnMap.filter(slot => slot !== target), ...(entry.shipsTo ? [entry.shipsTo] : [])])].map(slot => (
                <button key={slot} type="button" aria-pressed={entry.shipsTo === slot} onClick={() => onUpdate({ shipsTo: entry.shipsTo === slot ? undefined : slot })}>
                  {systemTitle(game, pack, slot, t)}
                </button>
              ))}
            </div>
          )}
          {list(placer.at('production', w => !limitsSystem(w)))}
          {hints('production')}

          {(cost > 0 || entry.payment.planets.length > 0 || entry.payment.tradeGoods > 0) && (
            <PaymentBlock
              need={cost} payment={entry.payment} state={before} pack={pack} manual={manualPayment} faction={game.faction}
              onManual={toggleManual} onChange={payment => onUpdate({ payment })}
            >
              {list(placer.at('payment'))}
            </PaymentBlock>
          )}

          {(overall.length > 0 || overFleet || hasUnits(removed)) && (
            <Section label={t('plan.tactical.result')} title={t('plan.tactical.result')} warnings={list(overall)}>
              {/* Over the fleet pool the excess is chosen in the big hex (37.3); the row stays while it removes anything. */}
              {(overFleet || hasUnits(removed)) && (
                <div className="source-row in-card">
                  <button type="button" className="source-button" onClick={onOpenFleet}>
                    <span>{t('plan.tactical.excess')}</span>{' '}
                    <small>{[stillOver > 0 ? t('plan.tactical.excessLeft', { n: stillOver }) : t('stage.fleetWithin'), ...(hasUnits(removed) ? [unitText(removed)] : [])].join(' · ')}</small>
                  </button>
                </div>
              )}
            </Section>
          )}
        </>
  );

  return (
    <EditorFrame className="tactical-editor" title={t('plan.tactical.title')} removeLabel={t('editor.remove')} onRemove={onRemove} onDone={onDone}>
      {/* A warning whose block is not on the screen stands first, where it cannot be missed. */}
      {list(placer.rest())}
      {/* The action's own setup, its result included; then what any turn holds, in the same order in every editor. */}
      {blocks && <EditorPart title={t('editor.setup')}>{blocks}</EditorPart>}
      {common}
    </EditorFrame>
  );
}
