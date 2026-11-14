/**
 * What the editors of the plan ask of a player and the board: the automatic payment, what a component entry costs to play,
 * what a production owes, what a player holds and may lose or hand over, what a landing is offered, where a card may be aimed.
 * Each is the one implementation the old per-player function shares, asked of the table and the board.
 */
import { effectOf } from '../domain/effects/registry';
import { playedCost } from '../domain/effects/playedCost';
import { landingOffers } from '../domain/effects/points/landing';
import { genericNotes, factionNotes, HOLDING_FIELD, notesOfFirst as notesFirst, TRANSACTION_KINDS } from '../domain/holdings';
import { choosePayment, EXPEDITION_SLICES, slicePlanetCost, type PaymentKind } from '../domain/payment';
import { cardTargetsOver, type CardMapPick } from '../domain/replay/cards/targets';
import { readyToPlay } from '../domain/replay/holdings';
import { productionDueOn } from '../domain/replay/production';
import { specialtiesOf } from '../domain/specialties';
import type { ComponentKind, Entry } from '../domain/types';
import type { Turn } from './actions';
import { holderIn } from './abilities/registry';
import { legacyEntry } from './entry';
import { cardsOf, groundIn, ownerOf, payingPlanets, planetValue, tokensOnMapOf, tradeGoodWorth } from './queries';
import { shelfOf } from './shelf';
import { mapSource } from './space';
import type { Payment } from './actions';
import type { Board, ComponentId, DataPack, PlanetId, PlayerId, Slot, Table, UnitCounts } from './types';

/** The cheapest way to cover `need` from the ready planets and the trade goods of a player: least surplus burned, then fewer trade goods, then fewer planets. */
export function autoPayOn(table: Table, board: Board, pack: DataPack, player: PlayerId, need: number, kind: PaymentKind): Payment {
  const items = payingPlanets(table, board, pack, player).map(id => ({ id, value: planetValue(table, board, pack, player, id, kind) }));
  return choosePayment(items, board.players[player]?.tradeGoods ?? 0, tradeGoodWorth(table, board, pack, player, kind), need);
}

/** The planets that can pay the technology part of the expedition: ready, the player's, with a technology specialty. */
export const techSlicePlanetsOn = (table: Table, board: Board, pack: DataPack, player: PlayerId): PlanetId[] =>
  payingPlanets(table, board, pack, player).filter(id => specialtiesOf(pack, id, board.planets[id]?.attached ?? []).length > 0);

/** The payment a newly chosen expedition part starts with: its resources or influence from the ready planets, or the first ready planet with a technology specialty for the technology part. */
export function sliceAutoPaymentOn(table: Table, board: Board, pack: DataPack, player: PlayerId, sliceId: string | null): Payment {
  const cost = slicePlanetCost(sliceId);
  if (cost) return autoPayOn(table, board, pack, player, cost.amount, cost.kind);
  const attached = (id: string): string[] => board.planets[id]?.attached ?? [];
  const techPlanets = payingPlanets(table, board, pack, player).filter(id => specialtiesOf(pack, id, attached(id)).length > 0);
  return EXPEDITION_SLICES.find(s => s.id === sliceId)?.techPlanet && techPlanets.length > 0 ? { planets: [techPlanets[0]], tradeGoods: 0 } : { planets: [], tradeGoods: 0 };
}

/** What a component declares for the plan: its cost, whether it produces, the choices it asks; the registry's entry, for the screens that read the kernel only. */
export const effectOfComponent = effectOf;

/** What a component turn costs to play: its component's cost and what the components it uses declare for following it, in one kind. */
export const playedCostOf = (table: Table, pack: DataPack, turn: Turn): { kind: PaymentKind; amount: number } | undefined =>
  playedCost(pack, legacyEntry(table, turn), effectOf);

/** What a turn owes for the units it produces, asked of the board before it (the editor's label, the shop counter): the same sum the replay's check makes. */
export function productionDueOnBoard(table: Table, board: Board, pack: DataPack, player: PlayerId, units: UnitCounts, turn?: Turn): number {
  return productionDueOn(groundIn(table, board, pack, player), units, pack, turn ? legacyEntry(table, turn) : undefined);
}

