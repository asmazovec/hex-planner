/**
 * Mining Initiative (action card, Action): "Gain trade goods equal to the resource value of 1 planet you control."
 *
 * Pass 2 makes it a `play` with the choice `planet`: trade goods equal to the resources of one planet the player
 * controls; the planet is not exhausted (tirules2 ruling 2). A planet not controlled cannot be chosen:
 * `componentUnresolved` (2.6.1). Written in pass 2.
 */
import { componentById } from '../../../components';
import { violation } from '../../../rules/registry';
import componentUnresolved from '../../../rules/codes/componentUnresolved';
import type { ComponentEffect, EffectTurn } from '../../types';
import { planetValue } from '../../../payment';

export const id = 'actionCard:mining_initiative';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'planet', kind: 'planet' }],
  play: turn => {
    if (turn.choices.planet === undefined) return;
    const planetId = String(turn.choices.planet);
    if (turn.state.control[planetId] !== 'me') return unresolved(turn, 'the planet must be one you control');
    // tirules2, Mining Initiative 2: the planet is read, not exhausted.
    const resources = planetValue(turn.pack, turn.state, planetId, 'resources', { faction: turn.game.faction, shared: turn.shared });
    turn.state.tradeGoods += resources;
  },
};

const unresolved = (turn: EffectTurn, reason: string): void => {
  turn.warnings.push(violation(componentUnresolved.code, { id: turn.id, name: componentById(turn.pack, turn.id)?.name ?? turn.id, reason }));
};
