/**
 * Emissary Taivra (Ghosts of Creuss, agent): "After a player activates a system that contains a non-delta wormhole:
 * You may exhaust this card: if you do, that system is adjacent to all other systems that contain a wormhole during
 * this tactical action."
 *
 * A hint: the agent makes systems adjacent after the activation. The plan already lets a route step between systems that
 * are not joined (a jump, one step, not warned of), so no check is lifted; the reminder stands in the block of the activation.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:ghostagent';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['activation'] };
