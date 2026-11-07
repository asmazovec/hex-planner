import { useTranslation } from 'react-i18next';
import { cardSummary } from '../../data/cardSummaries';
import { strategyCardSet, strategyCards } from '../../domain/cards';
import { autoPay } from '../../domain/payment';
import { opponentsBySeat } from '../../domain/players';
import { placesOf, systemPlanets } from '../../domain/project';
import { CARD, cardChange, cardCost, costsStrategyToken, freeTokens, hasChoices, homeSlot, researchCount, withLeadershipTokens, withProduction, withStructure, type CardEntry, type CardPatch } from '../../domain/strategy';
import type { CardEffects, DataPack, Game, GameState, Round, UnitId, Warning } from '../../domain/types';
import { currentLanguage } from '../../i18n';
import type { PurchaseTarget } from '../map/HexStage';
import { opponentName } from '../map/opponentName';
import { UNIT_ORDER } from '../units/unitOrder';
import { EntryUpgrades } from './EntryUpgrades';
import { PaymentBlock } from './PaymentBlock';
import { systemName, type TacticalEntry } from './tactical';
import { TokenTiles } from './TokenTiles';
import { placeWarnings } from './warningPlaces';
import { WarningList } from './WarningText';

/** What the next tap on the map chooses. */
export type MapPick = 'system' | 'build' | 'dock';

const READY_LIMIT = 2;

/** Routes what the big hex buys into the entry's effects. */
export function cardPurchases(
  game: Game, pack: DataPack, entry: CardEntry, slot: string, before: GameState, apply: (effects: CardEffects) => void,
): PurchaseTarget {
  const effects = entry.effects ?? {};
  const production = effects.production?.systemId === slot ? effects.production : undefined;
  return {
    bought: placesOf(game, before, slot, production?.units ?? {}, pack, production?.ground),
    upgrades: before.upgrades,
    before,
    entryId: entry.id,
    change: (unit: UnitId, planetId, amount) => apply(withProduction(effects, slot, unit, planetId, amount)),
    structures: effects.structures,
    changeStructure: (kind, planetId, amount) => apply(withStructure(effects, kind, planetId, amount)),
  };
}

export interface StrategyEditorProps {
  game: Game;
  pack: DataPack;
  round: Round;
  entry: CardEntry;
  /** The state just before the entry. */
  before: GameState;
  warnings: Warning[];
  manualPayment: boolean;
  /** What the next tap on the map will choose. */
  picking: MapPick | null;
  onUpdate: (patch: CardPatch) => void;
  onManualPayment: (open: boolean) => void;
  onPick: (pick: MapPick | null) => void;
  /** Opens the shop of the big hex limited to structures or to units. */
  onOpenShop: (slot: string, only: 'build' | 'units') => void;
  /** Warfare's primary: starts the free tactical action. */
  onStartTactical: () => void;
  onOpenTactical: (id: string) => void;
  onCancel: () => void;
  onDone: () => void;
}

