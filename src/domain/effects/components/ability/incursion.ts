/**
 * Incursion (Crimson Rebellion, ability): "When you activate a system that contains a breach, you may flip that breach;
 * systems that contain active breaches are adjacent. at the end of the status phase, any player with ships in a
 * system that contain an active breach may remove that breach."
 *
 * Decided: a reminder of activation and movement. Breaches are not on the plan's board (no state holds them), so a
 * flip, the adjacency of active breaches and their removal have nothing to stand on. A route between two systems with
 * active breaches is entered today as a jump, which is drawn and counted as one step and not warned of, so the
 * movement it gives already passes. Breaches are not wormholes (Incursion note 1).
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:incursion';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['activation', 'movement'] };
