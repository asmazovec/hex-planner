/**
 * Blood Ties (Winnu, faction ability): "You do not have to spend influence to remove the custodians token from Mecatol
 * Rex."
 *
 * Decided: a `passive` waiver. The first landing on Mecatol Rex makes two warnings in the invasion step: `custodians`
 * (54.1, 27.2) and `shortInfluence` for the six influence (needed 6, paid 0). Both are lifted for the Winnu; the
 * token is still removed by the landing and the victory point still gained (27.3). Ruling (Winnu, Blood Ties 1): the
 * Winnu must still commit at least one ground force, which the landing is.
 *
 * Pass 1: the hint it is today; the tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:blood_ties';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
