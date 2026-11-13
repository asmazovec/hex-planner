/**
 * Captain Aroz (The Firmament, commander): "At any time: You can treat planets in systems that contain your ships as if
 * they were controlled by you for the purpose of scoring secret objectives."
 *
 * A hint in the status phase. The plan does not check the requirements of objectives: the points scored are entered by
 * hand, so there is nothing to count or to lift. The control of planets the plan does count (payment, production) is
 * untouched by the card: it speaks of scoring only (Firmament, Captain Aroz note 1).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:firmamentcommander';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['status'] };
