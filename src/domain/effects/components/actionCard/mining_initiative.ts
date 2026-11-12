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
import { applied } from '../../apply';
import { holderOf } from '../../registry';

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
    const base = turn.pack.planets[planetId]?.resources ?? 0;
    const resources = applied(turn.pack, holderOf(turn.game, turn.state, turn.shared), 'planetResources', base, { planetId, attached: turn.shared.attachments?.[planetId] }).value;
    turn.state.tradeGoods += resources;
  },
};

const unresolved = (turn: EffectTurn, reason: string): void => {
  turn.warnings.push(violation(componentUnresolved.code, { id: turn.id, name: componentById(turn.pack, turn.id)?.name ?? turn.id, reason }));
};
