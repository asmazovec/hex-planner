/**
 * Unstable Planet (action card, Action): "Choose 1 hazardous planet. Exhaust that planet and destroy up to 3 infantry
 * on it."
 *
 * A `play` of a component action with the choice `planetId`: the hazardous planet is exhausted for whoever controls
 * it and up to 3 infantry on it are destroyed. A planet that is not hazardous is warned of. Pass 1 keeps it the hint
 * it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:unstable';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
