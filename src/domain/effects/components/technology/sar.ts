/**
 * Self-Assembly Routines (technology, Prophecy of Kings): "After 1 or more of your units use PRODUCTION, you may
 * exhaust this card to place 1 mech from your reinforcements on a planet you control in that system. After 1 of your
 * mechs is destroyed, gain 1 trade good."
 *
 * Decided: played by naming it in the `uses` of an entry that produces: after the production one mech stands on a
 * planet I control in that system (not in its space area, ruling 2). The trade good for a destroyed mech could be read
 * from the losses entered (`losses`, `groundLosses`), but one effect has one tier; it stays a reminder for now.
 * Pass 1: a hint, as it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:sar';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
