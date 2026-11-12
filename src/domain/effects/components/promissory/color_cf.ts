/**
 * Ceasefire (promissory note): "After the <color> player activates a system that contains 1 or more of your units:
 * The <color> player cannot move units to the active system. Then return this card to the <color> player."
 *
 * A hint at the activation step. The note forbids, it lifts nothing, and it is played by the holder in another
 * player's tactical action, as a reaction the plan cannot foresee: when it is played against me, the moves I planned
 * into the active system simply do not happen. Its return to the owner after it is played (69.3) is already done by
 * the replay for any note whose text returns it.
 */
import type { ComponentEffect } from '../../types';

export const id = 'promissory:<color>_cf';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['activation'] };
