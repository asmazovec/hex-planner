import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { standing } from '../../domain/project';
import type { DataPack, Payment, UnitCounts, Warning } from '../../domain/types';
import { hasUnits } from '../../domain/tactical';
import type { Turn } from '../../game/actions';
import { flightOf as flightAt, metersOf } from '../../game/flight';
import { sourcesOf, tacticalOf, viaOf } from '../../game/edit/tactical';
import { atOf, flightLineOf, groundLossesOf, movesOf, spaceLossesOf } from '../../game/edit/tacticalRead';
import type { KernelView } from './kernelView';
import { flightOf as warningFlightOf, placeWarnings } from '../feedback/warningPlaces';
import { WarningList } from '../feedback/WarningText';
import { systemTitle } from '../map/systemName';
import { playerColour } from '../units/sprites';
import { UnitPictures } from '../units/UnitPictures';

export interface TacticalStepsProps {
  /** The table and the board just before the turn, as the kernel keeps them. */
  view: KernelView;
  pack: DataPack;
  turn: Turn;
  /** The turn's warnings about its flights; each stands in the flight it speaks of. */
  warnings?: Warning[];
}

/** What a tactical action plans, with no controls: what it activates, each flight along its line, then what happens on arrival. */
export function TacticalSteps({ view, pack, turn, warnings = [] }: TacticalStepsProps) {
  const { t } = useTranslation();
  const { table, board } = view;
  const action = tacticalOf(turn);
  const target = action.system;
  if (target === null) return null;
  const at = atOf(table, board, pack);
  const colour = playerColour(table.players.find(p => p.id === turn.player)?.color ?? 1);
  const name = (slot: string) => systemTitle(at.map, pack, slot, t);
  const pictures = (units: UnitCounts) => <UnitPictures units={units} colour={colour} />;
  const planetName = (id: string) => pack.planets[id]?.name ?? id;
  const paid = (payment: Payment | undefined) => {
    if (!payment || (payment.planets.length === 0 && payment.tradeGoods === 0)) return null;
    return t('plan.steps.paid', {
      list: [...payment.planets.map(planetName), ...(payment.tradeGoods > 0 ? [t('plan.steps.tradeGoods', { n: payment.tradeGoods })] : [])].join(', '),
    });
  };
  const landings = action.invasion.filter(landing => hasUnits(landing.units));
  const lost = [spaceLossesOf(turn), ...Object.values(groundLossesOf(turn))].filter(units => hasUnits(units));
  const built = action.production?.units ?? {};
  // What happens on arrival: battle losses, landings, then what is built there.
  const after: ReactNode[] = [];
  if (lost.length > 0) {
    after.push(<p key="lost" className="flight-after"><span className="flight-after-label">{t('plan.steps.losses')}</span>{lost.map((units, i) => <UnitPictures key={i} units={units} colour={colour} />)}</p>);
  }
  for (const landing of landings) {
    after.push(<p key={`land:${landing.planet}:${landing.from ?? ''}`} className="flight-after"><span className="flight-after-label">{t('plan.steps.landing', { planet: planetName(landing.planet) })}</span>{pictures(landing.units)}</p>);
  }
  if (hasUnits(built)) {
    after.push(<p key="build" className="flight-after"><span className="flight-after-label">{t('plan.steps.build')}</span>{pictures(built)}{paid(action.production?.payment) && <small>{paid(action.production?.payment)}</small>}</p>);
  }
  const sources = sourcesOf(at, action);
  const flight = flightAt(table, board, pack, turn);
  const places = { type: 'tactical', moves: movesOf(action) };
  return (
    <div className="entry-steps entry-flights">
      <p className="flight-activate">
        <span>{t('plan.steps.activate', { name: name(target) })}</span>
        <small>{action.free ? t('plan.steps.free') : t('plan.steps.token')}</small>
      </p>
      {sources.map((source, index) => {
        const { ships, board: aboard, stops } = flightLineOf(table, board, pack, turn, source);
        const via = viaOf(action, source);
        const { group: load } = metersOf(table, pack, flight, turn.player, source);
        // What rides with the ships is said by the cargo, the rest of the flight by its start.
        const placer = placeWarnings(warnings.filter(w => warningFlightOf(w, at.map, pack, places) === source));
        const cargoWarnings = placer.at('cargo');
        const startWarnings = placer.rest();
        const over = standing(cargoWarnings).length > 0;
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
                {hasUnits(aboard) && <span className="stop-take"><span className="stop-name">{t('plan.steps.board', { name: name(source) })}</span>{pictures(aboard)}</span>}
                {via.map(slot => {
                  const taken = stops.get(slot);
                  return taken && hasUnits(taken)
                    ? <span key={slot} className="stop-take"><span className="stop-name">{t('plan.steps.pickup', { name: name(slot) })}</span>{pictures(taken)}</span>
                    : null;
                })}
                <WarningList variant="row" warnings={startWarnings} table={table} board={board} pack={pack} />
              </li>
              <li className="stop stop-target">
                <span className="stop-name">{name(target)}</span>
                {load.load > 0 && <span className="stop-name">{t('plan.steps.cargo', { load: load.load, capacity: load.capacity })}</span>}
                <WarningList variant="row" warnings={cargoWarnings} table={table} board={board} pack={pack} />
                {last && after.length > 0 && <div className="stop-after">{after}</div>}
              </li>
            </ol>
          </section>
        );
      })}
      {sources.length === 0 && after}
    </div>
  );
}
