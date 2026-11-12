/**
 * Ragh's Call (Clan of Saar, promissory note): "After you commit 1 or more units to land on a planet: Remove all of the
 * Saar player's ground forces from that planet and place them on a planet controlled by the Saar player. Then, return
 * this card to the Saar player."
 *
 * Today a hint of the invasion. Moving the Saar player's ground forces off the planet changes the board of an
 * opponent, which the plan counts, but it needs a choice of the planet they go to and a way to name the card in a
 * landing; neither exists yet (see the test.todo of its test). Playing the note is already the replay's: the Saar
 * cannot play their own (69.2), another player gives it back after use (69.3).
 */
import type { ComponentEffect } from '../../types';

export const id = 'promissory:ragh';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['invasion'] };
