/**
 * Technological Singularity (Nekro Virus): "Once per combat, after 1 of your opponent's units is destroyed: You may
 * gain 1 technology that is owned by that player."
 *
 * A hint at the combat: the plan rolls no dice and destroys nothing by itself. The technology gained is entered as a
 * gain, which Propagation does not replace (it replaces research, not gaining: Nekro Virus, Propagation note 1).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'ability:technological_singularity';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat'] };
