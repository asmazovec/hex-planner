/**
 * Ssruu (Yssaril, agent): "At any time: This card has the text ability of each other player's agent, even if that
 * agent is exhausted."
 *
 * A hint: it borrows the text of another player's agent, which is chosen at the table.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:yssarilagent';

export const ability: Ability = {
  holder: 'self',
  tier: 'hint',
  rule: id,
};
