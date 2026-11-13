/**
 * Lost Star Chart (action card, After you activate a system): "During this tactical action, systems that contain alpha
 * and beta wormholes are adjacent to each other."
 *
 * A hint at the activation step. The movement check does not need it: two marked systems that are not joined are
 * already a jump of one step that no check refuses (src/domain/movement.ts, `fullPath`), so a route from an alpha to a
 * beta wormhole raises no warning to lift. Only the highlight of what can still be reached ignores the card; it asks
 * no holdings.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:lost_star';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
