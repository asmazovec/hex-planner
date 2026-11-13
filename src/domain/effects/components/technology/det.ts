/**
 * Dark Energy Tap: "After you perform a tactical action in a system that contains a frontier token, if you have 1 or more
 * ships in that system, explore that token. Your ships can retreat into adjacent systems that do not contain other
 * players' units, even if you do not have units or control planets in that system."
 *
 * A hint. The plan holds no frontier tokens and no exploration decks (what an exploration brings is entered by hand),
 * and a retreat is part of the combat it does not simulate.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:det';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['activation', 'combat'] };
