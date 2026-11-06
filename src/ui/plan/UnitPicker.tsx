import { useTranslation } from 'react-i18next';
import { systemPlanets, tacticalMeters } from '../../domain/project';
import type { DataPack, Game, GameState, UnitId } from '../../domain/types';
import { playerColour } from '../units/sprites';
import { TokenPicture } from '../units/UnitToken';
import { UNIT_ORDER } from '../units/unitOrder';
import { fliesNow, groupOf, hasUnits, systemName, viaOf, withUnitCount, withoutSource, type Move, type TacticalEntry } from './tactical';

export interface UnitPickerProps {
  game: Game;
  pack: DataPack;
  /** The state just before the entry. */
  before: GameState;
  /** Only the moves of `source` are edited here. */
  entry: TacticalEntry;
  source: string;
  onChange: (moves: Move[]) => void;
  onClose: () => void;
  onFly: () => void;
}

const PICTURE_PX = 58;

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

function UnitButton({ unit, count, colour, label, taken, onClick }: { unit: UnitId; count: number; colour: string; label: string; taken?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`pic${taken ? ' pic-taken' : ''}`} aria-label={label} onClick={onClick}>
      <TokenPicture kind={unit} colour={colour} px={PICTURE_PX} />
      {count !== 1 && <i>{count}</i>}
    </button>
  );
}

