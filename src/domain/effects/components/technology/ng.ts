/**
 * Neuroglaive (Naalu Collective, technology): "After another player activates a system that contains 1 or more of your
 * ships, that player removes 1 token from their fleet pool and returns it to their reinforcements."
 *
 * To be a `passive` effect on another player's entry: when a rival's tactical action activates a system where my ships
 * stand, that rival's fleet pool loses one token. The foundation asks a component of the owner of an entry only, so
 * this needs a new hook in the replay (see the report of batch 05). My own activations are untouched.
 *
 * Pass 1: still the hint it is today; the tests beside it say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:ng';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
