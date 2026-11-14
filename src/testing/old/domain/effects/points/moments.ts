import { type MomentHook } from '../../../../../domain/effects/points/moments';
import type { GameState } from '../../types';
import type { Ability } from '../../../../../domain/effects/types';
import { inForceOf, holderOf, orderOf, effectOf } from '../../../../../domain/effects/registry';
import { type MomentTurn } from './momentsTurns';

/** Where a moment happens: the same fields as the turn, less the component. */
export type Moment = Omit<MomentTurn, 'id' | 'player' | 'states'> & { player?: string; states?: Record<string, GameState> };
export type Extra<H extends MomentHook> = Omit<Parameters<NonNullable<Ability[H]>>[0], keyof MomentTurn>;
/** The components in force for the player of `at` that have the hook, in registry order. */
export function hooked(hook: MomentHook, at: Pick<Moment, 'game' | 'state' | 'shared' | 'pack'>): string[] {
  return inForceOf(at.pack, holderOf(at.game, at.state, at.shared), effect => effect.tier !== 'hint' && effect[hook] !== undefined);
}
/** Runs the hook of the given components (`hooked`, asked before the moment when the moment changes what is in force); says how many ran. */
export function run<H extends MomentHook>(hook: H, ids: string[], at: Moment, extra: Extra<H>): number {
  const player = at.player ?? 'me';
  const states = at.states ?? { [player]: at.state };
  for (const id of [...ids].sort((a, b) => orderOf(at.pack, a) - orderOf(at.pack, b))) {
    const call = effectOf(at.pack, id)?.[hook] as ((turn: unknown) => void) | undefined;
    call?.({ ...at, player, states, ...extra, id });
  }
  return ids.length;
}
/** Asks the components in force for the player of `at` now. */
export function fire<H extends MomentHook>(hook: H, at: Moment, extra: Extra<H>): number {
  return run(hook, hooked(hook, at), at, extra);
}
