/**
 * Jae Mir Kan (Mahact, agent):
 * When you would spend a command token during the secondary ability of a strategic action: You may exhaust this
 * card to remove 1 of the active player's command tokens from the board and use it instead.
 *
 * A play, red in pass 1: named in `uses` of a secondary, the agent is exhausted (already) and the strategy token of the
 * secondary is not spent: the active player's token is used instead.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:mahactagent';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['card'] };
