import { useTranslation } from 'react-i18next';
import { capacity, shipCount } from '../../domain/project';
import type { DataPack, Game, GameState, UnitCounts, UnitId } from '../../domain/types';
import { UNIT_ORDER } from '../map/UnitGlyph';
import { Stepper } from './Stepper';
import { addUnits, hasUnits, sourcePools, sourceSlot, systemName, withCount, type Move } from './tactical';

export interface UnitPickerProps {
  game: Game;
  pack: DataPack;
  /** The state just before the entry. */
  before: GameState;
  target: string;
  source: string;
  /** All moves of the entry; only those of `source` are edited here. */
  moves: Move[];
  onChange: (moves: Move[]) => void;
  onClose: () => void;
}

function Meter({ text, value, max }: { text: string; value: number; max: number }) {
  const width = max > 0 ? Math.min(100, (value / max) * 100) : value > 0 ? 100 : 0;
  return (
    <div className={value > max ? 'meter-over' : undefined}>
      <span>{text}</span>
      <div className="meter-bar"><span style={{ width: `${width}%` }} /></div>
    </div>
  );
}

/** Units going from one source to the active system, with live capacity and fleet meters. Limits warn, never forbid. */
export function UnitPicker({ game, pack, before, target, source, moves, onChange, onClose }: UnitPickerProps) {
  const { t } = useTranslation();
  const pools = sourcePools(game, pack, before, source);
  const picked = (from: string): UnitCounts => moves.find(m => m.from === from)?.units ?? {};
  const unitsIn = (list: Move[]): UnitCounts => list.reduce((sum, m) => addUnits(sum, m.units), {} as UnitCounts);

  const setCount = (from: string, unit: UnitId, count: number) => {
    const units = withCount(picked(from), unit, count);
    const known = moves.some(m => m.from === from);
    const next = known ? moves.map(m => (m.from === from ? { from, units } : m)) : [...moves, { from, units }];
    onChange(next.filter(m => hasUnits(m.units)));
  };

  const ofSource = moves.filter(m => sourceSlot(game, pack, m.from) === source);
  const group = capacity(unitsIn(ofSource), pack);
  const shipsThere = shipCount(addUnits(before.systems[target] ?? {}, unitsIn(moves)), pack);
  const nothingHere = pools.every(p => !hasUnits(p.available) && !hasUnits(picked(p.from)));

  return (
    <div className="editor-section unit-picker">
      <div className="panel-head">
        <strong>{t('plan.picker.title', { from: systemName(game, pack, source), to: systemName(game, pack, target) })}</strong>
        <button type="button" onClick={onClose}>{t('plan.picker.close')}</button>
      </div>
      {nothingHere && <p className="muted">{t('plan.picker.empty')}</p>}
      {pools.map(pool => {
        const units = UNIT_ORDER.filter(u => (pool.available[u] ?? 0) > 0 || (picked(pool.from)[u] ?? 0) > 0);
        const rows = units.map(unit => (
          <Stepper
            key={unit} name={t(`unit.${unit}`)} value={picked(pool.from)[unit] ?? 0} of={pool.available[unit] ?? 0} min={0}
            onChange={count => setCount(pool.from, unit, count)}
          />
        ));
        if (pool.name === null) return rows;
        return <div key={pool.from} role="group" aria-label={pool.name}><strong>{pool.name}</strong>{rows}</div>;
      })}
      <Meter text={t('plan.picker.capacity', { load: group.load, capacity: group.capacity })} value={group.load} max={group.capacity} />
      <Meter text={t('plan.picker.fleet', { ships: shipsThere, fleet: before.fleet })} value={shipsThere} max={before.fleet} />
      {ofSource.length > 0 && (
        <button type="button" onClick={() => { onChange(moves.filter(m => !ofSource.includes(m))); onClose(); }}>
          {t('plan.picker.removeSource')}
        </button>
      )}
    </div>
  );
}
