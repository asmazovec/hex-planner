/**
 * What the card editors ask of a strategy card turn over the table and the board: how it is played, what it costs, the
 * tokens it owes and gives, where it can be aimed, what it buys. The same rules as the functions of
 * `src/domain/strategy.ts` over the old entry and state; each is tested against its old twin.
 */
import { appliedOn, holderIn } from '../abilities/registry';
import { componentById } from '../../domain/components';
import { costsStrategyToken, strategyTokensOwedOf, cardCostOf, type CardEntry } from '../../domain/strategy';
import { handlerOf } from '../../domain/replay/cards/index';
import { researchLimit } from '../../domain/replay/cards/technology';
import { placesOn, type ProductionPlace } from '../../domain/replay/production';
import type { PaymentKind } from '../../domain/payment';
import { readyLimit } from '../../domain/replay/cards/diplomacy';
import { MECATOL_PLANETS } from '../../domain/mecatol';
import { seatSlots } from '../../domain/mapBuilder';
import type { PlanetDef } from '../../domain/types';
import type { Turn, Strategic, Secondary } from '../actions';
import { factsOf } from '../turnFacts';
import { productionDueOnBoard } from '../planQueries';
import { groundIn, ownerOf, tokensOnMapOf } from '../queries';
import { planetsIn, playerCountOf } from '../space';
import type { Board, DataPack, PlayerId, Table } from '../types';

export type CardTurn = Turn & { action: Strategic | Secondary };

/** Whether the turn plays a strategy card, its primary or its secondary. */
export const isCardTurn = (turn: Turn): turn is CardTurn => turn.action.kind === 'strategic' || turn.action.kind === 'secondary';

/** The primary is the strategic action, the secondary the other. */
export const isPrimary = (turn: Turn): boolean => turn.action.kind === 'strategic';

/** The old entry of a card turn, for the handlers of the cards that still read one. */
export const cardEntryOf = (table: Table, turn: CardTurn): CardEntry => factsOf(table, turn) as CardEntry;

/** The effects a card turn chose; empty before any choice. */
export const effectsOf = (turn: Turn): NonNullable<Strategic['effects']> => (isCardTurn(turn) ? turn.action.effects ?? {} : {});

/** The card played, by initiative. */
export const cardOf = (turn: Turn): number | undefined => (isCardTurn(turn) ? turn.action.card : undefined);

/**
 * Whether a primary is played for a token: the cards held this round decide (83.3); the turn's own flag counts only while
 * no card of the round is chosen.
 */
export const primaryForTokenOf = (turn: CardTurn, held: number[]): boolean =>
  (held.length > 0 ? turn.action.card !== undefined && !held.includes(turn.action.card) : turn.action.kind === 'strategic' && turn.action.forToken === true);

/** How many strategy tokens the turn owes: the components in force for the player, and those the turn names, say how many. */
export function strategyTokensOwedOn(table: Table, board: Board, pack: DataPack, turn: CardTurn, play: { held?: number[]; free?: boolean } = {}): number {
  return strategyTokensOwedOf(cardEntryOf(table, turn), play, holderIn(table, board, turn.player), pack);
}

/** Whether a token is owed at all, before the components change its number. */
export const costsTokenOn = (table: Table, turn: CardTurn, play: { held?: number[]; free?: boolean } = {}): boolean =>
  costsStrategyToken(cardEntryOf(table, turn), play);

/** What the card gives to distribute: its own tokens, with `board` the board just before the turn (Warfare reads where my tokens stand). */
export function freeTokensOn(table: Table, board: Board, turn: CardTurn): number {
  const entry = cardEntryOf(table, turn);
  return handlerOf(entry.card).freeTokens?.(entry, table.expansions, { tokensOnMap: tokensOnMapOf(board, turn.player) }) ?? 0;
}

