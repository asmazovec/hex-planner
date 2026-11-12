/**
 * Minister of Industry (agenda): "The elected player gains this card. When the owner of this card places a space
 * dock in a system, their units in that system may use their PRODUCTION abilities."
 *
 * A waiver of a new check: units produce only by a PRODUCTION ability in a tactical action or where a card says so
 * (67.1); Construction places a space dock (4.2/85.2) and produces nothing. With this law the owner's units in the
 * system of the dock just placed may produce, against their PRODUCTION value.
 *
 * Pass 1: written as the hint it is today; the tests beside it say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:minister_industry';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
