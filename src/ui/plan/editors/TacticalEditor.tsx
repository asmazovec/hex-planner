import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { autoPay } from '../../../domain/payment';
import { productionCost, routeSteps, systemPlanets } from '../../../domain/project';
import type { DataPack, Game, GameState, UnitCounts, UnitId, Warning } from '../../../domain/types';
import { UNIT_ORDER } from '../../units/unitOrder';
import { LandingBlock } from '../blocks/LandingBlock';
import { PaymentBlock } from '../blocks/PaymentBlock';
import { HexRemove, RowIcon } from '../../primitives/Icon';
import { addUnits, fliesNow, groupOf, hasUnits, isUntouched, sourcesOf, viaOf, withCount, withoutSource, type TacticalEntry } from '../tactical';
import { systemName } from '../../map/systemName';
import { UnitPicker } from './UnitPicker';
import { limitsSystem, ofSource, placeWarnings } from '../../feedback/warningPlaces';
import { WarningList } from '../../feedback/WarningText';

export interface TacticalEditorProps {
  game: Game;
  pack: DataPack;
  entry: TacticalEntry;
  /** The state just before the entry. */
  before: GameState;
  warnings: Warning[];
  pickerFrom: string | null;
  manualPayment: boolean;
  /** What the next tap on the map chooses. */
  choosing: 'system' | 'source' | null;
  onChoose: (what: 'system' | 'source' | null) => void;
  onUpdate: (patch: Partial<TacticalEntry>) => void;
  onOpenPicker: (source: string | null) => void;
  onManualPayment: (open: boolean) => void;
  /** The ships of the action leave for the active system. */
  onFly: () => void;
  /** Opens the shop of the big hex on the active system. */
  onOpenShop: () => void;
  /** Opens the battle of the big hex on the active system. */
  onOpenBattle: () => void;
  onDone: () => void;
}

