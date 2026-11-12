import { useTranslation } from 'react-i18next';
import { pickupAllowed, routeSteps, systemPlanets, tacticalMeters } from '../../../domain/project';
import type { TokenKind } from '../../../domain/hexLayout';
import type { DataPack, Game, GameState, PlanetDef, StructureKind, UnitId, Warning } from '../../../domain/types';
import { playerColour } from '../../units/sprites';
import { layoutFor, UnitDraft, type UnitDraftItem, type UnitDraftRow } from '../../units/UnitDraft';
import { PlanetBadge, SpaceBadge } from '../../map/PlanetBadge';
import { EditorFrame } from '../../primitives/EditorFrame';
import { UNIT_ORDER } from '../../units/unitOrder';
import { availableFor, fliesNow, groupOf, hasCargo, pickedFrom, pickedStructures, structuresFor, viaOf, withStructureCount, withUnitCount, withoutSource, type Move, type TacticalEntry } from '../../../domain/tactical';
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

const STRUCTURES: StructureKind[] = ['pds', 'spacedock'];
const isStructure = (kind: TokenKind): kind is StructureKind => kind === 'pds' || kind === 'spacedock';

/** More places than this stand as a number: the row never wraps, so nothing under it moves. */
const PIPS_SHOWN = 16;

/** A hexagon per place on board, filled for load, red past capacity; the row is there with no places too. */
function CargoPips({ load, capacity }: { load: number; capacity: number }) {
  const all = Math.max(load, capacity);
  const shown = all > PIPS_SHOWN ? PIPS_SHOWN - 1 : all;
  return (
    <div className="pips" aria-hidden="true">
      {Array.from({ length: shown }, (_, i) => (
        <svg key={i} width="14" height="13" viewBox="-7 -6.5 14 13">
          <polygon points="6.4,0 3.2,5.6 -3.2,5.6 -6.4,0 -3.2,-5.6 3.2,-5.6" className={`pip${i < load ? ' pip-full' : ''}${i >= capacity ? ' pip-over' : ''}`} />
        </svg>
      ))}
      {all > shown && <span className={load > capacity ? 'pips-more pips-over' : 'pips-more'}>+{all - shown}</span>}
    </div>
  );
}

/**
 * The flight of one source, a step of the tactical editor that stands alone in the panel: who flies, what rides on board,
 * what is taken from each system on the way. Its cross removes the route. Nothing is chosen at first; limits warn, never forbid.
 * Every place a unit is taken from is a row of a `UnitDraft`: a button to take per kind, and the tray of what was taken.
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
  const unitName = (unit: TokenKind) => t(`unit.${unit}`);
  const pickedOf = (from: string, kind: StructureKind): number => pickedStructures(group, from, kind);
  /** The structures that stand at a place, less what the other routes take: they are offered like any cargo, and the rules warn (85.3). */
  const standingAt = (from: string, kind: StructureKind): number => structuresFor(game, pack, before, entry, source, from, kind);

  const noShipsHere = flying.every(u => available(source, u) + picked(source, u) <= 0);
  const offered = flying.filter(u => available(source, u) > 0 || picked(source, u) > 0);
  const { group: load, ships, fleet } = tacticalMeters(game, entry, source, before, pack);

  /**
   * The places of a system to take cargo from: its space area and its planets, only what stands there. Where my command
   * token lies the units are still offered: the rules warn (95.3), and an ability may allow it.
   */
  const placesIn = (slot: string): { from: string; planet: PlanetDef | null; units: TokenKind[] }[] => {
    const planets = systemPlanets(game, slot, pack);
    const offeredAt = (from: string, kinds: UnitId[]) => kinds.filter(u => available(from, u) > 0 || picked(from, u) > 0);
    const ground = known.filter(u => pack.units[u]?.ground);
    // Structures stand in the row of their place only where there are any: on a planet, or in the space area they were carried to.
    const structuresAt = (from: string) => STRUCTURES.filter(kind => standingAt(from, kind) > 0 || pickedOf(from, kind) > 0);
    const places = [
      { from: slot, planet: null, units: [...offeredAt(slot, cargo), ...structuresAt(slot)] },
      ...planets.map(planet => ({ from: planet.id, planet, units: [...offeredAt(planet.id, ground), ...structuresAt(planet.id)] })),
    ];
    return places.filter(place => place.units.length > 0);
  };

  const item = (from: string, unit: TokenKind): UnitDraftItem => ({
    kind: unit,
    ...(isStructure(unit)
      ? { picked: pickedOf(from, unit), left: standingAt(from, unit) - pickedOf(from, unit) }
      : { picked: picked(from, unit), left: available(from, unit) - picked(from, unit) }),
    takeLabel: t('plan.picker.take', { unit: unitName(unit) }), returnLabel: t('plan.picker.put', { unit: unitName(unit) }),
  });
  const change = (from: string, kind: TokenKind, by: 1 | -1) => (isStructure(kind)
    ? onChange(withStructureCount(game, pack, entry.moves, source, from, kind, pickedOf(from, kind) + by))
    : setCount(from, kind, picked(from, kind) + by));
  const draft = (rows: UnitDraftRow[], pickedLabel: string) => (
    <UnitDraft
      rows={rows} colour={colour} stockLabel={t('plan.picker.stock')} pickedLabel={pickedLabel}
      onTake={(from, unit) => change(from, unit, 1)}
      onReturn={(from, unit) => change(from, unit, -1)}
    />
  );
  const badge = (planet: PlanetDef | null) => (planet
    ? <PlanetBadge planet={planet} control={before.control[planet.id]} exhausted={before.exhausted.includes(planet.id)} compact />
    : <SpaceBadge label={t('draft.space')} />);

  const line = (slot: string, role: 'start' | 'transit') => {
    const places = placesIn(slot);
    return (
      <li key={slot} className="stop">
        <span className="stop-name">{systemTitle(game, pack, slot, t)} · {t(`plan.picker.${role}`)}</span>
        {!pickupAllowed(before, target, slot) && <span className="muted">{t('plan.picker.tokenHere')}</span>}
        {places.length === 0 && <span className="muted">{t('plan.picker.nothing')}</span>}
        {places.length > 0 && draft(places.map(place => ({
          id: place.from, layout: layoutFor(place.units.length), label: place.planet?.name ?? systemName(game, pack, slot), place: badge(place.planet), items: place.units.map(unit => item(place.from, unit)),
        })), t('plan.picker.loaded'))}
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
        <SectionTitle as="h4" className="picker-title">{t('plan.picker.flying')}</SectionTitle>
        {offered.length > 0 && draft([{
          id: source, layout: 'vertical', label: t('draft.space'), place: badge(null), items: offered.map(unit => item(source, unit)),
        }], t('plan.picker.flying'))}
        {noShipsHere && <p className="muted picker-note">{t('plan.picker.emptySource')}</p>}
      </div>

      <div className="editor-section">
        <SectionTitle as="h4" className="picker-title">{t('plan.picker.cargo', { load: load.load, capacity: load.capacity })}</SectionTitle>
        {/* The places on board stand once, above the stops; their row and the line under it are there from the start. */}
        <CargoPips load={load.load} capacity={load.capacity} />
        <span className="muted cargo-note">{Math.max(load.load, load.capacity) === 0 ? t('plan.picker.noRoom') : ''}</span>
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

      <button type="button" className="primary" disabled={!group.some(hasCargo)} onClick={onFly}>{t('plan.picker.fly')}</button>
    </EditorFrame>
  );
}
