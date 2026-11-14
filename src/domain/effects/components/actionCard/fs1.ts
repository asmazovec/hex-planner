/**
 * Flank Speed (action card; "After you activate a system"): "Apply +1 to the move value of each of your ships during
 * this tactical action."
 *
 * Decided: a `modifyWhenNamed` of `speed` for the tactical action that names the card in its `uses`. The route check
 * (58.3.6) then runs against the move value plus one: a ship that reaches is not warned of at all, one that is still
 * short is warned of against the raised number. Not a waiver: the warning would name a different number. A second
 * Flank Speed in the same action does not add a second +1 (ruling): the base holds it once per component.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:fs1';

export const ability: Ability = {
  tier: 'hint',
  rule: id,
  // A value of 0 is a unit that does not move by itself (infantry, structures): it stays 0.
  modifyWhenNamed: { speed: value => (value > 0 ? value + 1 : value) },
  holder: 'self',
};
