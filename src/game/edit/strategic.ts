/**
 * The edits of a strategy card turn, over `Turn.action`: the card and its side, the choices of its effects, the tokens
 * given, the production and structures it builds, and the payment that follows a new price. Pure functions
 * `Turn -> Turn` (a turn that plays no card comes back as it is), the same rules as `src/domain/strategy.ts` over the old
 * entry; each is tested against its old twin.
 */
import { withLeadershipTokens, withProduction, withStructure, withSystem } from '../../domain/strategy';
import type { CardEffects, StructureKind, UnitId } from '../../domain/types';
import type { Turn, Strategic, Secondary } from '../actions';
import type { Round } from '../round';
import { autoPayOn } from '../planQueries';
import type { Board, DataPack, PlayerId, Table } from '../types';
import { cardCostOn, cardEntryOf, effectsOf, isCardTurn, isPrimary, primaryForTokenOf, type CardTurn } from './strategicRead';

/** A change to a card turn: the card, its side, the flag of a primary played for a token, the effects. A key left out stays; `effects: undefined` clears them. */
export interface CardPatch { card?: number; side?: 'primary' | 'secondary'; forToken?: boolean; effects?: CardEffects | undefined }

/** The turn with its card action rebuilt from the patch; a turn that plays no card is returned as it is. */
export function withCard(turn: Turn, patch: CardPatch, fresh = false): Turn {
  if (!isCardTurn(turn)) return turn;
  const was = turn.action;
  const card = 'card' in patch ? patch.card : was.card;
  const effects = 'effects' in patch ? patch.effects : was.effects;
  const side = patch.side ?? (isPrimary(turn) ? 'primary' : 'secondary');
  const flag = 'forToken' in patch ? patch.forToken : was.kind === 'strategic' ? was.forToken : undefined;
  const nested = !fresh && side === 'primary' && was.kind === 'strategic' ? was.nested : undefined;
  const action: Strategic | Secondary = side === 'primary'
    ? { kind: 'strategic', ...(card !== undefined ? { card } : {}), ...(flag ? { forToken: true } : {}), ...(effects ? { effects } : {}), ...(nested ? { nested } : {}) }
    : { kind: 'secondary', ...(card !== undefined ? { card } : {}), ...(effects ? { effects } : {}) };
  return { ...turn, action, ...(fresh && side === 'secondary' ? { acts: [] } : {}) };
}

/** A switch of the card or of its side starts the play over: what the old one chose (effects, payment, research) goes, with the free action it started and, for a secondary, the transactions. */
export const withFreshPlay = (turn: Turn, patch: CardPatch): Turn => withCard(turn, { ...patch, effects: undefined }, true);

/** The effects changed by a function of the old ones; empty effects are dropped. */
export function onEffects(turn: Turn, change: (effects: CardEffects) => CardEffects): Turn {
  if (!isCardTurn(turn)) return turn;
  const next = change(effectsOf(turn));
  return withCard(turn, { effects: Object.keys(next).length > 0 ? next : undefined });
}

/** The next turn with the payment following its new price: a new cost pays automatically from the ready planets, unless the payment was chosen by hand. */
function repriced(table: Table, board: Board, pack: DataPack, turn: CardTurn, next: CardTurn, manual: boolean): Turn {
  if (manual) return next;
  const was = cardCostOn(table, board, pack, turn);
  const cost = cardCostOn(table, board, pack, next);
  if (cost.amount === was.amount && cost.kind === was.kind) return next;
  return withCard(next, { effects: { ...effectsOf(next), payment: autoPayOn(table, board, pack, turn.player, cost.amount, cost.kind) } });
}

/**
 * A change to the turn with the payment following the new price: a new cost pays automatically from the ready planets,
 * unless the payment was chosen by hand (`manual`). `board` is the board just before the turn.
 */
export function withCardChange(table: Table, board: Board, pack: DataPack, turn: Turn, patch: CardPatch, manual: boolean): Turn {
  return isCardTurn(turn) ? repriced(table, board, pack, turn, withCard(turn, patch) as CardTurn, manual) : turn;
}

/** A switch of the card or of its side (`withFreshPlay`), repriced as `withCardChange` does: what the old play paid goes, the new price pays anew. */
export function withFreshChange(table: Table, board: Board, pack: DataPack, turn: Turn, patch: CardPatch, manual: boolean): Turn {
  return isCardTurn(turn) ? repriced(table, board, pack, turn, withFreshPlay(turn, patch) as CardTurn, manual) : turn;
}

/** The effects with a chosen system; what belongs to the old system goes. */
export function withChosenSystem(table: Table, turn: Turn, systemId: string): Turn {
  return isCardTurn(turn) ? withCard(turn, { effects: withSystem(cardEntryOf(table, turn), systemId, table.expansions) }) : turn;
}

/** One tap of the shop: a card produces in one system, ground forces by planet. */
export const withCardProduction = (turn: Turn, systemId: string, unit: UnitId, planetId: string | null, amount: 1 | -1): Turn =>
  onEffects(turn, effects => withProduction(effects, systemId, unit, planetId, amount));

/** A structure a card builds, or taken back. */
export const withCardStructure = (turn: Turn, kind: StructureKind, planetId: string, amount: 1 | -1): Turn =>
  onEffects(turn, effects => withStructure(effects, kind, planetId, amount));

/** The tokens given; with `leadership` what goes beyond the free ones is bought. */
export const withTokens = (turn: Turn, tokens: CardEffects['tokens'], leadership: boolean): Turn =>
  onEffects(turn, effects => (leadership ? withLeadershipTokens(effects, tokens, isPrimary(turn)) : { ...effects, tokens }));

// ---------------------------------------------------------------------------------------------------------------------
// What the round decides about the cards.

/** How a card is played: its primary is free on a card of mine and on a rival's, and costs a token otherwise. */
export function playOfOn(round: Round, card: number, primary: boolean, mine: boolean): Pick<CardPatch, 'side' | 'forToken'> {
  if (!primary) return { side: 'secondary', forToken: undefined };
  return { side: 'primary', forToken: mine && !round.held.includes(card) ? true : undefined };
}

const isMainPrimary = (turn: Turn, held: number[]): boolean =>
  isCardTurn(turn) && isPrimary(turn) && !primaryForTokenOf(turn, held) && turn.status !== 'cancelled';

/** What a tapped card starts as: the primary of a card of mine not played yet this round, the secondary otherwise. A rival's cards are not planned: the primary. */
export function startsAsPrimaryOn(round: Round, viewer: PlayerId, card: number, turn: Turn): boolean {
  if (turn.player !== viewer) return true;
  const played = round.turns.some(other => other.id !== turn.id && other.player === viewer && isMainPrimary(other, round.held) && (other.action as Strategic).card === card);
  return round.held.includes(card) && !played;
}

/**
 * The round with the `forToken` of the viewer's primaries following its cards, so that a saved turn agrees with the
 * replay. With no card chosen the flags stay; turns that agree stay the same objects.
 */
export function withForTokenOfRound(round: Round, viewer: PlayerId): Round {
  if (round.held.length === 0) return round;
  let changed = false;
  const turns = round.turns.map(turn => {
    if (turn.action.kind !== 'strategic' || turn.player !== viewer) return turn;
    const forToken = primaryForTokenOf(turn as CardTurn, round.held) || undefined;
    if (turn.action.forToken === forToken) return turn;
    changed = true;
    return withCard(turn, { forToken });
  });
  return changed ? { ...round, turns } : round;
}
