/**
 * Valkyrie Exoskeleton (Sardakk N'orr, mech): "After this unit uses its SUSTAIN DAMAGE ability during ground combat, it
 * produces 1 hit against your opponent's ground forces on this planet."
 *
 * A hint in the block of the invasion, where ground combat is fought. A hit in combat is dice and damage, which the
 * plan does not simulate; the losses are entered by hand. (A `hintAt` on a mech is kept by the registry but not shown
 * yet: a known limit of the foundation.)
 */
import type { ComponentEffect } from '../../types';

export const id = 'mech:sardakk_mech';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['invasion'] };