/** The components a player can play as things stand: what they hold and is not exhausted, and the sheet and legendary planets that are theirs. */
export function readyToPlayOn(table: Table, board: Board, pack: DataPack, player: PlayerId): Set<ComponentId> {
  const control = Object.fromEntries(Object.keys(board.planets).filter(id => board.planets[id].owner === player).map(id => [id, 'me' as const]));
  return readyToPlay(pack, shelfOf(table, board, player), table.players.find(p => p.id === player)?.faction ?? '', control);
}

/** A promissory note of a player and the player who holds it now; nobody when it was played and purged, or taken off by hand. */
export interface NoteHolding { id: ComponentId; holder: PlayerId | undefined }

/** Every note of a player, the generic ones and then those of their faction, each with who holds it now. */
export function notesOf(table: Table, board: Board, pack: DataPack, owner: PlayerId): NoteHolding[] {
  const faction = table.players.find(p => p.id === owner)?.faction ?? '';
  const holders = table.players.map(p => p.id);
  return [...genericNotes(pack, owner), ...factionNotes(pack, faction, owner)]
    .map(id => ({ id, holder: holders.find(player => cardsOf(board, player, 'promissory').some(c => c.id === id)) }));
}

/** What a transaction offers, with the notes of `player` first. */
export const notesOfFirst = notesFirst;

const HELD_KINDS: ComponentKind[] = ['technology', 'actionCard', 'relic', 'promissory', 'publicObjective', 'secretObjective', 'exploration'];
const copiesOf = (board: Board, player: PlayerId, kind: ComponentKind): ComponentId[] =>
  cardsOf(board, player, kind).flatMap(c => Array.from({ length: Math.max(1, c.count) }, () => c.id));

/** What a turn of the player can discard or lose: everything they held as a card before it, a hand with its repeats, and what the turn brings, less what it already loses. */
export function losableOf(board: Board, player: PlayerId, turn: { gains?: ComponentId[]; spends?: ComponentId[] }): ComponentId[] {
  const all = [...HELD_KINDS.flatMap(kind => copiesOf(board, player, kind)), ...(turn.gains ?? [])];
  for (const id of turn.spends ?? []) {
    const at = all.indexOf(id);
    if (at >= 0) all.splice(at, 1);
  }
  return all;
}

/** What a player can still hand over in a transaction: the notes held, then the action cards in hand, each once, less the copies already `chosen`. */
export function tradableOf(board: Board, player: PlayerId, chosen: ComponentId[] = [], kinds: readonly ComponentKind[] = TRANSACTION_KINDS): ComponentId[] {
  const left = [...chosen];
  const free = kinds.filter(kind => HOLDING_FIELD[kind] !== undefined).flatMap(kind => copiesOf(board, player, kind)).filter(id => {
    const at = left.indexOf(id);
    if (at >= 0) left.splice(at, 1);
    return at < 0;
  });
  return [...new Set(free)];
}

/** What the landing block offers a player beyond ground forces: structures, landing from planets, ships sent away. */
export const landingOffersOn = (table: Table, board: Board, pack: DataPack, player: PlayerId): ReturnType<typeof landingOffers> =>
  landingOffers(pack, holderIn(table, board, player));

/** The systems a card's effect can be aimed at on the map: `before` is the board just before the card, `latest` the one the map shows. */
export function cardTargetsOn(
  table: Table, before: Board, latest: Board, pack: DataPack, player: PlayerId, entry: Extract<Entry, { type: 'strategic' | 'secondary' }>, pick: CardMapPick,
): Slot[] {
  return cardTargetsOver({
    map: mapSource(table, latest), expansions: table.expansions, tokens: tokensOnMapOf(before, player),
    fits: (planetId, kind) => (kind === 'dock'
      ? ownerOf(latest, planetId) === player && (latest.planets[planetId]?.structures.spacedock ?? 0) > 0
      : ownerOf(latest, planetId) === player),
  }, pack, entry, pick);
}

