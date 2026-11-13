/**
 * Planesplitter (The Obsidian, technology): "When you perform a strategic action, you may move an ingress token into a
 * system that contains or is adjacent to your units. This technology cannot be researched."
 *
 * A hint for the strategy card. The ingress tokens lie on the board of the game (`game.fracture.ingress`) and are not
 * moved by the replay of a plan, so the move is entered on the board by hand.
 *
 * "This technology cannot be researched" lifts nothing: it is a restriction, a check that holds for everyone who
 * researches the card. The replay does not make it yet (no warning for a technology that cannot be researched); its
 * test is red until the research step warns of it (see the test file).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:planesplitter-obs';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['card'] };
