/**
 * "When you gain this card, gain the Custodia Vigilia planet card and its legendary planet ability card. You are
 * neighbors with all players that have units or control planets in or adjacent to the Mecatol Rex system."
 *
 * Pass 1: a hint. Pass 2: passive; it waives notNeighbor for a player with units or controlled planets in or
 * adjacent to the Mecatol Rex system, and gaining it gains the Custodia Vigilia planet card (exhausted) with its
 * legendary ability.
 */
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:keleresbt';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
