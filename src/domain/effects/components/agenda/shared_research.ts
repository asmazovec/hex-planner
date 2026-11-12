/**
 * Shared Research (agenda): "For: Each player's units can move through nebulae. Against: Each player places a
 * command token from their reinforcements in their home system, if able."
 *
 * A passive waiver of `routeBlocked` for a nebula passed through: "Each player's units can move through nebulae". A
 * nebula still ends a move that enters it only as the active system, and a ship starting in a nebula still moves 1
 * (Shared Research notes 1 and 2), so `speedShort` stands.
 *
 * Pass 1: written as the hint it is today; the tests beside it say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:shared_research';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
