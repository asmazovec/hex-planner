/**
 * Magen Defense Grid Ω (technology, Prophecy of Kings, Codex I): "At the start of ground combat on a planet that
 * contains 1 or more of your structures, produce 1 hit and assign it to 1 of your opponent's ground forces."
 *
 * A hint: a hit in ground combat is a loss of the opponent, which the plan neither fights nor counts among my losses.
 * Ground combat is fought in the invasion step.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:md_c1';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['invasion'] };
