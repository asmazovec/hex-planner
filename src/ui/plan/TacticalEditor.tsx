import { useTranslation } from 'react-i18next';
import { autoPay } from '../../domain/payment';
import { productionCost, systemPlanets } from '../../domain/project';
import type { DataPack, Game, GameState, UnitCounts, UnitId, Warning } from '../../domain/types';
import { UNIT_ORDER } from '../units/unitOrder';
import { PaymentBlock } from './PaymentBlock';
import { Stepper } from './Stepper';
import { addUnits, fliesNow, groupOf, hasUnits, sourcesOf, systemName, viaOf, withCount, withoutSource, type TacticalEntry } from './tactical';
import { UnitPicker } from './UnitPicker';
import { WarningText } from './WarningText';

export interface TacticalEditorProps {
  game: Game;
  pack: DataPack;
  entry: TacticalEntry;
  /** The state just before the entry. */
  before: GameState;
  warnings: Warning[];
  pickerFrom: string | null;
  manualPayment: boolean;
  onUpdate: (patch: Partial<TacticalEntry>) => void;
  onOpenPicker: (source: string | null) => void;
  onManualPayment: (open: boolean) => void;
  /** The ships of the action leave for the active system. */
  onFly: () => void;
  /** Opens the shop of the big hex on the active system. */
  onOpenShop: () => void;
  onDone: () => void;
}

/** The whole tactical action on one screen: system, arrows and units, optional landing and build, payment, warnings. */
export function TacticalEditor({
  game, pack, entry, before, warnings, pickerFrom, manualPayment,
  onUpdate, onOpenPicker, onManualPayment, onFly, onOpenShop, onDone,
}: TacticalEditorProps) {
  const { t } = useTranslation();
  const target = entry.systemId;
  const planets = target === null ? [] : systemPlanets(game, target, pack);
  const hasDock = planets.some(p => before.docks.includes(p.id));
  const priceOf = (units: UnitCounts) => productionCost(units, game.faction, before.upgrades, pack);
  const cost = priceOf(entry.production);
  const unitsIn = (list: { units: UnitCounts }[]): UnitCounts =>
    list.reduce((sum, item) => addUnits(sum, item.units), {} as UnitCounts);
  const unitText = (units: UnitCounts): string =>
    UNIT_ORDER.filter(u => (units[u] ?? 0) > 0).map(u => `${t(`unit.${u}`)} ${units[u]}`).join(', ');

  const sources = sourcesOf(game, pack, entry);
  /** A source in the list: its ships, then how much rides as cargo. */
  const sourceLine = (source: string): string => {
    const units = unitsIn(groupOf(game, pack, entry.moves, source));
    const flying = Object.fromEntries((Object.keys(units) as UnitId[]).filter(u => fliesNow(game, pack, before.upgrades, u)).map(u => [u, units[u]])) as UnitCounts;
    const cargo = (Object.keys(units) as UnitId[]).reduce((sum, u) => (u in flying ? sum : sum + (units[u] ?? 0)), 0);
    return `${unitText(flying) || t('plan.tactical.noShips')}${cargo > 0 ? t('plan.tactical.cargoShort', { n: cargo }) : ''}`;
  };

  const groundUnits = (['infantry', 'mech'] as UnitId[]).filter(u => pack.units[u]);
  const here = addUnits(before.systems[target ?? ''] ?? {}, unitsIn(entry.moves));
  const landed = unitsIn(entry.landings);
  /** Ground unit types that arrived or are already assigned; only these get a count and steppers. */
  const landable = groundUnits.filter(u => (here[u] ?? 0) > 0 || (landed[u] ?? 0) > 0);
  const showLanding = planets.length > 0 && (landable.length > 0 || entry.landings.length > 0);

  const setLanding = (planetId: string, unit: UnitId, count: number) => {
    const current = entry.landings.find(l => l.planetId === planetId)?.units ?? {};
    const rest = entry.landings.filter(l => l.planetId !== planetId);
    const units = withCount(current, unit, count);
    onUpdate({ landings: hasUnits(units) ? [...rest, { planetId, units }] : rest });
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
            <span className="muted">{entry.free ? t('plan.tactical.freeToken') : t('plan.tactical.token', { from: before.tactic, to: before.tactic - 1 })}</span>
            {sources.length === 0 && <span className="muted">{t('plan.tactical.wrongSystem')}</span>}
          </div>

          <div className="editor-section">
            <strong>{t('plan.tactical.moves')}</strong>
            <span className="muted">{t('plan.tactical.moveHint')}</span>
            {sources.length === 0 && <span className="muted">{t('plan.tactical.noSources')}</span>}
            {sources.filter(s => s !== pickerFrom).map(source => {
              const via = viaOf(entry, source);
              const name = systemName(game, pack, source);
              return (
                <div key={source} className="source-row">
                  <button type="button" className="source-button" onClick={() => onOpenPicker(source)}>
                    {via.length > 0 ? t('plan.tactical.via', { name, list: via.map(v => systemName(game, pack, v)).join(', ') }) : name}
                    <small>{sourceLine(source)}</small>
                  </button>
                  <button type="button" aria-label={t('plan.tactical.removeSource', { name })} onClick={() => onUpdate({ moves: withoutSource(game, pack, entry.moves, source) })}>✕</button>
                </div>
              );
            })}
          </div>

          {pickerFrom !== null && (
            <UnitPicker
              game={game} pack={pack} before={before} entry={entry} source={pickerFrom}
              onChange={moves => onUpdate({ moves })} onClose={() => onOpenPicker(null)} onFly={onFly}
            />
          )}

          {showLanding && (
            <details className="editor-section" open>
              <summary>{t('plan.tactical.landing')}</summary>
              {landable.map(unit => (
                <div key={unit} className="muted">
                  {t('plan.tactical.landingCount', { unit: t(`unit.${unit}`), available: here[unit] ?? 0, assigned: landed[unit] ?? 0 })}
                </div>
              ))}
              {planets.map(planet => (
                <div key={planet.id} role="group" aria-label={t('plan.tactical.landingOn', { planet: planet.name })}>
                  <strong>{planet.name}</strong>
                  {landable.map(unit => (
                    <Stepper
                      key={unit} name={t(`unit.${unit}`)} min={0}
                      value={entry.landings.find(l => l.planetId === planet.id)?.units[unit] ?? 0}
                      onChange={count => setLanding(planet.id, unit, count)}
                    />
                  ))}
                </div>
              ))}
            </details>
          )}

          <div className="editor-section">
            <strong>{t('plan.tactical.production')}</strong>
            {hasUnits(entry.production) && <span className="muted">{unitText(entry.production)}</span>}
            {!hasDock && <span className="warning-text">{t('plan.tactical.noDock')}</span>}
            <button type="button" onClick={onOpenShop}>{t('plan.tactical.openShop')}</button>
          </div>

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
