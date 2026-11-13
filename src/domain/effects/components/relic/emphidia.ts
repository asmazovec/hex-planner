/**
 * The Crown of Emphidia (relic): "After you perform a tactical action, you may exhaust this card to explore 1 planet you
 * control. At the end of the status phase, if you control the "Tomb of Emphidia," you may purge this card to gain 1
 * victory point."
 *
 * A hint: the plan does not explore, and the point is entered with the status entry. It stands at the status step.
 * The replay purges a relic whose text says "purge this card" whenever it is played, so using its first ability would
 * purge it: pass 2 must tell the two abilities apart (see the red test).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'relic:emphidia';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['status'] };
