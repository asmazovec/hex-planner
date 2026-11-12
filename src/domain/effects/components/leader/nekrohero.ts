/**
 * UNIT.DSGN.FLAYESH (Nekro Virus, hero): "ACTION: Choose a planet that has a technology specialty in a system that
 * contains your units. Destroy any other player's units on that planet. Gain trade goods equal to the planet's combined
 * resource and influence values and gain 1 technology that matches the specialty of that planet. Then, purge this card."
 *
 * To be a `play` effect of its component action, with the choices `planet` and `technology`: the other players' ground
 * forces on the planet are removed, the trade goods of its resources plus influence are gained and the technology is
 * gained (not researched, so Propagation does not replace it). The hero is purged as every hero is.
 *
 * Pass 1: still the hint it is today; the tests beside it say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:nekrohero';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
