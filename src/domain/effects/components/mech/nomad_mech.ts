/**
 * Quantum Manipulator (Nomad, mech): "While this unit is in a space area during combat, you may use its SUSTAIN DAMAGE
 * ability to cancel a hit that is produced against your ships in this system."
 *
 * A hint at the combat step: it cancels hits, and the plan does not play out combat. The adjacency of the Memoria to a
 * system with this mech is the flagship's own printed ability (and Memoria II's), not this card's.
 */
import type { ComponentEffect } from '../../types';

export const id = 'mech:nomad_mech';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat'] };
