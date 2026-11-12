/**
 * Disable (action card; "At the start of an invasion in a system that contains 1 or more of your opponents' PDS
 * units"): "Your opponents' PDS units lose PLANETARY SHIELD and SPACE CANNON during this invasion."
 *
 * A hint in the invasion block: Planetary Shield stops Bombardment and Space Cannon defence fires dice, and the plan
 * rolls neither. The landing itself is never forbidden by a PDS, so there is no check to lift.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:disable';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
