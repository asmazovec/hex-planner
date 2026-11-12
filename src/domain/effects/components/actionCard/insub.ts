/**
 * Insubordination (action card, Action): "Remove 1 token from another player's tactic pool and return it to their
 * reinforcements."
 *
 * Pass 2 makes it a `play` with the choice `player`: one token leaves that opponent's tactic pool. A player with no
 * token in the tactic pool cannot be chosen (tirules2 ruling 1): LRR 2.6.1, a component action that cannot be resolved
 * completely, is warned of with `componentUnresolved`. Pass 1 keeps it the hint it is today; its tests say what it
 * must do.
 */
import { componentById } from '../../../components';
import { violation } from '../../../rules/registry';
import componentUnresolved from '../../../rules/codes/componentUnresolved';
import type { ComponentEffect, EffectTurn } from '../../types';

export const id = 'actionCard:insub';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'player', kind: 'player' }],
  play: turn => {
    if (turn.choices.player === undefined) return;
    const target = turn.states[String(turn.choices.player)];
    if (!target || target === turn.state) return unresolved(turn, 'another player must be chosen');
    // tirules2, Insubordination 1: no token in the tactic pool, no target.
    if (target.tactic < 1) return unresolved(turn, 'that player has no command token in their tactic pool');
    target.tactic -= 1;
  },
};

const unresolved = (turn: EffectTurn, reason: string): void => {
  turn.warnings.push(violation(componentUnresolved.code, { id: turn.id, name: componentById(turn.pack, turn.id)?.name ?? turn.id, reason }));
};
