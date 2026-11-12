/**
 * "When another player researches a technology: You may exhaust this card to allow that player to ignore 1
 * prerequisite; if they do, you may place 1 infantry from your reinforcements into coexistence on a non-home
 * planet they control."
 *
 * Hint. Prerequisites are not checked by the plan, so there is nothing to ignore, and it acts in another player's
 * research; the infantry placed into coexistence is not modelled.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:deepwroughtagent';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['card'] };
