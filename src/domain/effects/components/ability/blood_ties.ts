/**
 * Blood Ties (Winnu, faction ability): "You do not have to spend influence to remove the custodians token from Mecatol
 * Rex."
 *
 * Decided: a `passive` waiver. The first landing on Mecatol Rex makes two warnings in the invasion step: `custodians`
 * (54.1, 27.2) and `shortInfluence` for the six influence (needed 6, paid 0). Both are lifted for the Winnu; the
 * token is still removed by the landing and the victory point still gained (27.3). Ruling (Winnu, Blood Ties 1): the
 * Winnu must still commit at least one ground force, which the landing is.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:blood_ties';

const RULE = 'You do not have to spend influence to remove the custodians token from Mecatol Rex';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  waive: [
    { code: 'custodians', rule: RULE },
    // Only the six influence of the landing (made in the invasion step); Leadership's bought tokens still cost influence.
    { code: 'shortInfluence', rule: RULE, when: warning => warning.step === 'invasion' },
  ],
};
