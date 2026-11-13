/**
 * Deorbit Barrage (Clan of Saar, breakthrough, Thunder's Edge): "ACTION: Exhaust this card and spend any amount of
 * resources to choose a planet up to 2 systems away from an asteroid field that contains your ships; roll a number of
 * dice equal to the amount spent and assign 1 hit to a ground force on that planet for each roll of 4 or greater."
 *
 * A hint of its component action: the hits are dice, which the plan does not roll, and the amount spent is the
 * player's free choice. Playing it exhausts the breakthrough (the replay's own: "Exhaust this card").
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'breakthrough:saarbt';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['component'] };
