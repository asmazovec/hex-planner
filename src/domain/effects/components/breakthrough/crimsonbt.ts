/**
 * Resonance Generator (Crimson Rebellion, breakthrough): "During your tactical actions, apply +1 to the move value of
 * each of your ships that starts its movement in your home system or in a system that contains an active breach.
 * ACTION: Exhaust this card to flip any breach or to place an active breach in a non-home system that contains your
 * units."
 *
 * Decided: a `modify` of the move value (`speed`) for the first paragraph, a reminder for the second. The +1 applies to
 * a ship whose move starts in the player's home system; the check of the route (`speedShort`, 58.3) then runs against
 * the raised value, so nothing is listed as waived. It stays in force while the card is exhausted (Crimson Rebellion,
 * Resonance Generator note 1), as every passive ability does (34.4.1). Breaches are not on the plan's board at all, so
 * a start in a system with an active breach is not counted, and the ACTION that flips or places one changes nothing
 * the plan holds.
 *
 * The point `speed` is asked today with the faction and the unit only (`ModifierContext.speed`); the start of the move
 * is a new field of that context, a change of pass 2.
 *
 * Pass 1: still the hint it is today; pass 2 writes the modify (see the tests).
 */
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:crimsonbt';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['movement'] };
