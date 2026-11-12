/**
 * Umbat (Embers of Muaat, agent): "ACTION: Exhaust this card to choose a player: that player may produce up to 2
 * units that each have a cost of 4 or less in a system that contains one of their war suns or their flagship."
 *
 * Decided: `play`. The agent is exhausted by its component action (replayed already for every agent). The production
 * it grants needs a production of a component action, which an entry does not have yet: what is produced, its cost
 * (the units are paid for, Muaat note 1), the limit of two units of cost 4 or less, and the system with a war sun or
 * the flagship. Pass 1: still the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:muaatagent';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
