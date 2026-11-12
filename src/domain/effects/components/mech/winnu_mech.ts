/**
 * Reclaimer (Winnu, mech): "After you resolve a tactical action where you gained control of this planet, you may place
 * 1 PDS or 1 Space Dock from your reinforcements on this planet."
 *
 * Decided: a `passive` waiver, as Reclamation's. A structure the landing puts on a planet that no flight brought is
 * warned of as missing from the space area (`unitsMissing`, invasion step); it is lifted for one structure on a planet
 * the action gained, where a Reclaimer stands at the end of the action (ruling 4), one per Reclaimer (ruling 3).
 *
 * Pass 1: the hint it is today; the tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'mech:winnu_mech';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
