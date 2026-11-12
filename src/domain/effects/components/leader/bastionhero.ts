/**
 * Lyra Keen, Shield of the Reef (Last Bastion, hero): "When one of your galvanized units is destroyed: You may purge
 * this card to roll 1 die for each unit in its system that belongs to another player; if the result is equal to or
 * greater than the galvanized unit's combat value, destroy that unit."
 *
 * A hint: dice decide which units are destroyed, and the plan rolls none; the other players' losses are entered by
 * hand. Purging the hero is the common play of a hero named in `uses`.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:bastionhero';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat', 'invasion'] };