/** A strategy card played: the mode and the card stay free until something is chosen, then cancelling is the way back. */
export function StrategyEditor({
  game, pack, round, entry, before, warnings, manualPayment, picking,
  onUpdate, onManualPayment, onPick, onOpenShop, onStartTactical, onOpenTactical, onCancel, onDone,
}: StrategyEditorProps) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const cards = strategyCards(game.expansions);
  const card = cards.find(c => c.initiative === entry.card);
  const primary = entry.type === 'strategic';
  const effects = entry.effects ?? {};
  const locked = card !== undefined && hasChoices(entry, round);
  const mode = entry.forToken ? 'forToken' : primary ? 'primary' : 'secondary';
  const te = game.expansions.includes('te');
  const cost = cardCost(entry, game.faction, before.upgrades, pack);
  const change = (patch: CardPatch) => onUpdate(cardChange(entry, patch, before, game.faction, pack, manualPayment));
  const setEffects = (patch: CardEffects) => change({ effects: { ...effects, ...patch } });
  const named = (id: string) => opponentName(game, pack, id, t);
  const tile = (slot: string) => t('plan.strategy.tile', { name: systemName(game, pack, slot) });
  const opponents = opponentsBySeat(game);
  const toggled = (list: string[] | undefined, id: string) =>
    (list?.includes(id) ? list.filter(other => other !== id) : [...(list ?? []), id]);

  const setMode = (next: typeof mode) => change({
    type: next === 'secondary' ? 'secondary' : 'strategic', forToken: next === 'forToken' ? true : undefined,
  });

  const placer = placeWarnings(warnings);
  const list = (shown: Warning[]) => <WarningList warnings={shown} game={game} pack={pack} />;

  const tokenPick = (rearrange = false, onTokens: (tokens: CardEffects['tokens']) => void = tokens => setEffects({ tokens })) => (
    <div className="editor-section">
      <TokenTiles
        free={freeTokens(entry, game.expansions)} values={effects.tokens ?? {}} onChange={onTokens}
        pools={rearrange ? { tactic: before.tactic, fleet: before.fleet, strategy: before.strategy } : undefined}
      />
      {list(placer.at('tokens'))}
    </div>
  );

  const upgradeRow = (
    <EntryUpgrades
      upgrades={entry.upgrades ?? []} before={before.upgrades} game={game} pack={pack}
      onChange={upgrades => change({ upgrades: upgrades.length > 0 ? upgrades : undefined })}
    />
  );

  const pickButton = (pick: MapPick, label: string, slot?: string) => (
    <button type="button" className="option" aria-pressed={picking === pick} onClick={() => onPick(picking === pick ? null : pick)}>
      {label}{slot ? ` · ${tile(slot)}` : ''}
    </button>
  );

  const production = effects.production;
  const builtUnits = production && UNIT_ORDER.filter(u => (production.units[u] ?? 0) > 0)
    .map(u => `${t(`unit.${u}`)} ${production.units[u]}`).join(', ');
  const builtLine = builtUnits && <p className="muted">{t('plan.strategy.built', { list: `${tile(production.systemId)}: ${builtUnits}` })}</p>;

  const sections = () => {
    switch (entry.card) {
      case CARD.leadership: {
        const bought = effects.boughtTokens ?? 0;
        return (
          <>
            {tokenPick(false, tokens => change({ effects: withLeadershipTokens(effects, tokens, primary) }))}
            <p className="muted">{bought > 0 ? t('plan.strategy.bought', { n: bought, cost: cost.amount }) : t(primary ? 'plan.strategy.boughtNonePrimary' : 'plan.strategy.boughtNoneSecondary')}</p>
          </>
        );
      }
      case CARD.diplomacy: {
        // Only the base primary's text says "that system"; the others ready any of my planets.
        const unlimited = primary && strategyCardSet(game.expansions) === 'base_game';
        const readied = effects.readied ?? [];
        const spent = [...new Set([...before.exhausted.filter(id => before.control[id] === 'me'), ...readied])].flatMap(id => pack.planets[id] ?? []);
        const here = !unlimited ? spent
          : effects.systemId ? systemPlanets(game, effects.systemId, pack).filter(p => before.control[p.id] === 'me') : [];
        return (
          <>
            {primary && pickButton('system', t('plan.strategy.systemPrimary'), effects.systemId)}
            {!unlimited && here.length === 0 && <p className="muted">{t('plan.strategy.noExhausted')}</p>}
            {here.length > 0 && (
              <div className="editor-section" role="group" aria-label={t('plan.strategy.ready')}>
                <strong>{t(unlimited ? 'plan.strategy.ready' : 'plan.strategy.readyTwo')}</strong>
                <div className="pay-planets">
                  {here.map(planet => {
                    const on = readied.includes(planet.id);
                    return (
                      <button
                        key={planet.id} type="button" aria-pressed={on} disabled={!on && !unlimited && readied.length >= READY_LIMIT}
                        onClick={() => setEffects({ readied: toggled(readied, planet.id) })}
                      >
                        {planet.name} {planet.resources}/{planet.influence}{before.exhausted.includes(planet.id) ? ` · ${t('plan.strategy.exhausted')}` : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        );
      }
      case CARD.politics:
        return (
          <>
            {primary && (
              <div className="editor-section" role="group" aria-label={t('plan.strategy.speaker')}>
                <strong>{t('plan.strategy.speaker')}</strong>
                {opponents.map(o => (
                  <button
                    key={o.id} type="button" className="option" aria-pressed={effects.speaker === o.id}
                    onClick={() => setEffects({ speaker: effects.speaker === o.id ? undefined : o.id })}
                  >
                    <span className="owner-dot" aria-hidden="true" style={{ background: `var(--player-${o.color})` }} />
                    {named(o.id)}
                  </button>
                ))}
              </div>
            )}
            <p className="muted">{t(primary ? 'plan.strategy.politicsPrimary' : 'plan.strategy.politicsSecondary')}</p>
          </>
        );
      case CARD.construction:
        return (
          <>
            {pickButton('build', t(primary ? 'plan.strategy.buildPrimary' : 'plan.strategy.buildSecondary'), effects.systemId)}
            {list(placer.at('system'))}
            {(effects.structures?.length ?? 0) > 0 && (
              <p className="muted">
                {t('plan.strategy.built', {
                  list: effects.structures?.map(s => `${t(s.kind === 'pds' ? 'map.pds' : 'map.spaceDock')} (${pack.planets[s.planetId]?.name ?? s.planetId})`).join(', '),
                })}
              </p>
            )}
            {te && (production
              ? <button type="button" className="option" aria-pressed="true" onClick={() => onOpenShop(production.systemId, 'units')}>{t('plan.strategy.dock')} · {tile(production.systemId)}</button>
              : pickButton('dock', t('plan.strategy.dock')))}
            {builtLine}
            {list(placer.at('production'))}
          </>
        );
      case CARD.trade:
        if (!primary) return <p className="muted">{t('plan.strategy.tradeSecondary')}</p>;
        return (
          <>
            <p className="muted">{t('plan.strategy.tradePrimary')}</p>
            <div className="editor-section" role="group" aria-label={t('plan.strategy.free')}>
              <strong>{t('plan.strategy.free')}</strong>
              {opponents.map(o => (
                <button
                  key={o.id} type="button" className="option" aria-pressed={effects.freeSecondary?.includes(o.id) ?? false}
                  onClick={() => setEffects({ freeSecondary: toggled(effects.freeSecondary, o.id) })}
                >
                  <span className="owner-dot" aria-hidden="true" style={{ background: `var(--player-${o.color})` }} />
                  {named(o.id)}
                </button>
              ))}
            </div>
          </>
        );
      case CARD.warfare: {
        if (primary) {
          if (!te) {
            return (
              <>
                {pickButton('system', t('plan.strategy.liftToken'), effects.systemId)}
                {tokenPick(true)}
              </>
            );
          }
          const tactical = round.entries.find((e): e is typeof e & TacticalEntry => e.type === 'tactical' && e.fromCard === entry.id);
          return (
            <>
              {tactical
                ? (
                  <button type="button" className="option" aria-pressed="true" onClick={() => onOpenTactical(tactical.id)}>
                    {t('plan.strategy.freeTacticalOpen')}{tactical.systemId ? ` · ${tile(tactical.systemId)}` : ''}
                  </button>
                )
                : <button type="button" className="option" onClick={onStartTactical}>{t('plan.strategy.freeTactical')}</button>}
              <p className="muted">{t('plan.strategy.freeTacticalNote')}</p>
              {tokenPick(true)}
            </>
          );
        }
        const home = homeSlot(game, pack);
        return (
          <>
            <button
              type="button" className="option" aria-pressed={production !== undefined} disabled={home === null}
              onClick={() => { if (home) onOpenShop(home, 'units'); }}
            >
              {t('plan.strategy.homeProduction')}
            </button>
            {builtLine}
            {list(placer.at('production'))}
            <p className="muted">{t(home === null ? 'plan.strategy.noHome' : 'plan.strategy.shopNote')}</p>
          </>
        );
      }
      case CARD.technology: {
        const count = researchCount(entry);
        const researched = effects.researched ?? 0;
        const setResearched = (value: number) => {
          const next = { ...effects };
          if (value > 0) next.researched = value;
          else delete next.researched;
          change({ effects: next });
        };
        return (
          <>
            <div className="editor-section">
              <strong>{t('plan.strategy.research', { n: count })}</strong>
              <div className="research-row in-card">
                <button type="button" className="option" aria-pressed={researched > 0} onClick={() => setResearched(researched + 1)}>
                  {t('plan.strategy.researchAdd')}{researched > 0 ? ` · ${researched}` : ''}
                </button>
                {researched > 0 && <button type="button" aria-label={t('plan.strategy.researchTake')} onClick={() => setResearched(researched - 1)}>−</button>}
              </div>
              <span className="muted">{t(primary ? 'plan.strategy.techPrimary' : 'plan.strategy.techSecondary', { n: cost.amount, count })}</span>
            </div>
            <div className="editor-section">
              <strong>{t('plan.strategy.upgrades')}</strong>
              {upgradeRow}
            </div>
          </>
        );
      }
      case CARD.imperial:
        if (!primary) return <p className="muted">{t('plan.strategy.imperialSecondary')}</p>;
        return (
          <>
            <button type="button" className="option" aria-pressed={effects.mecatol ?? false} onClick={() => setEffects({ mecatol: !effects.mecatol })}>
              {t('plan.strategy.mecatol')}
            </button>
            <p className="muted">{t('plan.strategy.imperialNote')}</p>
          </>
        );
      default:
        return null;
    }
  };

  const summary = card && cardSummary(card.summaryKey, lang);
  const payment = effects.payment ?? { planets: [], tradeGoods: 0 };
  const toggleManual = (open: boolean) => {
    onManualPayment(open);
    if (!open) onUpdate({ effects: { ...effects, payment: autoPay(before, cost.amount, cost.kind, pack) } });
  };

  const cardWarnings = placer.at('card');
  const cardBlocks = card && summary && (
    <>
      <p className="card-text">
        {primary ? summary.primary : summary.secondary}
        {card.changedIn === 'te' && <span className="pill pill-change">{t('plan.cards.changed')}</span>}
      </p>
      {mode === 'secondary' && costsStrategyToken(entry) && <p className="muted">{t('plan.strategy.tokenCost')}</p>}
      {mode === 'forToken' && <p className="muted">{t('plan.strategy.forTokenNote')}</p>}
      {sections()}
      {(cost.amount > 0 || payment.planets.length > 0 || payment.tradeGoods > 0) && (
        <PaymentBlock
          need={cost.amount} payment={payment} state={before} pack={pack} manual={manualPayment} kind={cost.kind}
          onManual={toggleManual} onChange={next => onUpdate({ effects: { ...effects, payment: next } })}
        >
          {list(placer.at('payment'))}
        </PaymentBlock>
      )}
    </>
  );

  return (
    <div className="strategy-editor panel-stack">
      <h2>{t(`plan.strategy.title.${mode}`)}</h2>
      <div className="segment" role="group" aria-label={t('plan.strategy.modes')}>
        {(['primary', 'secondary', 'forToken'] as const).map(m => (
          <button key={m} type="button" aria-pressed={mode === m} disabled={locked} onClick={() => setMode(m)}>{t(`plan.strategy.mode.${m}`)}</button>
        ))}
      </div>
      <div className="card-grid" role="group" aria-label={t('plan.strategy.cards')}>
        {cards.map(c => (
          <button
            key={c.initiative} type="button" className="card-cell" aria-pressed={c.initiative === entry.card}
            disabled={locked && c.initiative !== entry.card} onClick={() => change({ card: c.initiative })}
          >
            <b>{c.initiative}</b>{c.name}
          </button>
        ))}
      </div>
      <p className="muted strategy-lock">{locked && t('plan.strategy.locked')}</p>
      {/* The mode and the card decide these; a warning whose block is not on the screen stands here too, where it cannot be missed. */}
      {list([...cardWarnings, ...placer.rest()])}
      {!card && <p className="muted">{t('plan.strategy.chooseCard')}</p>}
      {cardBlocks}
      {entry.card !== CARD.technology && (entry.upgrades?.length ?? 0) > 0 && (
        <div className="editor-section">
          <strong>{t('plan.strategy.upgrades')}</strong>
          {upgradeRow}
        </div>
      )}
      <div className="strategy-foot">
        <button type="button" onClick={onCancel}>{t('plan.strategy.cancel')}</button>
        <button type="button" className="primary" onClick={onDone}>{t('plan.strategy.done')}</button>
      </div>
    </div>
  );
}
