/**
 * X-89 Bacterial Weapon (base game): "ACTION: Exhaust this card and choose 1 planet in a system that contains 1 or more
 * of your ships that have BOMBARDMENT; destroy all infantry on that planet"
 *
 * A hint at the component action. The replay already exhausts the card when a component action plays it (its text
 * says "Exhaust this card"). What it destroys are other players' infantry, which my count knows only by hand and which
 * matter only to a ground combat the plan does not simulate.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:x89_base';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['component'] };
