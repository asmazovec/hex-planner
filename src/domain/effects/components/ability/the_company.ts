/**
 * The Company (Nomad): "During setup, take the 2 additional Nomad faction agents and place them next to your faction
 * sheet; you have 3 agents"
 *
 * A hint: nothing is left to count. The Nomad's faction sheet in the data lists the three agents, and a game's start
 * gives a faction every agent of its sheet unlocked (`startForFaction`, LRR 51.4), so the three are held from setup.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:the_company';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
