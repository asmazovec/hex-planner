/**
 * So Ata (Yssaril, commander): "After another player activates a system that contains your units: You may look at
 * that player's action cards, promissory notes, or secret objectives."
 *
 * A hint: looking at another player's cards changes nothing the plan counts.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:yssarilcommander';

export const ability: Ability = {
  holder: 'others',
  tier: 'hint',
  rule: id,
};
