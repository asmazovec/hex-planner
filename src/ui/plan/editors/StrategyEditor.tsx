import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cardSummary } from '../../../data/cardSummaries';
import { strategyCards } from '../../../data/loadPack';
import { autoPay } from '../../../domain/payment';
import { opponentsBySeat } from '../../../domain/players';
import { CARD, cardChange, cardCost, costsStrategyToken, freeTokens, freshPlay, heldCards, playOf, startsAsPrimary, type CardEntry, type CardPatch } from '../../../domain/strategy';
import type { CardEffects, DataPack, Game, GameState, Round, Warning } from '../../../domain/types';
import { currentLanguage } from '../../../i18n';
import { opponentName } from '../../players/names';
import { EntryUpgrades } from '../blocks/EntryUpgrades';
import { PaymentBlock } from '../blocks/PaymentBlock';
import { systemName } from '../../map/systemName';
import { TokenTiles } from '../blocks/TokenTiles';
import { limitsSystem, placeWarnings } from '../../feedback/warningPlaces';
import { WarningList } from '../../feedback/WarningText';
import { CARD_BLOCKS, type CardKit } from './cards';
import { unitsText } from '../../units/unitsText';
import { Section } from '../../primitives/Section';
import { CardGrid } from '../blocks/CardGrid';
import { MapPickButton } from '../../primitives/MapPickButton';
import { EditorFrame } from '../../primitives/EditorFrame';

/** What the next tap on the map chooses. */
export type MapPick = 'system' | 'build' | 'dock';

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
  onDone: () => void;
  /** The cross of the head: the card goes, with what it holds. */
  onRemove: () => void;
  /** The «В этом ходу» block: what the turn holds beside its action, last in the editor. */
  turnActs?: ReactNode;
}

