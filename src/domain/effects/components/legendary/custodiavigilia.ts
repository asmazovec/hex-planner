/**
 * Custodian's Favour (Custodia Vigilia, the Council Keleres' legendary planet): "While you control Mecatol Rex, it
 * gains SPACE CANNON 5 and PRODUCTION 3. Gain 2 command tokens when another player scores a victory point with the
 * second clause of the 'Imperial' strategy card."
 *
 * To be `passive`, with hints: while the player controls Custodia Vigilia and Mecatol Rex, Mecatol Rex is a unit with
 * PRODUCTION 3 for the production step: production in its system is no longer "without a unit with Production" (67.1),
 * and is limited to 3 units (as using a unit on Mecatol Rex, Council Keleres, Custodia Vigilia 9). SPACE CANNON is a
 * roll (combat), and the command tokens come from another player's strategy card, which the plan does not have:
 * both stay reminders.
 */
import '../../points/production';
import { isMecatol } from '../../../mecatol';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'legendary:custodiavigilia';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  // PRODUCTION 3 of Mecatol Rex, asked only for a planet the holder controls (`planetProduction`). The Space Cannon and
  // the command tokens are reminders the plan does not count.
  modify: { planetProduction: (value, ctx) => (isMecatol(ctx.planetId) ? 3 : value) },
};
