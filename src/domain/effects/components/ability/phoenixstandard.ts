/**
 * Phoenix Standard (Last Bastion, faction ability): "At the end of combat: you may galvanize 1 of your units that
 * participated."
 *
 * A hint: a galvanize token only adds dice (Galvanize), which the plan does not roll. The reminder stands at the end of
 * a battle in space and of a ground combat in the invasion.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:phoenixstandard';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat', 'invasion'] };
