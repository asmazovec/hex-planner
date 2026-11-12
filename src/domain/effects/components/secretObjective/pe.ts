/**
 * Prove Endurance (secret objective, Prophecy of Kings): "Be the last player to pass during a game round."
 *
 * A hint: whether the others have passed is their choice, and the plan holds the opponents' turns only where the player
 * guessed them, so it cannot know who passes last. It is scored when its owner passes (objectives notes, Prove
 * Endurance 1), so it stands with the round's flow.
 */
import type { ComponentEffect } from '../../types';

export const id = 'secretObjective:pe';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['round'] };
