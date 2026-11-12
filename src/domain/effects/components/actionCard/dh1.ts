/**
 * Direct Hit (action card; "After another player's ship uses SUSTAIN DAMAGE to cancel a hit produced by your units or
 * abilities"): "Destroy that ship."
 *
 * A hint in the combat block: hits and Sustain Damage belong to the combat the plan does not simulate; a ship
 * destroyed is entered as a loss.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:dh1';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
