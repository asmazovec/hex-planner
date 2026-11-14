import type { DataPack, Game, RuleStep, ComponentDef } from '../../../../domain/types';
import type { GameState } from '../types';
import { holderOf, inForceOf, registryOf, SHEET_KIND, readyComponents, effectOf, holderRuleOf } from '../../../../domain/effects/registry';
import { noteAddress, noteBase, componentById } from '../../../../domain/components';
import { speaksIn } from '../../../../domain/effects/holder';
/**
 * The reminders of a step: the hint components with that step which the named players (`me` or an opponent id) hold
 * ready, in hand or in play, hold as a secret objective, or have by their faction sheet (abilities, mech, breakthrough
 * once held) or a legendary planet they control. A component held by several of them, or in several copies, is given once.
 */
export function hintsAt(pack: DataPack, board: GameState, step: RuleStep, players: string[]): ComponentDef[] {
  return hintsAtSteps(pack, board, [step], players).get(step) ?? [];
}
/**
 * The reminders of several steps at once: what the players hold is looked through once, not once for each step. `players`
 * are those the steps concern, the actor first (`stepPlayers`); a component that speaks in another player's action
 * (`holder: 'others'`) is reminded of through every other player who holds it, whether or not they stand in the step.
 */
export function hintsAtSteps(pack: DataPack, board: GameState, steps: RuleStep[], players: string[]): Map<RuleStep, ComponentDef[]> {
  const { order } = registryOf(pack);
  const actor = players[0];
  const holders = new Map<string, Set<string>>();
  for (const player of ['me', ...Object.keys(board.rivals ?? {})]) {
    const state = player === 'me' ? board : board.rivals?.[player];
    if (!state) continue;
    // A secret objective in hand, and a public one revealed and not yet scored by the player, are reminded of at the status step.
    const objectives = [...state.holdings.secrets, ...(board.revealed ?? []).filter(id => !state.holdings.scored.includes(id))];
    const sheet = inForceOf(pack, { holdings: state.holdings, faction: state.faction, control: state.control }).filter(id => SHEET_KIND.test(id));
    for (const id of [...readyComponents(pack, state.holdings), ...objectives, ...sheet]) {
      // A note of one's own is not played from one's own hand (LRR 69.2).
      if (noteAddress(id) === player) continue;
      if (effectOf(pack, id)?.tier === 'hint') (holders.get(id) ?? holders.set(id, new Set()).get(id)!).add(player);
    }
  }
  const sorted = [...holders.keys()].sort((a, b) => order.get(noteBase(a))! - order.get(noteBase(b))!);
  const speaks = (id: string): boolean => {
    const rule = holderRuleOf(pack, id);
    return [...holders.get(id)!].some(player => speaksIn(rule, player === actor, players.includes(player)));
  };
  return new Map(steps.map(step => [step, sorted.filter(id => effectOf(pack, id)?.hintAt?.includes(step) === true && speaks(id)).flatMap(id => componentById(pack, id) ?? [])]));
}

/** The same for a player of a game: `state` is their own, `shared` mine, which keeps the laws. */
export const inForce = (pack: DataPack, game: Pick<Game, 'faction'>, state: GameState, shared: GameState = state): string[] =>
  inForceOf(pack, holderOf(game, state, shared));
