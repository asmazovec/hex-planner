import type { ReactNode } from 'react';
import type { KernelView } from '../kernelView';
import { useTranslation } from 'react-i18next';
import { strategyCards } from '../../../data/loadPack';
import { textOf } from '../../../domain/components';
import { upgradesOf, upgradeTech } from '../../../domain/holdings';
import type { Turn } from '../../../game/actions';
import { withCard, withCardChange, withFreshChange, playOfOn, startsAsPrimaryOn, type CardPatch } from '../../../game/edit/strategic';
import {
  cardCostOn, cardEntryOf, effectsOf, freeTokensOn, isCardTurn, isPrimary, researchTokensGivenOn, strategyTokensOwedOn,
} from '../../../game/edit/strategicRead';
import { autoPayOn } from '../../../game/planQueries';
import { poolsOf, upgradesOf as upgradesHeld } from '../../../game/queries';
import { mapSource } from '../../../game/space';
import type { Round } from '../../../game/round';
import { CARD } from '../../../domain/strategy';
import type { CardEffects, DataPack, UpgradeId, Warning } from '../../../domain/types';
import { EntryUpgrades } from '../blocks/EntryUpgrades';
import { PaymentBlock } from '../blocks/PaymentBlock';
import { systemTitle } from '../../map/systemName';
import { TokenTiles } from '../blocks/TokenTiles';
import { limitsSystem, placeWarnings } from '../../feedback/warningPlaces';
import { WarningList } from '../../feedback/WarningText';
import { CARD_BLOCKS, playersBeside, type CardKit } from './cards';
import { unitsText } from '../../units/unitsText';
import { Section } from '../../primitives/Section';
import { CardGrid } from '../blocks/CardGrid';
import { MapPickButton } from '../../primitives/MapPickButton';
import { EditorFrame } from '../../primitives/EditorFrame';
import { EditorPart } from '../../primitives/EditorPart';
import { StepHints } from '../../feedback/StepHints';

/** What the next tap on the map chooses. */
export type MapPick = 'system' | 'build' | 'dock';

export interface StrategyEditorProps {
  /** The table and the board just before the turn, as the kernel keeps them: names, notes, reminders, prices and the places of warnings are read from it. */
  view: KernelView;
  pack: DataPack;
  /** The round of the turn, as the kernel keeps it: the cards held decide how a card is played. */
  round: Round;
  /** The card turn being edited, and the writer of its changes: a changed turn is handed back whole. */
  turn: Turn;
  onChange: (turn: Turn) => void;
  warnings: Warning[];
  manualPayment: boolean;
  /** What the next tap on the map will choose. */
  picking: MapPick | null;
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
  /**
   * «В этом ходу», the last part of the editor under its own heading: what the turn holds beside its action. A secondary
   * is played in another player's turn, so its part holds only what was taken and discarded (94.1: a transaction is the
   * active player's).
   */
  common?: ReactNode;
}