/** The flight of one source, approved in the prototype: who flies, what rides on board, what is taken from each system on the way. Nothing is chosen at first; limits warn, never forbid. */
export function UnitPicker({ game, pack, before, entry, source, onChange, onClose, onFly }: UnitPickerProps) {
  const { t } = useTranslation();
  const colour = playerColour(game.color);
  const target = entry.systemId ?? '';
  const group = groupOf(game, pack, entry.moves, source);
  const known = UNIT_ORDER.filter(u => pack.units[u]);
  const flying = known.filter(u => fliesNow(game, pack, before.upgrades, u));
  const cargo = known.filter(u => !flying.includes(u));

  const picked = (from: string, unit: UnitId): number =>
    group.filter(m => m.from === from).reduce((sum, m) => sum + (m.units[unit] ?? 0), 0);
  /** What stands there, less what the other routes of this action take. */
  const available = (from: string, unit: UnitId): number => {
    const pool = from in pack.planets ? before.ground[from] : before.systems[from];
    const elsewhere = entry.moves.filter(m => m.from === from && !group.includes(m)).reduce((sum, m) => sum + (m.units[unit] ?? 0), 0);
    return (pool?.[unit] ?? 0) - elsewhere;
  };
  const setCount = (from: string, unit: UnitId, count: number) => onChange(withUnitCount(game, pack, entry.moves, source, from, unit, count));
  const unitName = (unit: UnitId) => t(`unit.${unit}`);

  const noShipsHere = flying.every(u => available(source, u) <= 0);
  const offered = noShipsHere ? flying : flying.filter(u => available(source, u) - picked(source, u) > 0);
  const flyingNow = flying.filter(u => picked(source, u) > 0);
  const { group: load, ships, fleet } = tacticalMeters(game, entry, source, before, pack);

  /** The places of a system to take cargo from: its space area and its planets. An empty source offers ground units on its first planet. */
  const placesOf = (slot: string): { from: string; name: string | null; units: UnitId[] }[] => {
    const planets = systemPlanets(game, slot, pack);
    const ahead = slot === source && noShipsHere;
    const offeredAt = (from: string, kinds: UnitId[]) => kinds.filter(u => available(from, u) > 0 || picked(from, u) > 0);
    const groundAhead = known.filter(u => pack.units[u]?.ground);
    const places = [
      { from: slot, name: null, units: ahead ? (planets.length > 0 ? cargo.filter(u => !groundAhead.includes(u)) : cargo) : offeredAt(slot, cargo) },
      ...planets.map((planet, i) => ({
        from: planet.id, name: planet.name, units: ahead && i === 0 ? groundAhead : offeredAt(planet.id, groundAhead),
      })),
    ];
    return places.filter(place => place.units.length > 0);
  };

  const line = (slot: string, role: 'start' | 'transit') => {
    const places = placesOf(slot);
    return (
      <li key={slot} className="stop">
        <span className="stop-name">{systemName(game, pack, slot)} · {t(`plan.picker.${role}`)}</span>
        {places.length === 0 && <span className="muted">{t('plan.picker.nothing')}</span>}
        {places.map(place => (
          <div key={place.from} className="stop-place" role="group" aria-label={place.name ?? systemName(game, pack, slot)}>
            {place.name && <small>{place.name}</small>}
            <div className="pics">
              {place.units.map(unit => {
                const got = picked(place.from, unit);
                const left = available(place.from, unit) - got;
                return (
                  <span key={unit} className="pic-pair">
                    {(left > 0 || (got === 0 && left === 0)) && (
                      <UnitButton unit={unit} count={left} colour={colour} label={t('plan.picker.take', { unit: unitName(unit) })} onClick={() => setCount(place.from, unit, got + 1)} />
                    )}
                    {got > 0 && (
                      <UnitButton unit={unit} count={got} colour={colour} taken label={t('plan.picker.put', { unit: unitName(unit) })} onClick={() => setCount(place.from, unit, got - 1)} />
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </li>
    );
  };

  return (
    <div className="editor-section unit-picker">
      <div className="panel-head">
        <strong>{t('plan.picker.title', { from: systemName(game, pack, source), to: systemName(game, pack, target) })}</strong>
        <button type="button" onClick={onClose}>{t('plan.picker.close')}</button>
      </div>

      <h4 className="picker-title">{t('plan.picker.inSystem', { name: systemName(game, pack, source) })}</h4>
      <div className="pics">
        {offered.map(unit => {
          const got = picked(source, unit);
          return (
            <UnitButton
              key={unit} unit={unit} count={Math.max(0, available(source, unit) - got)} colour={colour}
              label={t('plan.picker.take', { unit: unitName(unit) })} onClick={() => setCount(source, unit, got + 1)}
            />
          );
        })}
        {offered.length === 0 && <span className="muted">{t('plan.picker.allFlying')}</span>}
      </div>
      {noShipsHere && <p className="muted picker-note">{t('plan.picker.emptySource')}</p>}

      <h4 className="picker-title">{t('plan.picker.flying')}</h4>
      <div className="pics">
        {flyingNow.map(unit => {
          const got = picked(source, unit);
          return (
            <UnitButton
              key={unit} unit={unit} count={got} colour={colour} taken
              label={t('plan.picker.put', { unit: unitName(unit) })} onClick={() => setCount(source, unit, got - 1)}
            />
          );
        })}
        {flyingNow.length === 0 && <span className="muted">{t('plan.picker.nobody')}</span>}
      </div>

      <h4 className={`picker-title${load.load > load.capacity ? ' meter-over' : ''}`}>{t('plan.picker.cargo', { load: load.load, capacity: load.capacity })}</h4>
      <CargoPips load={load.load} capacity={load.capacity} />
      {Math.max(load.load, load.capacity) === 0 && <span className="muted">{t('plan.picker.noRoom')}</span>}

      <ol className="stops">
        {line(source, 'start')}
        {viaOf(entry, source).map(slot => line(slot, 'transit'))}
        <li className="stop stop-target"><span className="stop-name">{systemName(game, pack, target)} · {t('plan.picker.target')}</span></li>
      </ol>

      <p className={`picker-fleet${ships > fleet ? ' meter-over' : ' muted'}`}>{t('plan.picker.fleet', { ships, fleet })}</p>

      <div className="picker-foot">
        <button type="button" onClick={() => { onChange(withoutSource(game, pack, entry.moves, source)); onClose(); }}>{t('plan.picker.removeSource')}</button>
        <button type="button" className="primary" disabled={!group.some(m => hasUnits(m.units))} onClick={onFly}>{t('plan.picker.fly')}</button>
      </div>
    </div>
  );
}
