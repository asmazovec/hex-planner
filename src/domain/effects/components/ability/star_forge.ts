/**
 * Star Forge (Embers of Muaat): "ACTION: Spend 1 token from your strategy pool to place either 2 fighters or 1
 * destroyer from your reinforcements in a system that contains 1 or more of your war suns."
 *
 * Decided: `play`. A component action with the choices `systemId` and `unit` ('fighter' or 'destroyer'): it spends
 * one strategy token (`shortStrategy` when the pool is empty) and places the units in the space area of that system.
 * A system without a war sun of mine is warned of (a new code; the Muaat cannot use Star Forge without a war sun on
 * the board, Muaat note 1), and the units are placed all the same. The Ember Colossus' infantry is placed by this play
 * too (see `mech/muaat_mech.ts`). Pass 1: still the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:star_forge';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
