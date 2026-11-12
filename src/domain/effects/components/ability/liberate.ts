/**
 * Liberate (Last Bastion, faction ability): "When you gain control of a planet: ready that planet if it contains a
 * number of your infantry equal to or greater than that planet's resource value; otherwise, place 1 infantry on that
 * planet."
 *
 * Decided: an automatic change of the board when the Last Bastion gains control of a planet (49.5): a planet newly
 * gained enters exhausted (49.5.2), and Liberate readies it when its infantry are at least its resources, or else puts
 * one infantry from the reinforcements on it. The number of mechs does not matter (Last Bastion, Liberate 2). Nothing
 * is waived: the rule of the exhausted planet still holds for every other faction and every other way of gaining one.
 *
 * Pass 1: a hint as it is today. Pass 2 needs a passive trigger at the gain of control (`gainControl` in
 * src/domain/replay/invasion.ts), which the contract does not have yet.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:liberate';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
