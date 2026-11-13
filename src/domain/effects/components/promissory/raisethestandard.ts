/**
 * Raise the Standard (Last Bastion, promissory note): "At the end of a combat: Galvanize 1 of your units that
 * participated. Then, return this card to the Last Bastion player."
 *
 * A hint. A galvanize token only adds a die to combat rolls and unit abilities (Galvanize); the plan rolls no dice and
 * keeps no galvanize tokens, so there is nothing to count or validate. The return to the Last Bastion player is the
 * general rule of a note played (69.3), which the replay already applies to any "return this card" text. The reminder
 * stands in the battle in space and in the invasion, where a ground combat is fought.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'promissory:raisethestandard';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat', 'invasion'] };
