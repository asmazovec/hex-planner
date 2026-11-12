/**
 * War Machine (action card, 4 copies). "When 1 or more of your units use PRODUCTION: Apply +4 to the total PRODUCTION
 * value of your units and reduce the combined cost of the produced units by 1."
 *
 * Decided: a play effect that changes two numbers for the entry that names it (its `uses` or `spends`): the total
 * Production value of the production (68.1, `productionOver`) is 4 higher, and the cost of what is produced (the
 * resources asked, `shortResources`) is 1 lower. Nothing is lifted: the check runs against the new numbers. A second
 * War Machine in the same use of Production adds nothing (ruling 1). It applies only where units use Production
 * (ruling 2), which is the production of a tactical action or of Warfare's secondary in the plan.
 *
 * Pass 1: the hint it is today; the tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:war_machine1';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
