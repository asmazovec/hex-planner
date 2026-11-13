/**
 * In The Silence Of Space (action card; "After you activate a system"): "Choose 1 system. During this tactical action,
 * your ships in the chosen system can move through systems that contain other players' ships."
 *
 * Decided: a waiver of `routeBlocked` (58.3.2) for the tactical action that names the card in its `uses`, narrowed to
 * a system blocked by other players' ships (not an anomaly: a nebula, an asteroid field, a supernova still stand).
 * The ruling (only the ships of the chosen system) is not modelled: a card in `uses` has no chosen system to compare
 * with the move's source, so every move of the action is lifted.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:silence_space';

export const ability: Ability = {
  holder: 'self',
  tier: 'hint',
  rule: id,
  permit: [{
    code: 'routeBlocked',
    rule: 'your ships in the chosen system can move through systems that contain other players\' ships',
    when: (warning, ctx) => ctx.routeBlockKind(warning) === 'ships',
  }],
};
