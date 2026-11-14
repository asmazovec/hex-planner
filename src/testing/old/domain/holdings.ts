import type { DataPack, ComponentDef, StartHoldings, ComponentKind, LeaderState } from '../../../domain/types';
import type { Game } from './types';
import type { Holdings } from './types';
import { noteAddress, textOf, componentById, noteId } from '../../../domain/components';
import { type NotePlace, genericNotes, factionNotes, kindOf, HOLDING_FIELD, COPIED } from '../../../domain/holdings';

/**
 * The player a note belongs to, whoever holds it: its address, when that player is in the game. `viewer` is the player
 * the game is shown as (`gameAs`), who is not among its opponents. None for a catalogue id.
 */
export function noteOwner(game: Pick<Game, 'opponents'>, id: string, viewer = 'me'): string | undefined {
  const address = noteAddress(id);
  return address !== undefined && (address === viewer || game.opponents.some(o => o.id === address)) ? address : undefined;
}
/** The text of a note as it reads in this game: the `<color>` of a generic note is its owner, named by `nameOf`. */
export function noteText(game: Pick<Game, 'opponents'>, pack: DataPack, id: string, nameOf: (player: string) => string, viewer = 'me'): string {
  const owner = noteOwner(game, id, viewer);
  const text = textOf(pack, id);
  return owner === undefined ? text : text.replaceAll('<color>', nameOf(owner));
}
/**
 * The cards a catalogue note stands for in a game: a generic note is one card of each player, a faction's note the
 * card of each player of that faction. A note of a faction nobody plays, and any other component, is itself.
 */
export function noteCards(game: Pick<Game, 'faction' | 'opponents'>, pack: DataPack, def: ComponentDef): ComponentDef[] {
  if (def.kind !== 'promissory' || noteAddress(def.id) !== undefined) return [def];
  const players = [{ id: 'me', faction: game.faction }, ...game.opponents];
  const cards = players.filter(p => def.faction === undefined || def.faction === p.faction).flatMap(p => componentById(pack, noteId(def.id, p.id)) ?? []);
  return cards.length > 0 ? cards : [def];
}
/**
 * Every note of a player (`me` or an opponent id), the generic ones and then those of their faction, each with who
 * holds it now: `holdings` are those of every player, by `me` and opponent id. A note nobody holds was played and
 * purged, or was taken off by hand.
 */
export function ownNotes(game: Pick<Game, 'faction' | 'opponents'>, pack: DataPack, owner: string, holdings: Record<string, Holdings | undefined>): NotePlace[] {
  const faction = owner === 'me' ? game.faction : game.opponents.find(o => o.id === owner)?.faction ?? '';
  const holders = Object.keys(holdings);
  return [...genericNotes(pack, owner), ...factionNotes(pack, faction, owner)]
    .map(id => ({ id, holder: holders.find(player => holdings[player]?.promissory.includes(id)) }));
}
export const playerStart = (game: Game, player: string): StartHoldings | undefined =>
  (player === 'me' ? game.start.me : game.opponents.some(o => o.id === player) ? game.start.opponents[player] ?? {} : undefined);
export const withStart = (game: Game, player: string, start: StartHoldings): Game => ({
  ...game,
  start: player === 'me' ? { ...game.start, me: start } : { ...game.start, opponents: { ...game.start.opponents, [player]: start } },
});
/**
 * Marks by hand what a player (`me` or an opponent id) held when the plan begins. The kind of the id decides the place:
 * a hand of action cards and the relic fragments keep repeats and lose one copy at a time, everything else is held once. Leaders have `setLeader`.
 * A promissory note is one card: marked with a player, it leaves whoever else had it, and taken off a player who is not
 * its owner, it is back with its owner.
 */
export function setStartHolding(game: Game, player: string, id: string, present: boolean): Game {
  const start = playerStart(game, player);
  if (!start) return game;
  const kind = kindOf(id) as ComponentKind;
  if (kind === 'breakthrough') {
    if ((start.breakthrough !== undefined) === present) return game;
    const { breakthrough, ...rest } = start;
    void breakthrough;
    return withStart(game, player, present ? { ...rest, breakthrough: 'held' } : rest);
  }
  const field = HOLDING_FIELD[kind];
  if (!field) return game;
  const list = start[field] ?? [];
  const at = list.indexOf(id);
  if (present ? at >= 0 && !COPIED.includes(field) : at < 0) return game;
  const next = withStart(game, player, { ...start, [field]: present ? [...list, id] : list.filter((_, i) => i !== at) });
  const owner = field === 'promissory' ? noteAddress(id) : undefined;
  if (owner === undefined) return next;
  if (!present) return owner === player ? next : setStartHolding(next, owner, id, true);
  const without = (other: StartHoldings): StartHoldings => (other.promissory?.includes(id) ? { ...other, promissory: other.promissory.filter(held => held !== id) } : other);
  return {
    ...next,
    start: {
      me: player === 'me' ? next.start.me : without(next.start.me),
      opponents: Object.fromEntries(Object.entries(next.start.opponents).map(([other, theirs]) => [other, other === player ? theirs : without(theirs)])),
    },
  };
}
/** Marks by hand the state of a player's leader when the plan begins; `null` locks it again. */
export function setLeader(game: Game, player: string, id: string, state: LeaderState | null): Game {
  const start = playerStart(game, player);
  if (!start || (start.leaders?.[id] ?? null) === state) return game;
  const { [id]: old, ...leaders } = start.leaders ?? {};
  void old;
  return withStart(game, player, { ...start, leaders: state ? { ...leaders, [id]: state } : leaders });
}
