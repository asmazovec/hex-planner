/**
 * Myru Vos (The Firmament, agent): "When a player moves ships: You may exhaust this card; if you do, SPACE CANNON cannot
 * be used against those ships. If they are not transporting units, they can also move through other players' ships."
 *
 * Decided: a waiver of the route check (`routeBlocked`, LRR 58.3.2) for the entry that names the agent in `uses`,
 * narrowed to a system blocked by other players' ships (not an anomaly, not a hyperlane) and to a move that transports
 * nothing; and only while the agent is ready before the entry (an exhausted card cannot be exhausted again). The SPACE
 * CANNON part is a reminder of the combat: the plan rolls no dice.
 */
import { componentById } from '../../../components';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:firmamentagent';

export const ability: Ability = {
  tier: 'hint',
  rule: id,
  hintAt: ['combat'],
  holder: 'self',
  permit: [{
    code: 'routeBlocked',
    rule: "If they are not transporting units, they can also move through other players' ships.",
    when: (warning, ctx) => {
      const def = componentById(ctx.pack, id);
      const ready = !def || ctx.ready(id);
      return ready && ctx.routeBlockKind(warning) === 'ships' && ctx.shipsOnly(warning);
    },
  }],
};
