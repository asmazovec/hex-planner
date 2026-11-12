/**
 * Ahk-Syl Siven, Probability Matrix (Nomad, hero): "ACTION: Place this card near the game board. your flagship and
 * units it transports can move out of systems that contain your command tokens during this game round. At the end of
 * that game round, purge this card."
 *
 * To be a `play` with a waiver for the round (pass 2): the hero is played by a component action (and purged by it, as
 * every hero), and from that entry to the end of the round `sourceActivated` (58.3.3) is lifted for a move out of a
 * system with my command token whose units are the flagship and what it transports: ground forces and fighters, no
 * other ship. The flagship may also pick up ground forces in such a system (Nomad, Ahk-Syl Siven note 2), so the
 * pickup's `sourceActivated` of the transport step is lifted the same way when the flagship's group makes it.
 * Pass 1: the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:nomadhero';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
