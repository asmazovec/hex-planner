/**
 * Dok 'N Pic's Salvage Yard (Garbozia, legendary planet, Thunder's Edge): "You may exhaust this card when you pass to
 * place 1 action card from the discard pile faceup on this card; you can purge cards on this card to play them as if
 * they were in your hand."
 *
 * A hint with no step. The discard pile is not kept by the plan, and an action card played from this card is named in
 * the entry like any other card. Nothing is validated. (A `hintAt` on a legendary planet is not shown yet anyway.)
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'legendary:garbozia';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
