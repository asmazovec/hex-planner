import { useTranslation } from 'react-i18next';
import { autoPay } from '../../domain/payment';
import { productionCost, sourceSlot, systemPlanets } from '../../domain/project';
import type { DataPack, Game, GameState, UnitCounts, UnitId, Warning } from '../../domain/types';
import { UNIT_ORDER } from '../units/unitOrder';
import { PaymentBlock } from './PaymentBlock';
import { Stepper } from './Stepper';
import { addUnits, hasUnits, systemName, withCount, type TacticalEntry } from './tactical';
import { UnitPicker } from './UnitPicker';
import { WarningText } from './WarningText';

export interface TacticalEditorProps {
  game: Game;
  pack: DataPack;
  entry: TacticalEntry;
  /** The state just before the entry. */
  before: GameState;
  warnings: Warning[];
  addingSource: boolean;
  pickerFrom: string | null;
  manualPayment: boolean;
  onUpdate: (patch: Partial<TacticalEntry>) => void;
  onAddSource: () => void;
  onOpenPicker: (source: string | null) => void;
  onManualPayment: (open: boolean) => void;
  onDone: () => void;
}

/** The whole tactical action on one screen: system, arrows and units, optional landing and build, payment, warnings. */
export function TacticalEditor({
  game, pack, entry, before, warnings, addingSource, pickerFrom, manualPayment,
  onUpdate, onAddSource, onOpenPicker, onManualPayment, onDone,
}: TacticalEditorProps) {
  const { t } = useTranslation();
  const target = entry.systemId;
  const planets = target === null ? [] : systemPlanets(game, target, pack);
  const hasDock = planets.some(p => game.docks.includes(p.id));
  const cost = productionCost(entry.production, pack);
  const unitsIn = (list: { units: UnitCounts }[]): UnitCounts =>
    list.reduce((sum, item) => addUnits(sum, item.units), {} as UnitCounts);
  const unitText = (units: UnitCounts): string =>
    UNIT_ORDER.filter(u => (units[u] ?? 0) > 0).map(u => `${t(`unit.${u}`)} ${units[u]}`).join(', ');

  const sources = [...new Set(entry.moves.map(m => sourceSlot(game, pack, m.from)))]
    .filter((s): s is string => s !== null);

  const groundUnits = (['infantry', 'mech'] as UnitId[]).filter(u => pack.units[u]);
  const here = addUnits(before.systems[target ?? ''] ?? {}, unitsIn(entry.moves));
  const toLand: UnitCounts = {};
  const landed = unitsIn(entry.landings);
  for (const unit of groundUnits) {
    const left = (here[unit] ?? 0) - (landed[unit] ?? 0);
    if (left !== 0) toLand[unit] = left;
  }

  const setLanding = (planetId: string, unit: UnitId, count: number) => {
    const current = entry.landings.find(l => l.planetId === planetId)?.units ?? {};
    const rest = entry.landings.filter(l => l.planetId !== planetId);
    const units = withCount(current, unit, count);
    onUpdate({ landings: hasUnits(units) ? [...rest, { planetId, units }] : rest });
  };

  /** The payment follows the cost in the same edit, so one undo reverts both. */
  const setProduction = (production: UnitCounts) => {
    const nextCost = productionCost(production, pack);
    const seed = !manualPayment && nextCost !== cost;
    onUpdate(seed ? { production, payment: autoPay(before, nextCost, 'resources', pack) } : { production });
  };

  const toggleManual = (open: boolean) => {
    onManualPayment(open);
    if (!open) onUpdate({ payment: autoPay(before, cost, 'resources', pack) });
  };

  return (
    <div className="tactical-editor panel-stack">
      <div className="panel-head">
        <h2>{t('plan.tactical.title')}</h2>
        <button type="button" className="primary" onClick={onDone}>{t('plan.tactical.done')}</button>
      </div>

      {target !== null && (
        <>
          <div className="editor-section">
            <strong>{t('plan.tactical.system', { name: systemName(game, pack, target) })}</strong>
            <span className="muted">{t('plan.tactical.token', { from: before.tactic, to: before.tactic - 1 })}</span>
          </div>

          <div className="editor-section">
            <strong>{t('plan.tactical.moves')}</strong>
            <span className="muted">{t('plan.tactical.moveHint')}</span>
            <button type="button" aria-pressed={addingSource} onClick={onAddSource}>{t('plan.tactical.addSource')}</button>
            {sources.filter(s => s !== pickerFrom).map(source => (
              <button key={source} type="button" className="source-button" onClick={() => onOpenPicker(source)}>
                {systemName(game, pack, source)}: {unitText(unitsIn(entry.moves.filter(m => sourceSlot(game, pack, m.from) === source)))}
              </button>
            ))}
          </div>

          {pickerFrom !== null && (
            <UnitPicker
              game={game} pack={pack} before={before} entry={entry} source={pickerFrom}
              onChange={moves => onUpdate({ moves })} onClose={() => onOpenPicker(null)}
            />
          )}

          <details className="editor-section" open={entry.landings.length > 0 || hasUnits(toLand) || undefined}>
            <summary>{t('plan.tactical.landing')}</summary>
            {planets.length === 0 && <p className="muted">{t('plan.tactical.noPlanets')}</p>}
            {planets.length > 0 && (
              <span className="muted">
                {t('plan.tactical.toLand', { list: unitText(toLand) || t('plan.tactical.nothingToLand') })}
              </span>
            )}
            {planets.map(planet => (
              <div key={planet.id} role="group" aria-label={t('plan.tactical.landingOn', { planet: planet.name })}>
                <strong>{planet.name}</strong>
                {groundUnits.map(unit => (
                  <Stepper
                    key={unit} name={t(`unit.${unit}`)} min={0}
                    value={entry.landings.find(l => l.planetId === planet.id)?.units[unit] ?? 0}
                    onChange={count => setLanding(planet.id, unit, count)}
                  />
                ))}
              </div>
            ))}
          </details>

          {!hasDock && <p className="editor-section muted">{t('plan.tactical.noDock')}</p>}
          {hasDock && (
            <details className="editor-section" open={cost > 0 || undefined}>
              <summary>{t('plan.tactical.production')}</summary>
              <div role="group" aria-label={t('plan.tactical.build')}>
                {UNIT_ORDER.filter(u => pack.units[u]).map(unit => (
                  <Stepper
                    key={unit} name={t(`unit.${unit}`)} value={entry.production[unit] ?? 0} min={0}
                    note={t('plan.tactical.price', { cost: pack.units[unit]?.cost ?? 0 })}
                    onChange={count => setProduction(withCount(entry.production, unit, count))}
                  />
                ))}
              </div>
            </details>
          )}

          {(cost > 0 || entry.payment.planets.length > 0 || entry.payment.tradeGoods > 0) && (
            <PaymentBlock
              need={cost} payment={entry.payment} state={before} pack={pack} manual={manualPayment}
              onManual={toggleManual} onChange={payment => onUpdate({ payment })}
            />
          )}

          {warnings.length > 0 && (
            <ul className="warning-list" aria-label={t('plan.tactical.warnings')}>
              {warnings.map((warning, i) => (
                <li key={i}><WarningText warning={warning} game={game} pack={pack} /></li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
