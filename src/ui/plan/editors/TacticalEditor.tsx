import type { ReactNode } from 'react';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CUSTODIANS_COST } from '../../../domain/mecatol';
import { autoPayOn, landingOffersOn, productionDueOnBoard } from '../../../game/planQueries';
import { standing } from '../../../domain/replay';
import { stepPlayers } from '../../../game/abilities/registry';
import { fleetExcessOf, flightOf as flightAt } from '../../../game/flight';
import type { Turn } from '../../../game/actions';
import { legacyKey } from '../../../game/keys';
import { planetsIn, stepsOf } from '../../../game/space';
import { poolsOf, tokensOnMapOf } from '../../../game/queries';
import {
  groupOf, isUntouched, landedFrom, sourcesOf, tacticalOf, viaOf, withLandedStructure, withLanding, withLandingFrom, withoutSource,
  withProductionPayment,
} from '../../../game/edit/tactical';
import {
  afterBattle, atOf, commitSourcesOn, custodiansFreeOn, custodiansLanding, groundLossesOf, movesOf, spaceLossesOf, splitFlightOn, structuresArrived,
  withCustodiansOn, withCustodiansSet, withShipsTo,
} from '../../../game/edit/tacticalRead';
import type { KernelView } from '../kernelView';
import type { DataPack, PlanetDef, RuleStep, StructureKind, UnitCounts, UnitId, Warning } from '../../../domain/types';
import { UNIT_ORDER } from '../../units/unitOrder';
import { LandingBlock } from '../blocks/LandingBlock';
import { PaymentBlock } from '../blocks/PaymentBlock';
import { HexRemove } from '../../primitives/Icon';
import { EditorFrame } from '../../primitives/EditorFrame';
import { EditorPart } from '../../primitives/EditorPart';
import { addUnits, countOf, hasStructures, hasUnits, unitsIn } from '../../../domain/tactical';
import { Section } from '../../primitives/Section';
import { unitsText } from '../../units/unitsText';
import { systemTitle } from '../../map/systemName';
import { limitsSystem, ofSource, placeWarnings } from '../../feedback/warningPlaces';
import { WarningList } from '../../feedback/WarningText';
import { StepHints } from '../../feedback/StepHints';
import { MapPickButton } from '../../primitives/MapPickButton';
import { Vanishing } from '../../primitives/Vanishing';

