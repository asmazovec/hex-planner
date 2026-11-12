/**
 * Reactor Meltdown (action card, Action): "Destroy 1 space dock in a non-home system."
 *
 * Pass 2 makes it a `play` with the choice `planet`: the space dock of another player on that planet is destroyed. A
 * dock in a home system, or the player's own dock, cannot be chosen (tirules2 rulings 1 and 3): `componentUnresolved`
 * (2.6.1). Written in pass 2.
 */
import { componentById } from '../../../components';
import { violation } from '../../../rules/registry';
import componentUnresolved from '../../../rules/codes/componentUnresolved';
import type { ComponentEffect, EffectTurn } from '../../types';
import { inHomeSystem } from '../../../stacks';

export const id = 'actionCard:meltdown';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'planet', kind: 'planet' }],
  play: turn => {
    if (turn.choices.planet === undefined) return;
    const planetId = String(turn.choices.planet);
    // tirules2, Reactor Meltdown 3: a dock in a home system cannot be targeted.
    if (inHomeSystem(turn.game, planetId, turn.pack)) return unresolved(turn, 'the system is a home system');
    // tirules2, Reactor Meltdown 1: not your own dock.
    if (turn.state.docks.includes(planetId)) return unresolved(turn, 'the space dock is your own');
    const holder = Object.values(turn.states).find(own => own !== turn.state && own.docks.includes(planetId));
    if (!holder) return unresolved(turn, 'no other player has a space dock on that planet');
    holder.docks = holder.docks.filter(dock => dock !== planetId);
  },
};

const unresolved = (turn: EffectTurn, reason: string): void => {
  turn.warnings.push(violation(componentUnresolved.code, { id: turn.id, name: componentById(turn.pack, turn.id)?.name ?? turn.id, reason }));
};
