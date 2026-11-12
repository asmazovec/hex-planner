/**
 * Flank Speed (action card; "After you activate a system"): "Apply +1 to the move value of each of your ships during
 * this tactical action."
 *
 * Decided: a `modify` of `speed` for the tactical action that names the card in its `uses`. The route check (58.3.6)
 * then runs against the move value plus one: a ship that reaches is not warned of at all, one that is still short is
 * warned of against the raised number. Not a waiver: the warning would name a different number. A second Flank Speed
 * in the same action does not add a second +1 (ruling).
 *
 * The foundation applies `modify` of passive effects only; pass 2 needs the modify of a played card to hold for the
 * entry that names it (see the report). Pass 1: the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:fs1';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
