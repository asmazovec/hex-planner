/**
 * Garv and Gunn (Naaz-Rokha Alliance, agent): "At the end of a player's turn: You may exhaust this card to allow that
 * player to explore 1 of their planets."
 *
 * A hint. Exploration is not planned, so what the agent allows is not counted; exhausting it is what any agent named
 * in an entry's «Used» does already (51.4).
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:naazagent';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