/** The whole tactical action on one screen: system, arrows and units, optional landing and build, payment. Each block shows its own warnings. */
export function TacticalEditor({
  game, pack, entry, before, warnings, pickerFrom, manualPayment, choosing, onChoose,
  onUpdate, onOpenPicker, onManualPayment, onFly, onOpenShop, onOpenBattle, onDone,
}: TacticalEditorProps) {
  const { t } = useTranslation();
  const target = entry.systemId;
  const planets = target === null ? [] : systemPlanets(game, target, pack);
  // TODO(P2-309) #ws:production #type:check #rule:67-/-79 #rule:79.4 #test:067-producing-units #test:079-space-dock #duplicate-of-domain #warning-channel — «нет базы» считает UI по before.docks (чужая база тоже засчитывается); нужен код noProduction в домене, hasDock убрать
  const hasDock = planets.some(p => before.docks.includes(p.id));
  const priceOf = (units: UnitCounts) => productionCost(units, game.faction, before.upgrades, pack);
  const cost = priceOf(entry.production);
  const unitsIn = (list: { units: UnitCounts }[]): UnitCounts =>
    list.reduce((sum, item) => addUnits(sum, item.units), {} as UnitCounts);
  // TODO(P2-314) #ws:ui-containers #type:dup #size:s — строка «юнит N, …» собрана здесь, в StrategyEditor (builtUnits), AdjustmentEditor и EntrySteps (signed); один помощник unitsText в ui/units
  const unitText = (units: UnitCounts): string =>
    UNIT_ORDER.filter(u => (units[u] ?? 0) > 0).map(u => `${t(`unit.${u}`)} ${units[u]}`).join(', ');

  const sources = sourcesOf(game, pack, entry);
  // TODO(P2-311) #ws:ui-logic-to-domain #type:dup #duplicate-of-domain — деление «летит / груз» источника считается здесь, в EntrySteps и в tacticalMeters; брать из одной доменной функции
  /** A source in the list: its ships, then how much rides as cargo. */
  const sourceLine = (source: string): string => {
    const units = unitsIn(groupOf(game, pack, entry.moves, source));
    const flying = Object.fromEntries((Object.keys(units) as UnitId[]).filter(u => fliesNow(game, pack, before.upgrades, u)).map(u => [u, units[u]])) as UnitCounts;
    const cargo = (Object.keys(units) as UnitId[]).reduce((sum, u) => (u in flying ? sum : sum + (units[u] ?? 0)), 0);
    return `${unitText(flying) || t('plan.tactical.noShips')}${cargo > 0 ? t('plan.tactical.cargoShort', { n: cargo }) : ''}`;
  };

  // TODO(P2-312) #ws:ui-logic-to-domain #type:arch #size:s — наземные юниты заданы списком; брать pack.units[u].ground
  const groundUnits = (['infantry', 'mech'] as UnitId[]).filter(u => pack.units[u]);
  // TODO(P2-313) #ws:ui-logic-to-domain #type:arch #duplicate-of-domain #dep:P2-312 — что прилетело, что осталось после боя и что можно высадить считает UI; это шаг replay (после перелёта и потерь, до высадки), брать состояние после боя из домена
  const arrived = addUnits(before.systems[target ?? ''] ?? {}, unitsIn(entry.moves));
  const lost = entry.losses ?? {};
  /** What fights in the active system, by the order of the shop. */
  const fighting = UNIT_ORDER.filter(u => pack.units[u] && ((arrived[u] ?? 0) > 0 || (lost[u] ?? 0) > 0));
  /** What the battle leaves; the landing comes after it. */
  const here = Object.fromEntries(fighting.map(u => [u, Math.max(0, (arrived[u] ?? 0) - (lost[u] ?? 0))])) as UnitCounts;
  const landed = unitsIn(entry.landings);
  /** Ground unit types that arrived or are already assigned; only these can land. */
  const landable = groundUnits.filter(u => (here[u] ?? 0) > 0 || (landed[u] ?? 0) > 0);
  const showLanding = planets.length > 0 && (landable.length > 0 || entry.landings.length > 0);

  const landedOn = (planetId: string, unit: UnitId): number => entry.landings.find(l => l.planetId === planetId)?.units[unit] ?? 0;
  const setLanding = (planetId: string, unit: UnitId, count: number) => {
    const current = entry.landings.find(l => l.planetId === planetId)?.units ?? {};
    const rest = entry.landings.filter(l => l.planetId !== planetId);
    const units = withCount(current, unit, count);
    onUpdate({ landings: hasUnits(units) ? [...rest, { planetId, units }] : rest });
  };
  const lostAnywhere = unitText(Object.values(entry.groundLosses ?? {}).reduce(addUnits, lost));

  const toggleManual = (open: boolean) => {
    onManualPayment(open);
    if (!open) onUpdate({ payment: autoPay(before, cost, 'resources', pack) });
  };

  const placer = placeWarnings(warnings);
  const list = (shown: Warning[]) => <WarningList warnings={shown} game={game} pack={pack} />;
  // TODO(P2-315) #ws:ui-warnings #type:arch — места предупреждений перелёта и боя решаются фильтрами по коду и params.where (pickerWarnings, battleWarnings); нужны шаг и место из домена (WarningPlace 'battle'), а не разбор кода в редакторе
  // The open picker is where this flight is set up: it stands in for the row of its source, and it counts the fleet too.
  const pickerWarnings = pickerFrom === null ? [] : placer.at('route', w => limitsSystem(w) || ofSource(w, game, pack, entry.moves, pickerFrom));
  const overall = placer.at('action');
  // More lost than the system holds is a matter of the battle, not of a route.
  const battleWarnings = placer.at('route', w => w.code === 'unitsMissing' && (w.params.where === target || String(w.params.where) in (entry.groundLosses ?? {})));

  const blocks = target !== null && (
        <>
          {/* TODO(P2-316) #ws:ui-containers #type:ui #section — блоки редактора собраны руками (div.editor-section > strong, optional-note только здесь); Section(title, optional, action, warnings) во всех редакторах */}
          <div className="editor-section">
            {isUntouched(entry)
              ? (
                <button type="button" className="source-button" aria-pressed={choosing === 'system'} onClick={() => onChoose(choosing === 'system' ? null : 'system')}>
                  <strong>{t('plan.tactical.system', { name: systemName(game, pack, target) })}</strong>
                </button>
              )
              : <strong>{t('plan.tactical.system', { name: systemName(game, pack, target) })}</strong>}
            <span className="muted">{entry.free ? t('plan.tactical.freeToken') : t('plan.tactical.token', { from: before.tactic, to: before.tactic - 1 })}</span>
            {isUntouched(entry) && <span className="muted">{t('plan.tactical.wrongSystem')}</span>}
          </div>

          <div className="editor-section">
            <strong>{t('plan.tactical.moves')}</strong>
            <span className="muted">{t('plan.tactical.moveHint')}</span>
            {sources.length === 0 && <span className="muted">{t('plan.tactical.noSources')}</span>}
            {sources.filter(s => s !== pickerFrom).map(source => {
              const via = viaOf(entry, source);
              const name = systemName(game, pack, source);
              return (
                <Fragment key={source}>
                  <div className="source-row in-card">
                    <button type="button" className="source-button" onClick={() => onOpenPicker(source)}>
                      {via.length > 0 ? t('plan.tactical.via', { name, list: via.map(v => systemName(game, pack, v)).join(', ') }) : name}
                      <small>{sourceLine(source)}</small>
                      {target !== null && <small>{t('plan.tactical.distance', { n: routeSteps(game, [source, ...via, target], pack) })}</small>}
                    </button>
                    <HexRemove label={t('plan.tactical.removeSource', { name })} onClick={() => onUpdate({ moves: withoutSource(game, pack, entry.moves, source) })} />
                  </div>
                  {list(placer.at('route', w => ofSource(w, game, pack, entry.moves, source)))}
                </Fragment>
              );
            })}
            {list(placer.at('route', w => entry.moves.length > 0 || !limitsSystem(w)))}
            <button type="button" aria-pressed={choosing === 'source'} onClick={() => onChoose(choosing === 'source' ? null : 'source')}>{t('plan.tactical.addSource')}</button>
          </div>

          {/* TODO(P2-318) #ws:ui-nesting #type:ui #needs:prototype — UnitPicker раскрывается внутри редактора (6 уровней); шаги: пока открыт перелёт, показывать только его с «Назад» */}
          {pickerFrom !== null && (
            <UnitPicker
              game={game} pack={pack} before={before} entry={entry} source={pickerFrom} warnings={pickerWarnings}
              onChange={moves => onUpdate({ moves })} onClose={() => onOpenPicker(null)} onFly={onFly}
            />
          )}

          {/* TODO(P2-317) #ws:ui-nesting #type:ui #needs:prototype #dep:P2-316 — «Бой» и «Производство» — блоки из одной кнопки; сделать строками .in-card */}
          <div className="editor-section">
            <strong>{t('plan.tactical.battle')} <small className="optional-note">{t('plan.tactical.optional')}</small></strong>
            {lostAnywhere.length > 0 && <span className="muted">{lostAnywhere}</span>}
            {list(battleWarnings)}
            <button type="button" onClick={onOpenBattle}>{t(lostAnywhere.length > 0 ? 'plan.tactical.continueBattle' : 'plan.tactical.startBattle')}</button>
          </div>

          {showLanding && (
            <details className="editor-section" open>
              <summary><span>{t('plan.tactical.landing')} <small className="optional-note">{t('plan.tactical.optional')}</small></span><RowIcon name="chevron" /></summary>
              <LandingBlock
                game={game} planets={planets} before={before} units={landable} arrived={here} lost={entry.groundLosses}
                landedOn={landedOn} onLand={setLanding}
              />
              {list(placer.at('landing'))}
            </details>
          )}

          <div className="editor-section">
            <strong>{t('plan.tactical.production')} <small className="optional-note">{t('plan.tactical.optional')}</small></strong>
            {hasUnits(entry.production) && <span className="muted">{unitText(entry.production)}</span>}
            {/* TODO(P2-310) #ws:ui-warnings #type:ui #size:s #dep:P2-309 #warning-channel — своё span.warning-text мимо WarningList; показывать noProduction через placer.at('production') */}
            {!hasDock && hasUnits(entry.production) && <span className="warning-text place-warnings">{t('plan.tactical.noDock')}</span>}
            <button type="button" onClick={onOpenShop}>{t('plan.tactical.openShop')}</button>
          </div>

          {(cost > 0 || entry.payment.planets.length > 0 || entry.payment.tradeGoods > 0) && (
            <PaymentBlock
              need={cost} payment={entry.payment} state={before} pack={pack} manual={manualPayment}
              onManual={toggleManual} onChange={payment => onUpdate({ payment })}
            >
              {list(placer.at('payment'))}
            </PaymentBlock>
          )}

          {overall.length > 0 && (
            <div className="editor-section" role="group" aria-label={t('plan.tactical.result')}>
              <strong>{t('plan.tactical.result')}</strong>
              {list(overall)}
            </div>
          )}
        </>
  );

  return (
    <div className="tactical-editor panel-stack">
      {/* TODO(P2-319) #ws:ui-containers #type:ui #needs:prototype #editor-frame — голова и подвал редакторов четырёх видов (здесь panel-head и «Готово» вверху, у StrategyEditor h2 и подвал, у UnitPicker текстовое «Закрыть»); класса .tactical-editor в CSS нет. Одна рамка редактора */}
      <div className="panel-head">
        <h2>{t('plan.tactical.title')}</h2>
        <button type="button" className="primary" onClick={onDone}>{t('plan.tactical.done')}</button>
      </div>
      {/* A warning whose block is not on the screen stands first, where it cannot be missed. */}
      {list(placer.rest())}
      {blocks}
    </div>
  );
}
