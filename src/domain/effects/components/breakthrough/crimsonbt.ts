/**
 * Resonance Generator (Crimson Rebellion, breakthrough): "During your tactical actions, apply +1 to the move value of
 * each of your ships that starts its movement in your home system or in a system that contains an active breach.
 * ACTION: Exhaust this card to flip any breach or to place an active breach in a non-home system that contains your
 * units."
 *
 * Decided: a `modify` of the move value (`speed`) for the first paragraph, a reminder for the second. The +1 applies to
 * a ship whose move starts in the player's home system; the check of the route (`speedShort`, 58.3) then runs against
 * the raised value, so nothing is listed as waived. It stays in force while the card is exhausted (Crimson Rebellion,
 * Resonance Generator note 1), as every passive ability does (34.4.1). Breaches are not on the plan's board at all, so
 * a start in a system with an active breach is not counted, and the ACTION that flips or places one changes nothing
 * the plan holds.
 *
 * The base asks `speed` with the start of the move (`from`), so `startsAtHome` decides; `plusSpeed` leaves a unit
 * that does not move by itself alone.
 */
import { plusSpeed, startsAtHome } from '../../helpers/movement';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'breakthrough:crimsonbt';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  modify: { speed: (value, ctx) => (startsAtHome(ctx) ? plusSpeed(1)(value) : value) },
};
