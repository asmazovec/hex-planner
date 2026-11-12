/**
 * Fighter Conscription (action card, Action): "Place 1 fighter from your reinforcements in each system that contains
 * 1 or more of your space docks or units that have capacity. They cannot be placed in systems that contain other
 * players' ships."
 *
 * A `play` of a component action without choices: one fighter in each system with my space dock or my unit that has
 * capacity, none where other players have ships. Pass 1 keeps it the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:f_conscription';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