/** A strategy card played: first the card, then its primary or its secondary; either stays open, and a switch starts the play over. */
export function StrategyEditor({
  pack, view, round, turn: given, warnings, manualPayment, picking,
  onChange, onManualPayment, onPick, onOpenShop, onStartTactical, onOpenTactical, onDone, onRemove, common,
}: StrategyEditorProps) {
  const { t } = useTranslation();
  const { table, board } = view;
  if (!isCardTurn(given)) return null;
  const turn = given;
  const cards = strategyCards(table.expansions);
  const card = cards.find(c => c.initiative === turn.action.card);
  const primary = isPrimary(turn);
  const effects = effectsOf(turn);
  const entry = cardEntryOf(table, turn);
  const player = turn.player;
  const mine = turn.player === table.viewer;
  const faction = table.players.find(p => p.id === player)?.faction ?? '';
  const te = table.expansions.includes('te');
  const cost = cardCostOn(table, board, pack, turn);
  const change = (patch: CardPatch) => onChange(withCardChange(table, board, pack, turn, patch, manualPayment));
  const setEffects = (patch: CardEffects) => change({ effects: { ...effects, ...patch } });
  const tile = (slot: string) => t('plan.strategy.tile', { name: systemTitle(mapSource(table, board), pack, slot, t) });
  const others = playersBeside(table, pack, turn.player, t);
  const toggled = (list: string[] | undefined, id: string) =>
    (list?.includes(id) ? list.filter(other => other !== id) : [...(list ?? []), id]);
  const pickCard = (initiative: number) => {
    if (initiative === turn.action.card) return;
    const play = { card: initiative, ...playOfOn(round, initiative, startsAsPrimaryOn(round, table.viewer, initiative, turn), mine) };
    onChange(withFreshChange(table, board, pack, turn, play, manualPayment));
  };
  const placer = placeWarnings(warnings, entry);
  const list = (shown: Warning[]) => <WarningList warnings={shown} table={table} board={board} pack={pack} />;
  const tokenPick = (rearrange = false, onTokens: (tokens: CardEffects['tokens']) => void = tokens => setEffects({ tokens })) => (
    <Section warnings={list(placer.at('tokens'))}>
      <TokenTiles
        free={freeTokensOn(table, board, turn) + (turn.action.card === CARD.technology ? researchTokensGivenOn(table, board, pack, player, effects.researched) : 0)} values={effects.tokens ?? {}} onChange={onTokens}
        pools={rearrange ? poolsOf(board, player) : undefined}
      />
    </Section>
  );
  /** The row of unit upgrades writes the technologies researched: each unit stands for its upgrade technology. */
  const researched = effects.researched ?? [];
  const setUpgrades = (upgrades: UpgradeId[]) => {
    const others = researched.filter(id => upgradesOf({ technologies: [id] }, pack).length === 0);
    const next = [...others, ...upgrades.flatMap(kind => upgradeTech(pack, faction, kind) ?? [])];
    const { researched: old, ...rest } = effects;
    void old;
    change({ effects: next.length > 0 ? { ...rest, researched: next } : rest });
  };
  const upgradeRow = (
    <EntryUpgrades
      upgrades={upgradesOf({ technologies: researched }, pack)} before={upgradesHeld(board, pack, player)} table={table} player={player} pack={pack}
      onChange={setUpgrades}
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
    t, table, board, pack, round, turn, entry, player, faction, effects, primary, te, cost, change, setEffects, placer, list, tokenPick, pickButton,
    tile, builtLine, upgradeRow, others, toggled, onOpenShop, onStartTactical, onOpenTactical,
  };
  // Called here, not rendered as a component, so the blocks take their warnings before the rest is shown.
  const sections = () => (turn.action.card === undefined ? null : CARD_BLOCKS[turn.action.card]?.(kit) ?? null);
  const payment = effects.payment ?? { planets: [], tradeGoods: 0 };
  const toggleManual = (open: boolean) => {
    onManualPayment(open);
    if (!open) onChange(withCard(turn, { effects: { ...effects, payment: autoPayOn(table, board, pack, player, cost.amount, cost.kind) } }));
  };
  // The card and the turn it is played in; a limit of the system stands with what the card builds.
  const cardWarnings = [...placer.at('card'), ...placer.at('action', w => !limitsSystem(w))];
  /** Whether that side of this card spends a strategy token: the domain decides, from the round's cards for my primary. */
  const costsOf = (asPrimary: boolean) => card !== undefined && strategyTokensOwedOn(
    table, board, pack, withCard(turn, { card: card.initiative, ...playOfOn(round, card.initiative, asPrimary, mine) }) as typeof turn,
    { held: mine ? round.held : [] },
  ) > 0;
  const ability = (asPrimary: boolean, text: string, costsToken: boolean) => (
    <button
      type="button" className={`card-ability card-ability-${asPrimary ? 'primary' : 'secondary'}`} aria-pressed={primary === asPrimary}
      onClick={() => { if (card && primary !== asPrimary) onChange(withFreshChange(table, board, pack, turn, playOfOn(round, card.initiative, asPrimary, mine), manualPayment)); }}
    >
      <b>{t(asPrimary ? 'plan.cards.primary' : 'plan.cards.secondary')}{costsToken && <span className="card-ability-cost">{t('plan.strategy.tokenCost')}</span>}</b>
      <span>{text}</span>
    </button>
  );
  const cardBlocks = card && (
    <>
      <div className="card-abilities" role="group" aria-label={t('plan.strategy.modes')}>
        {card.changedIn === 'te' && <span className="pill pill-change">{t('plan.cards.changed')}</span>}
        {ability(true, textOf(pack, `strategy:${card.id}`), costsOf(true))}
        {ability(false, textOf(pack, `strategy:${card.id}#secondary`), costsOf(false))}
      </div>
      {sections()}
      {(cost.amount > 0 || payment.planets.length > 0 || payment.tradeGoods > 0) && (
        <PaymentBlock
          need={cost.amount} payment={payment} view={view} player={player} pack={pack} manual={manualPayment} kind={cost.kind}
          onManual={toggleManual} onChange={next => onChange(withCard(turn, { effects: { ...effects, payment: next } }))}
        >
          {list(placer.at('payment'))}
        </PaymentBlock>
      )}
    </>
  );
  return (
    <EditorFrame className="strategy-editor" title={t('plan.menu.strategic')} removeLabel={t('editor.remove')} onRemove={onRemove} onDone={onDone}>
      {/* The card's own part is named by what is played: the card and its ability. */}
      <EditorPart title={card ? t(primary ? 'plan.strategy.partPrimary' : 'plan.strategy.partSecondary', { card: card.name }) : t('editor.setup')}>
        <CardGrid
          label={t('plan.strategy.cards')} cards={cards}
          cellOf={c => ({ pressed: c.initiative === turn.action.card, onClick: () => pickCard(c.initiative) })}
        />
        {/* The mode and the card decide these; a warning whose block is not on the screen stands here too, where it cannot be missed. */}
        {list([...cardWarnings, ...placer.rest()])}
        {!card && <p className="muted">{t('plan.strategy.chooseCard')}</p>}
        {cardBlocks}
        {/* The reminders of a card played concern everyone at the table: the researcher, the one who may react. */}
        <StepHints pack={pack} table={table} board={board} step="card" players={['me', ...others.flatMap(o => (o.value !== null && o.value !== 'me' ? [o.value] : []))]} />
      </EditorPart>
      {common}
    </EditorFrame>
  );
}