/** A strategy card played: first the card, then its primary or secondary; either stays open, and a switch starts the play over. */
export function StrategyEditor({
  game, pack, round, entry, before, warnings, manualPayment, picking,
  onUpdate, onManualPayment, onPick, onOpenShop, onStartTactical, onOpenTactical, onDone, onRemove, turnActs,
}: StrategyEditorProps) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const cards = strategyCards(game.expansions);
  const card = cards.find(c => c.initiative === entry.card);
  const primary = entry.type === 'strategic';
  const effects = entry.effects ?? {};
  const mine = !entry.owner;
  const te = game.expansions.includes('te');
  const cost = cardCost(entry, game.faction, before.upgrades, pack);
  const change = (patch: CardPatch) => onUpdate(cardChange(entry, patch, before, game.faction, pack, manualPayment));
  const setEffects = (patch: CardEffects) => change({ effects: { ...effects, ...patch } });
  const named = (id: string) => opponentName(game, pack, id, t);
  const tile = (slot: string) => t('plan.strategy.tile', { name: systemName(game, pack, slot) });
  const opponents = opponentsBySeat(game);
  const toggled = (list: string[] | undefined, id: string) =>
    (list?.includes(id) ? list.filter(other => other !== id) : [...(list ?? []), id]);

  const pickCard = (initiative: number) => {
    if (initiative === entry.card) return;
    const play = { card: initiative, ...playOf(round, game.playerCount, initiative, startsAsPrimary(round, game.playerCount, initiative, entry), mine) };
    // An entry saved before cards keeps what it holds when it gets its first card.
    change(entry.card === undefined ? play : freshPlay(play));
  };

  const placer = placeWarnings(warnings);
  const list = (shown: Warning[]) => <WarningList warnings={shown} game={game} pack={pack} />;

  const tokenPick = (rearrange = false, onTokens: (tokens: CardEffects['tokens']) => void = tokens => setEffects({ tokens })) => (
    <Section warnings={list(placer.at('tokens'))}>
      <TokenTiles
        free={freeTokens(entry, game.expansions, before)} values={effects.tokens ?? {}} onChange={onTokens}
        pools={rearrange ? { tactic: before.tactic, fleet: before.fleet, strategy: before.strategy } : undefined}
      />
    </Section>
  );

  const upgradeRow = (
    <EntryUpgrades
      upgrades={entry.upgrades ?? []} before={before.upgrades} game={game} pack={pack}
      onChange={upgrades => change({ upgrades: upgrades.length > 0 ? upgrades : undefined })}
    />
  );

  const pickButton = (pick: MapPick, label: string, slot?: string) => (
    <MapPickButton className="option" active={picking === pick} onToggle={() => onPick(picking === pick ? null : pick)}>
      {label}{slot ? ` · ${tile(slot)}` : ''}
    </MapPickButton>
  );

  const production = effects.production;
  const builtUnits = production && unitsText(production.units, t);
  const builtLine = builtUnits && <p className="muted">{t('plan.strategy.built', { list: `${tile(production.systemId)}: ${builtUnits}` })}</p>;

  const kit: CardKit = {
    t, game, pack, round, entry, before, effects, primary, te, cost, change, setEffects, placer, list, tokenPick, pickButton,
    tile, builtLine, upgradeRow, opponents, named, toggled, onOpenShop, onStartTactical, onOpenTactical,
  };
  // Called here, not rendered as a component, so the blocks take their warnings before the rest is shown.
  const sections = () => (entry.card === undefined ? null : CARD_BLOCKS[entry.card]?.(kit) ?? null);

  const summary = card && cardSummary(card.summaryKey, lang);
  const payment = effects.payment ?? { planets: [], tradeGoods: 0 };
  const toggleManual = (open: boolean) => {
    onManualPayment(open);
    if (!open) onUpdate({ effects: { ...effects, payment: autoPay(before, cost.amount, cost.kind, pack) } });
  };

  // The card and the turn it is played in; a limit of the system stands with what the card builds.
  const cardWarnings = [...placer.at('card'), ...placer.at('action', w => !limitsSystem(w))];
  /** Whether that side of this card spends a strategy token: the domain decides, from the round's cards for my primary. */
  const costsOf = (asPrimary: boolean) => card !== undefined && costsStrategyToken(
    { ...entry, card: card.initiative, ...playOf(round, game.playerCount, card.initiative, asPrimary, mine) } as CardEntry,
    { held: mine ? heldCards(round, game.playerCount) : [] },
  );
  const ability = (asPrimary: boolean, text: string, costsToken: boolean) => (
    <button
      type="button" className={`card-ability card-ability-${asPrimary ? 'primary' : 'secondary'}`} aria-pressed={primary === asPrimary}
      onClick={() => { if (card && primary !== asPrimary) change(freshPlay(playOf(round, game.playerCount, card.initiative, asPrimary, mine))); }}
    >
      <b>{t(asPrimary ? 'plan.cards.primary' : 'plan.cards.secondary')}{costsToken && <span className="card-ability-cost">{t('plan.strategy.tokenCost')}</span>}</b>
      <span>{text}</span>
    </button>
  );
  const cardBlocks = card && summary && (
    <>
      <div className="card-abilities" role="group" aria-label={t('plan.strategy.modes')}>
        {card.changedIn === 'te' && <span className="pill pill-change">{t('plan.cards.changed')}</span>}
        {ability(true, summary.primary, costsOf(true))}
        {ability(false, summary.secondary, costsOf(false))}
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

  return (
    <EditorFrame className="strategy-editor" title={t('plan.menu.strategic')} removeLabel={t('editor.remove')} onRemove={onRemove} onDone={onDone}>
      <CardGrid
        label={t('plan.strategy.cards')} cards={cards}
        cellOf={c => ({ pressed: c.initiative === entry.card, onClick: () => pickCard(c.initiative) })}
      />
      {/* The mode and the card decide these; a warning whose block is not on the screen stands here too, where it cannot be missed. */}
      {list([...cardWarnings, ...placer.rest()])}
      {!card && <p className="muted">{t('plan.strategy.chooseCard')}</p>}
      {cardBlocks}
      {entry.card !== CARD.technology && (entry.upgrades?.length ?? 0) > 0 && (
        <Section title={t('plan.strategy.upgrades')}>{upgradeRow}</Section>
      )}
      {/* A secondary is played in another player's turn: it holds no acts. */}
      {primary && turnActs}
    </EditorFrame>
  );
}
