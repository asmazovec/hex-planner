/**
 * Slumberstate Computing (Titans of Ul, breakthrough): "When COALESCENCE results in a ground combat, if you commit no
 * other units, you may choose for your units to coexist instead. During the status phase, for each player you are
 * coexisting with, you and that player each draw 1 additional action card. Other players may allow you to place a
 * sleeper token on a planet they control."
 *
 * Decided: hint. Coexistence, action card draws and sleeper tokens are not counted by the plan.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'breakthrough:titansbt';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['invasion', 'status'] };
