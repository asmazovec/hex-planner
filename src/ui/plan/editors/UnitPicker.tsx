import { useTranslation } from 'react-i18next';
import { pickupAllowed, routeSteps, systemPlanets, tacticalMeters } from '../../../domain/project';
import type { DataPack, Game, GameState, UnitId, Warning } from '../../../domain/types';
import { playerColour } from '../../units/sprites';
import { UnitTile } from '../../units/UnitTile';
import { EditorFrame } from '../../primitives/EditorFrame';
import { UNIT_ORDER } from '../../units/unitOrder';
import { availableFor, fliesNow, groupOf, hasUnits, pickedFrom, viaOf, withUnitCount, withoutSource, type Move, type TacticalEntry } from '../../../domain/tactical';
import { systemName, systemTitle } from '../../map/systemName';
import { limitsSystem, ofSource, placeWarnings } from '../../feedback/warningPlaces';
import { WarningList } from '../../feedback/WarningText';
import { SectionTitle } from '../../primitives/SectionTitle';

export interface UnitPickerProps {
  game: Game;
  pack: DataPack;
  /** The state just before the entry. */
  before: GameState;
  /** Only the moves of `source` are edited here. */
  entry: TacticalEntry;
  source: string;
  /** What is wrong with this flight: over the cargo by the cargo, the rest by the fleet line. */
  warnings?: Warning[];
  onChange: (moves: Move[]) => void;
  /** Back to the editor. */
  onClose: () => void;
  onFly: () => void;
}

/** The warnings of one flight: its route and its cargo, and the limits of the system it flies to. */
export function flightWarnings(warnings: Warning[], game: Game, pack: DataPack, entry: TacticalEntry, source: string): Warning[] {
  const placer = placeWarnings(warnings);
  const mine = (w: Warning) => limitsSystem(w) || ofSource(w, game, pack, entry.moves, source);
  return [...placer.at('route', mine), ...placer.at('cargo', mine)];
}

/** A hexagon per place on board, filled for load, red past capacity. */
function CargoPips({ load, capacity }: { load: number; capacity: number }) {
  return (
    <div className="pips" aria-hidden="true">
      {Array.from({ length: Math.max(load, capacity) }, (_, i) => (
        <svg key={i} width="14" height="13" viewBox="-7 -6.5 14 13">
          <polygon points="6.4,0 3.2,5.6 -3.2,5.6 -6.4,0 -3.2,-5.6 3.2,-5.6" className={`pip${i < load ? ' pip-full' : ''}${i >= capacity ? ' pip-over' : ''}`} />
        </svg>
      ))}
    </div>
  );
}

/**
 * The flight of one source, a step of the tactical editor that stands alone in the panel: who flies, what rides on board,
 * what is taken from each system on the way. Its cross removes the route. Nothing is chosen at first; limits warn, never forbid.
 * A unit to take keeps its tile and its place down to the last one, where the tile only goes dim: a tile that left would
 * bring another one under the finger.
 */
