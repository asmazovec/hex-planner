/**
 * Whom the reminders of a step are asked of. `hintsAt` (registry.ts) gives the components; this names the players
 * whose components count for an entry's step.
 */
import { holderIn } from '../stacks';
import type { Game, GameState, RuleStep, UnitCounts } from '../types';

const any = (units: UnitCounts | undefined): boolean => Object.values(units ?? {}).some(count => (count ?? 0) > 0);

/** A player's own state stands in a system: units in its space or on its planets, or a structure there. */
const standsIn = (state: GameState, slot: string, planetIds: string[]): boolean =>
  any(state.systems[slot]) || planetIds.some(id => any(state.ground[id]) || state.docks.includes(id) || (state.pds[id] ?? 0) > 0);

/**
 * The players a step of an entry concerns, the owner first (`me` or an opponent id): a battle and an invasion also
 * concern everyone who stands in the active system or holds one of its planets, over the whole board just before the
 * entry (`board.rivals` holds the opponents). Every other step is the owner's alone.
 */
export function stepPlayers(
  game: Pick<Game, 'opponents' | 'planetOwner'>, board: GameState, owner: string | undefined, step: RuleStep, slot: string | null, planetIds: string[],
): string[] {
  const actor = owner ?? 'me';
  if ((step !== 'combat' && step !== 'invasion') || slot === null) return [actor];
  const players = [actor];
  const add = (id: string) => { if (!players.includes(id)) players.push(id); };
  if (standsIn(board, slot, planetIds) || planetIds.some(id => board.control[id] === 'me')) add('me');
  for (const { id } of game.opponents) {
    const rival = board.rivals?.[id];
    if ((rival && standsIn(rival, slot, planetIds)) || planetIds.some(planet => holderIn(game, board, planet) === id)) add(id);
  }
  return players;
}
