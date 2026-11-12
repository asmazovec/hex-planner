/**
 * Captain Mendosa (Clan of Saar, agent): "When a player activates a system: You may exhaust this card to increase the
 * move value of 1 of that player's ships to match the move value of the ship on the game board that has the highest
 * move value."
 *
 * Decided (pass 2 to build): a `play` effect named in the entry's «Used», with a waiver of the route check
 * (`speedShort`, 58.2) narrowed by `when` to what the text covers: one ship (the warning's unit moves alone in its
 * group), and a route that the highest move value of a ship on the board reaches. The agent is exhausted by the
 * replay as any agent named in «Used». Played on another player's ship it would be that player's entry naming a
 * component it does not hold: a known limit of the foundation.
 *
 * Pass 1: the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:saaragent';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
