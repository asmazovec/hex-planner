/**
 * Publicize Weapon Schematics (agenda): "For: If any player owns a war sun technology, all players may ignore all
 * prerequisites on war sun technologies. All war suns lose SUSTAIN DAMAGE. Against: Each player that owns a war sun
 * technology discards all of their action cards."
 *
 * A waiver of a check the plan does not have yet: technology prerequisites (90.8). While any player owns a war sun
 * technology, every player ignores the prerequisites of war sun technologies. The loss of SUSTAIN DAMAGE is combat
 * and only a reminder.
 *
 * Pass 1: written as the hint it is today; the tests beside it say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:schematics';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
