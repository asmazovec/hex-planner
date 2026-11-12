/**
 * Wing Transfer (Argent Flight, breakthrough): "When you activate a system that contains only your units, you may place
 * command tokens from your reinforcements into any systems adjacent to that system that contain only your units; at the
 * end of this action, you may move ships among the active system and systems adjacent to it that contain your command
 * tokens."
 *
 * A hint for now. It does touch what the plan counts (command tokens leave the reinforcements and stand on the map,
 * ships move after the production), but a tactical entry holds neither tokens put down beside its active system nor
 * moves after its production; see the todos of its test.
 */
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:argentbt';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['activation'] };