/** The tokens the technologies researched give instead of being researched (Propagation), for the card's free tokens. */
export function researchTokensGivenOn(table: Table, board: Board, pack: DataPack, player: PlayerId, ids: readonly string[] | undefined): number {
  return (ids ?? []).filter(id => componentById(pack, id)?.kind === 'technology')
    .reduce((sum, technology) => sum + appliedOn(table, board, pack, player, 'researchTokens', 0, { technology }).value, 0);
}

/** What the turn owes in resources or influence: bought tokens, research, or the units it produces, as the check asks them. */
export function cardCostOn(table: Table, board: Board, pack: DataPack, turn: CardTurn): { kind: PaymentKind; amount: number } {
  const faction = table.players.find(p => p.id === turn.player)?.faction ?? '';
  return cardCostOf(cardEntryOf(table, turn), faction, holderIn(table, board, turn.player), pack, units => productionDueOnBoard(table, board, pack, turn.player, units, turn));
}

/** How many technologies the card lets the player research, and how many at its price (the card's own rule). */
export function researchLimitOn(table: Table, board: Board, pack: DataPack, turn: CardTurn): number {
  const faction = table.players.find(p => p.id === turn.player)?.faction ?? '';
  return researchLimit(cardEntryOf(table, turn), holderIn(table, board, turn.player).holdings, { pack, faction });
}

/** Where the units a card bought stand: the system's space area, and the planets, as the replay places them (68.3). */
export function purchasesOn(table: Table, board: Board, pack: DataPack, turn: CardTurn, slot: string): ProductionPlace[] {
  return boughtOn(table, board, pack, turn.player, effectsOf(turn), slot);
}

/** The same for the effects of any turn that produces (a component action too): what its production holds in the system. */
export function boughtOn(table: Table, board: Board, pack: DataPack, player: PlayerId, effects: NonNullable<Strategic['effects']>, slot: string): ProductionPlace[] {
  const production = effects.production?.systemId === slot ? effects.production : undefined;
  return placesOn(groundIn(table, board, pack, player), slot, production?.units ?? {}, pack, production?.ground);
}

/** The planets the card may ready: my exhausted ones, or for the base primary mine in the chosen system; those already chosen stay listed. */
export function readyChoicesOn(table: Table, board: Board, pack: DataPack, turn: CardTurn): PlanetDef[] {
  const mine = (id: string): boolean => ownerOf(board, id) === turn.player;
  const effects = effectsOf(turn);
  if (readyLimit(cardEntryOf(table, turn), table.expansions) === null) {
    return effects.systemId ? planetsIn(table, board, pack, effects.systemId).filter(mine).flatMap(id => pack.planets[id] ?? []) : [];
  }
  const exhausted = Object.keys(board.planets).filter(id => board.planets[id].exhausted && mine(id));
  return [...new Set([...exhausted, ...(effects.readied ?? [])])].flatMap(id => pack.planets[id] ?? []);
}

/** Whether the player holds a planet of the Mecatol Rex system. */
export const controlsMecatolOn = (board: Board, player: PlayerId): boolean => MECATOL_PLANETS.some(id => ownerOf(board, id) === player);

/** The slot of a player's home: the faction's home tile if it is on the map (for an off-map home with its gate on the map, the tile's own id), otherwise the slot of the seat, with an empty seat the first slot with a tile; none with nothing on the map. */
export function homeSlotOn(table: Table, pack: DataPack, player: PlayerId): string | null {
  const who = table.players.find(p => p.id === player);
  const faction = who && pack.factions[who.faction];
  if (!who || !faction) return null;
  const onMap = (tile: string | undefined) => Object.keys(table.map).find(slot => table.map[slot].split('@')[0] === tile);
  const own = onMap(faction.homeTile) ?? (onMap(faction.gateTile) ? faction.homeTile : undefined);
  if (own) return own;
  const seat = seatSlots(playerCountOf(table), pack, table.layout)[who.seat - 1];
  if (seat && table.map[seat]) return seat;
  return Object.keys(table.map).find(slot => slot !== '0,0') ?? null;
}
