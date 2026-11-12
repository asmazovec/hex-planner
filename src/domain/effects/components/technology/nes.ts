/**
 * Non-Euclidean Shielding (Barony of Letnev, technology): "When 1 of your units uses SUSTAIN DAMAGE, cancel 2 hits
 * instead of 1."
 *
 * A hint of the combat: hits and their cancelling are not replayed; the player enters the losses by hand.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:nes';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat'] };
