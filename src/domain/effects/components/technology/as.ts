/**
 * Aetherstream (Empyrean, technology):
 * After you or one of your neighbors activates a system that is adjacent to an anomaly, you may apply +1 to the
 * move value of all of that player's ships during this tactical action.
 *
 * A passive modify of `speed`, red in pass 1: +1 to the move value of the ships of a tactical action whose active
 * system is adjacent to an anomaly. The point needs the active system in its context. A neighbour's action is not
 * reached (a waiver is asked of the owner of the entry).
 * Decided (pass 2): "may" is taken as used whenever the route is counted with the active system next to an anomaly
 * (`activeNextToAnomaly`: the system itself does not count, note 2). A unit with no move value of its own is left alone.
 */
import { activeNextToAnomaly, plusSpeed } from '../../helpers/movement';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:as';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  modify: { speed: (value, ctx) => (activeNextToAnomaly(ctx) ? plusSpeed(1)(value) : value) },
};
