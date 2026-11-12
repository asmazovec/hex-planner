/**
 * Gamma Wormhole (frontier exploration, Prophecy of Kings): "Place a gamma wormhole token in this system. Then, purge
 * this card."
 *
 * Decided: `play`, named in the `uses` of the tactical action that explores the system: a gamma wormhole token stands in
 * the active system for the rest of the game, and from then on movement takes it as adjacent to every other system with
 * a gamma wormhole (101, "Systems that contain identical wormholes are adjacent"). Pass 1: the hint it was.
 */
import type { ComponentEffect } from '../../types';

export const id = 'exploration:gw';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