export function UnitPicker({ game, pack, before, entry, source, warnings = [], onChange, onClose, onFly }: UnitPickerProps) {
  const { t } = useTranslation();
  const colour = playerColour(game.color);
  const target = entry.systemId ?? '';
  const group = groupOf(game, pack, entry.moves, source);
  const known = UNIT_ORDER.filter(u => pack.units[u]);
  const flying = known.filter(u => fliesNow(game, pack, before.holdings, u));
  const cargo = known.filter(u => !flying.includes(u));
  // What rides with the ships stands by the cargo, the rest of the flight under its line.
  const placer = placeWarnings(warnings);
  const cargoWarnings = placer.at('cargo');

  const picked = (from: string, unit: UnitId): number => pickedFrom(group, from, unit);
  /** What stands there, less what the other routes of this action take. */
  const available = (from: string, unit: UnitId): number => availableFor(game, pack, before, entry, source, from, unit);
  const setCount = (from: string, unit: UnitId, count: number) => onChange(withUnitCount(game, pack, entry.moves, source, from, unit, count));
  const unitName = (unit: UnitId) => t(`unit.${unit}`);

  const noShipsHere = flying.every(u => available(source, u) + picked(source, u) <= 0);
  const offered = flying.filter(u => available(source, u) > 0 || picked(source, u) > 0);
  const flyingNow = flying.filter(u => picked(source, u) > 0);
  const { group: load, ships, fleet } = tacticalMeters(game, entry, source, before, pack);

  /**
   * The places of a system to take cargo from: its space area and its planets, only what stands there. Where my command
   * token lies the units are still offered: the rules warn (95.3), and an ability may allow it.
   */
  const placesIn = (slot: string): { from: string; name: string | null; units: UnitId[] }[] => {
    const planets = systemPlanets(game, slot, pack);
    const offeredAt = (from: string, kinds: UnitId[]) => kinds.filter(u => available(from, u) > 0 || picked(from, u) > 0);
    const ground = known.filter(u => pack.units[u]?.ground);
    const places = [
      { from: slot, name: null, units: offeredAt(slot, cargo) },
      ...planets.map(planet => ({ from: planet.id, name: planet.name, units: offeredAt(planet.id, ground) })),
    ];
    return places.filter(place => place.units.length > 0);
  };

  /** One to take from a place: the tile stays with nothing left, so the next tap finds it where it was. */
  const take = (from: string, unit: UnitId) => {
    const left = Math.max(0, available(from, unit) - picked(from, unit));
    return (
      <UnitTile
        key={unit} variant="take" kind={unit} count={left} colour={colour} showOne={left === 0} disabled={left === 0}
        label={t('plan.picker.take', { unit: unitName(unit) })} onClick={() => setCount(from, unit, picked(from, unit) + 1)}
      />
    );
  };
  const taken = (from: string, unit: UnitId) => (
    <UnitTile
      key={`${unit}-taken`} variant="taken" kind={unit} count={picked(from, unit)} colour={colour}
      label={t('plan.picker.put', { unit: unitName(unit) })} onClick={() => setCount(from, unit, picked(from, unit) - 1)}
    />
  );

  const line = (slot: string, role: 'start' | 'transit') => {
    const places = placesIn(slot);
    return (
      <li key={slot} className="stop">
        <span className="stop-name">{systemTitle(game, pack, slot, t)} · {t(`plan.picker.${role}`)}</span>
        {!pickupAllowed(before, target, slot) && <span className="muted">{t('plan.picker.tokenHere')}</span>}
        {places.length === 0 && <span className="muted">{t('plan.picker.nothing')}</span>}
        {places.map(place => (
          <div key={place.from} className="stop-place" role="group" aria-label={place.name ?? systemName(game, pack, slot)}>
            {place.name && <small>{place.name}</small>}
            <div className="pics">
              {place.units.map(unit => take(place.from, unit))}
              {place.units.filter(unit => picked(place.from, unit) > 0).map(unit => taken(place.from, unit))}
            </div>
          </div>
        ))}
      </li>
    );
  };

  return (
    <EditorFrame
      className="unit-picker" title={t('plan.picker.title', { from: systemTitle(game, pack, source, t), to: systemTitle(game, pack, target, t) })}
      onBack={onClose} removeLabel={t('plan.picker.removeSource')}
      onRemove={() => { onChange(withoutSource(game, pack, entry.moves, source)); onClose(); }}
    >
      <small className="picker-distance">{t('plan.tactical.distance', { n: routeSteps(game, [source, ...viaOf(entry, source), target], pack) })}</small>

      <div className="editor-section">
        <SectionTitle as="h4" className="picker-title">{t('plan.picker.inSystem', { name: systemTitle(game, pack, source, t) })}</SectionTitle>
        <div className="pics">
          {offered.map(unit => take(source, unit))}
        </div>
        {noShipsHere && <p className="muted picker-note">{t('plan.picker.emptySource')}</p>}

        <SectionTitle as="h4" className="picker-title">{t('plan.picker.flying')}</SectionTitle>
        <div className="pics">
          {flyingNow.map(unit => taken(source, unit))}
          {flyingNow.length === 0 && <span className="muted">{t('plan.picker.nobody')}</span>}
        </div>
      </div>

      <div className="editor-section">
        <SectionTitle as="h4" className="picker-title">{t('plan.picker.cargo', { load: load.load, capacity: load.capacity })}</SectionTitle>
        <CargoPips load={load.load} capacity={load.capacity} />
        {Math.max(load.load, load.capacity) === 0 && <span className="muted">{t('plan.picker.noRoom')}</span>}
        <ol className="stops">
          {line(source, 'start')}
          {viaOf(entry, source).map(slot => line(slot, 'transit'))}
          <li className="stop stop-target"><span className="stop-name">{systemTitle(game, pack, target, t)} · {t('plan.picker.target')}</span></li>
        </ol>
        {/* Under the stops: a warning above them would push the cargo from under the finger. */}
        <WarningList warnings={cargoWarnings} game={game} pack={pack} />
      </div>

      {/* Over the limit the warning below says it, in the look of every warning. */}
      {ships <= fleet && <p className="picker-fleet muted">{t('plan.picker.fleet', { ships, fleet })}</p>}
      <WarningList warnings={placer.rest()} game={game} pack={pack} />

      <button type="button" className="primary" disabled={!group.some(m => hasUnits(m.units))} onClick={onFly}>{t('plan.picker.fly')}</button>
    </EditorFrame>
  );
}
