/**
 * Letani Ospha (Arborec, agent): "ACTION: Exhaust this card and choose a player's non-fighter ship: that player may
 * replace that ship with one from their reinforcements that costs up to 2 more than the replaced ship."
 *
 * Pass 1: a hint as it is today. Pass 2 makes it a `play` with the choices of its component action (the system, the
 * ship replaced, the ship placed): the one ship leaves and the other stands in its place, not produced (Arborec note
 * 1), and a replacement that costs more than 2 above the replaced ship is warned of. The replay exhausts the agent.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:arborecagent';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
