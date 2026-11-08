import { useTranslation } from 'react-i18next';
import { cardSummary } from '../../../data/cardSummaries';
import { strategyCards } from '../../../data/loadPack';
import { strategyCardSet } from '../../../domain/cards';
import { autoPay } from '../../../domain/payment';
import { opponentsBySeat } from '../../../domain/players';
import { systemPlanets } from '../../../domain/project';
import { CARD, cardChange, cardCost, freeTokens, hasChoices, heldCards, homeSlot, playOf, researchCount, startsAsPrimary, withLeadershipTokens, type CardEntry, type CardPatch } from '../../../domain/strategy';
import type { CardEffects, DataPack, Game, GameState, Round, Warning } from '../../../domain/types';
import { currentLanguage } from '../../../i18n';
import { opponentName } from '../../players/names';
import { UNIT_ORDER } from '../../units/unitOrder';
import { EntryUpgrades } from '../blocks/EntryUpgrades';
import { PaymentBlock } from '../blocks/PaymentBlock';
import { systemName } from '../../map/systemName';
import type { TacticalEntry } from '../tactical';
import { TokenTiles } from '../blocks/TokenTiles';
import { placeWarnings } from '../../feedback/warningPlaces';
import { WarningList } from '../../feedback/WarningText';

/** What the next tap on the map chooses. */
export type MapPick = 'system' | 'build' | 'dock';

const READY_LIMIT = 2;

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

/** A strategy card played: first the card, then its primary or secondary, both free to change until something is chosen, then cancelling is the way back. */
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
  const mine = !entry.owner;
  const te = game.expansions.includes('te');
  const cost = cardCost(entry, game.faction, before.upgrades, pack);
  const change = (patch: CardPatch) => onUpdate(cardChange(entry, patch, before, game.faction, pack, manualPayment));
  const setEffects = (patch: CardEffects) => change({ effects: { ...effects, ...patch } });
  const named = (id: string) => opponentName(game, pack, id, t);
  const tile = (slot: string) => t('plan.strategy.tile', { name: systemName(game, pack, slot) });
  // TODO(P2-328) #ws:rivals #type:bug #rule:92.4 #test:092-trade #player-choice — на карте соперника game = gameAs: списки Trade и Politics предлагают самого соперника и не предлагают меня; нужен доменный список «другие игроки владельца записи»
  const opponents = opponentsBySeat(game);
  const toggled = (list: string[] | undefined, id: string) =>
    (list?.includes(id) ? list.filter(other => other !== id) : [...(list ?? []), id]);

  const pickCard = (initiative: number) => {
    if (initiative === entry.card) return;
    change({ card: initiative, ...playOf(round, game.playerCount, initiative, startsAsPrimary(round, game.playerCount, initiative, entry), mine) });
  };

  const placer = placeWarnings(warnings);
  const list = (shown: Warning[]) => <WarningList warnings={shown} game={game} pack={pack} />;

  // TODO(P2-338) #ws:ui-containers #type:ui #section #dep:P2-316 — блоки (жетоны, Diplomacy, Politics, Trade, Technology, улучшения) собраны вручную из div.editor-section; Section
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

  // TODO(P2-336) #ws:strategy-cards #type:arch — один switch на все карты в редакторе; по компоненту на карту (plan/editors/cards/*) вслед за обработчиками карт в домене
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
        // TODO(P2-326) #ws:strategy-cards #type:check #rule:32.2 #rule:32.3 #rule:71-note-3 #test:032-diplomacy #test:071-readied #duplicate-of-domain — какие планеты готовить и лимит READY_LIMIT решает UI (disabled), домен не предупреждает; правило и список планет в domain/strategy.ts, здесь только показ
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
                {/* TODO(P2-329) #ws:ui-containers #type:ui #player-choice #needs:prototype — выбор игрока (точка цвета + имя, inline var(--player-…)) собран руками здесь, в Trade ниже, в HexStage и PlanScreen; общий PlayerChoice с PlayerDot */}
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
              : primary && pickButton('dock', t('plan.strategy.dock')))}
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
              {/* TODO(P2-330) #ws:ui-containers #type:ui #size:s #player-choice #dep:P2-329 #dep:P2-328 — вторая ручная сборка выбора игрока; PlayerChoice */}
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
                {/* TODO(P2-332) #ws:ui-containers #type:ui #needs:prototype #size:s — «−» на месте .in-card, где по соглашению удаление, а делает уменьшение; Stepper */}
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
            {/* TODO(P2-331) #ws:strategy-cards #type:bug #rule:45.2 #rule:45-note-3 #test:045-imperial — очко Imperial по флажку, доступному и без контроля Mecatol Rex; убрать переключатель, очко считает домен по контролю */}
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
  const ability = (asPrimary: boolean, text: string, costsToken: boolean) => (
    <button
      type="button" className={`card-ability card-ability-${asPrimary ? 'primary' : 'secondary'}`} aria-pressed={primary === asPrimary} disabled={locked}
      onClick={() => { if (card) change(playOf(round, game.playerCount, card.initiative, asPrimary, mine)); }}
    >
      <b>{t(asPrimary ? 'plan.cards.primary' : 'plan.cards.secondary')}{costsToken && <span className="card-ability-cost">{t('plan.strategy.tokenCost')}</span>}</b>
      <span>{text}</span>
    </button>
  );
  const cardBlocks = card && summary && (
    <>
      <div className="card-abilities" role="group" aria-label={t('plan.strategy.modes')}>
        {card.changedIn === 'te' && <span className="pill pill-change">{t('plan.cards.changed')}</span>}
        {/* TODO(P2-333) #ws:strategy-cards #type:dup #duplicate-of-domain #size:s — цена жетоном повторяет playOf и costsStrategyToken (и CARD.leadership ниже); звать costsStrategyToken({ ...entry, ...playOf(...) }) */}
        {ability(true, summary.primary, entry.forToken === true || (mine && !heldCards(round, game.playerCount).includes(card.initiative)))}
        {ability(false, summary.secondary, card.initiative !== CARD.leadership)}
        {summary.change && <span className="card-note">{summary.change}</span>}
      </div>
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

  // TODO(P2-337) #ws:ui-nesting #type:ui #needs:prototype — редактор длинный, 4 уровня; шаги: (1) карта и свойство, (2) параметры
  return (
    <div className="strategy-editor panel-stack">
      {/* TODO(P2-334) #ws:ui-containers #type:ui #needs:prototype #dep:P2-319 — голый h2 и подвал .strategy-foot вместо общей рамки редактора */}
      <h2>{t('plan.menu.strategic')}</h2>
      {/* TODO(P2-335) #ws:ui-containers #type:dup #size:s — сетка карт стратегии повторяет StrategyCards.tsx; общий CardGrid */}
      <div className="card-grid" role="group" aria-label={t('plan.strategy.cards')}>
        {cards.map(c => (
          <button
            key={c.initiative} type="button" className="card-cell" aria-pressed={c.initiative === entry.card}
            disabled={locked && c.initiative !== entry.card} onClick={() => pickCard(c.initiative)}
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