export interface TacticalEditorProps {
  /** The table and the board just before the turn, as the kernel keeps them: names, notes, reminders and the places of warnings are read from it. */
  view: KernelView;
  pack: DataPack;
  /** The tactical turn being edited, and the writer of its changes: a changed turn is handed back whole. */
  turn: Turn;
  onChange: (turn: Turn) => void;
  warnings: Warning[];
  manualPayment: boolean;
  /** What the next tap on the map chooses. */
  choosing: 'system' | 'source' | null;
  onChoose: (what: 'system' | 'source' | null) => void;
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
  pack, view, turn, warnings, manualPayment, choosing, onChoose,
  onChange, onOpenPicker, leaving = [], onLeft, onManualPayment, onOpenShop, onOpenBattle, onOpenFleet, onDone, onRemove, common,
}: TacticalEditorProps) {
  const { t } = useTranslation();
  const { table, board } = view;
  const action = tacticalOf(turn);
  const target = action.system;
  const player = turn.player;
  const at = atOf(table, board, pack);
  const planets = target === null ? [] : planetsIn(table, board, pack, target).map(id => pack.planets[id]).filter((p): p is PlanetDef => p !== undefined);
  // The price asks the laws in play and the components this turn plays, as the replay does.
  const production = action.production?.units ?? {};
  const cost = productionDueOnBoard(table, board, pack, player, production, turn);
  const unitText = (units: UnitCounts): string => unitsText(units, t);
  const slotName = (slot: string): string => systemTitle(at.map, pack, slot, t);

  const sources = sourcesOf(at, action);
  /** A leaving source no longer counts: what the editor says without it stands from the start, so nothing jumps when it goes. */
  const untouched = isUntouched(leaving.reduce((rest, source) => withoutSource(at, rest, source), turn));
  /** A source in the list: its ships, then how much rides as cargo. */
  const sourceLine = (source: string): string => {
    const group = groupOf(at, action.movement, source);
    const { ships, cargo } = splitFlightOn(table, board, pack, player, unitsIn(group));
    // A structure taken on board rides with the cargo.
    const aboard = countOf(cargo) + group.reduce((sum, f) => sum + Object.values(f.structures ?? {}).reduce((n, count) => n + (count ?? 0), 0), 0);
    return `${unitText(ships) || t('plan.tactical.noShips')}${aboard > 0 ? t('plan.tactical.cargoShort', { n: aboard }) : ''}`;
  };

  const lost = spaceLossesOf(turn);
  const groundLost = groundLossesOf(turn);
  /** What the battle leaves, and the ground force types that arrived or are already assigned: only these can land. */
  const { left: here, landable } = afterBattle(pack, turn, board, UNIT_ORDER);
  /** The structures a flight brought into the space area: the action puts them on planets at its end. */
  const afloat = structuresArrived(turn, board);
  /** What the components in force let the landing offer beyond what the flights brought. */
  const offers = landingOffersOn(table, board, pack, player);
  const fromSources = offers.fromPlanets && target !== null ? commitSourcesOn(table, board, pack, player, target).map(source => ({ planet: pack.planets[source.planetId], units: source.units })).filter(source => source.planet) : [];
  const showLanding = planets.length > 0 && (landable.length > 0 || action.invasion.length > 0 || hasStructures(afloat) || fromSources.length > 0);

  const landedOn = (planetId: string, unit: UnitId): number => action.invasion.find(l => l.planet === planetId && l.from === undefined)?.units[unit] ?? 0;
  /** The ability that frees the price of the custodians token (Blood Ties): the payment is then not seeded. */
  const custodiansFree = custodiansFreeOn(table, board, pack, player);
  const custodiansAt = custodiansLanding(board, turn, pack);
  const [custodiansManual, setCustodiansManual] = useState(false);
  const setLanding = (planetId: string, unit: UnitId, count: number) => onChange(withCustodiansOn(table, board, pack, withLanding(turn, planetId, unit, count), custodiansFree));
  const lostAnywhere = unitText(Object.values(groundLost).reduce(addUnits, lost));

  const toggleManual = (open: boolean) => {
    onManualPayment(open);
    if (!open) onChange(withProductionPayment(turn, autoPayOn(table, board, pack, player, cost, 'resources')));
  };

  const placer = placeWarnings(warnings, { uses: turn.used.map(u => u.component) });
  const list = (shown: Warning[]) => <WarningList warnings={shown} table={table} board={board} pack={pack} />;
  /** The warnings of the flight from one source: its route and its cargo. */
  const flight = (source: string) => {
    const mine = (w: Warning) => ofSource(w, at.map, pack, movesOf(action), source);
    return [...placer.at('route', mine), ...placer.at('cargo', mine)];
  };
  const overall = placer.at('action');
  const removed = action.fleetRemovals ?? {};
  /** How many ships are still to remove, as the replay says of this action. */
  const stillOver = fleetExcessOf(table, pack, flightAt(table, board, pack, turn), player, standing(warnings)).over;
  const overFleet = standing(warnings).some(w => w.code === 'fleetPool' && w.params.systemId === target);
  const shipsTo = action.production?.shipsTo;
  const battleWarnings = placer.at('battle');
  const payment = action.production?.payment ?? { planets: [], tradeGoods: 0 };
  const tokens = poolsOf(board, player).tactic;
  /** The reminders of a step: what its players hold for it, under the block of the step. */
  const hints = (step: RuleStep) => {
    const players = stepPlayers(table, board, player, step, target, planets.map(p => p.id)).map(id => legacyKey(table, id));
    return <StepHints pack={pack} table={table} board={board} step={step} players={players} />;
  };

  const blocks = target !== null && (
        <>
          <Section>
            {untouched
              ? (
                <MapPickButton className="source-button" active={choosing === 'system'} onToggle={() => onChoose(choosing === 'system' ? null : 'system')}>
                  <strong>{t('plan.tactical.system', { name: slotName(target) })}</strong>
                </MapPickButton>
              )
              : <strong>{t('plan.tactical.system', { name: slotName(target) })}</strong>}
            <span className="muted">{action.free ? t('plan.tactical.freeToken') : t('plan.tactical.token', { from: tokens, to: tokens - 1 })}</span>
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
              const via = viaOf(action, source);
              const name = slotName(source);
              const own = flight(source);
              return (
                <Fragment key={source}>
                  <Vanishing className="source-row in-card" leaving={leaving.includes(source)} onGone={() => onLeft?.(source)}>
                    <button type="button" className="source-button" onClick={() => onOpenPicker(source)}>
                      {via.length > 0 ? t('plan.tactical.via', { name, list: via.map(slotName).join(', ') }) : name}
                      <small>{sourceLine(source)}</small>
                      {target !== null && <small>{t('plan.tactical.distance', { n: stepsOf(table, board, [source, ...via, target], pack) })}</small>}
                    </button>
                    <HexRemove label={t('plan.tactical.removeSource', { name })} onClick={() => onChange(withoutSource(at, turn, source))} />
                  </Vanishing>
                  {!leaving.includes(source) && list(own)}
                </Fragment>
              );
            })}
            {/* The capacity of the active system is left to the result of the action: the landing below changes it, and a line that comes and goes here would push the landing from under the finger. */}
            {list([...placer.at('route', w => !limitsSystem(w) || (action.movement.length > 0 && !(w.code === 'capacitySystem' && w.params.systemId === target))), ...placer.at('cargo')])}
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
                view={view} pack={pack} player={player} planets={planets} units={landable} arrived={here} lost={groundLost}
                landedOn={landedOn} onLand={setLanding}
                structures={hasStructures(afloat) || offers.structures.length > 0 || action.invasion.some(l => hasStructures(l.structures)) ? {
                  arrived: afloat, reinforced: offers.structures,
                  landedOn: (planetId: string, kind: StructureKind) => action.invasion.find(l => l.planet === planetId && l.from === undefined)?.structures?.[kind] ?? 0,
                  onLand: (planetId: string, kind: StructureKind, count: number) => onChange(withLandedStructure(turn, planetId, kind, count)),
                } : undefined}
                from={fromSources.length > 0 ? {
                  sources: fromSources,
                  landedFrom: (planetId: string, from: string, unit: UnitId) => landedFrom(action, planetId, from, unit),
                  onLandFrom: (planetId: string, from: string, unit: UnitId, count: number) => onChange(withLandingFrom(turn, planetId, from, unit, count)),
                } : undefined}
              />
              {custodiansAt !== undefined && (
                <PaymentBlock
                  label={t('plan.tactical.custodians')} need={CUSTODIANS_COST} kind="influence" payment={action.custodians ?? { planets: [], tradeGoods: 0 }}
                  view={view} player={player} pack={pack} manual={custodiansManual}
                  onManual={open => {
                    setCustodiansManual(open);
                    if (!open) onChange(withCustodiansSet(turn, autoPayOn(table, board, pack, player, CUSTODIANS_COST, 'influence')));
                  }}
                  onChange={custodiansPayment => onChange(withCustodiansSet(turn, custodiansPayment))}
                />
              )}
            </Section>
          )}
          {showLanding && hints('invasion')}

          {/* The limits of the system stand in the action's result; here only what the production itself breaks. */}
          <div className="source-row in-card">
            <button type="button" className="source-button" onClick={onOpenShop}>
              <span>{t('plan.tactical.production')}</span>{' '}
              <small>{hasUnits(production) ? unitText(production) : t('plan.tactical.productionOffer')}</small>
            </button>
          </div>
          {offers.shipsAway && Object.keys(production).some(unit => !pack.units[unit as UnitId]?.ground) && (
            <div className="segment choice-row" role="group" aria-label={t('plan.tactical.shipsTo')}>
              {[...new Set([...tokensOnMapOf(board, player).filter(slot => slot !== target), ...(shipsTo ? [shipsTo] : [])])].map(slot => (
                <button key={slot} type="button" aria-pressed={shipsTo === slot} onClick={() => onChange(withShipsTo(turn, shipsTo === slot ? undefined : slot))}>
                  {slotName(slot)}
                </button>
              ))}
            </div>
          )}
          {list(placer.at('production', w => !limitsSystem(w)))}
          {hints('production')}

          {(cost > 0 || payment.planets.length > 0 || payment.tradeGoods > 0) && (
            <PaymentBlock
              need={cost} payment={payment} view={view} player={player} pack={pack} manual={manualPayment}
              onManual={toggleManual} onChange={paid => onChange(withProductionPayment(turn, paid))}
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
