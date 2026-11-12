/**
 * So Ata (Yssaril, commander): "After another player activates a system that contains your units: You may look at
 * that player's action cards, promissory notes, or secret objectives."
 *
 * A hint: looking at another player's cards changes nothing the plan counts.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:yssarilcommander';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
};
