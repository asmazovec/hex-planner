/**
 * Yin Spinner Omega (Yin, faction technology): "After you produce units, place up to 2 infantry from your
 * reinforcements on any planet you control or in any space area that contains 1 or more of your ships."
 *
 * Pass 2: a `play` named in `uses` of an entry that produces: up to two infantry from the reinforcements on a
 * planet the player controls or in a space area with their ships, as the entry's choices say. Today a hint.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:yso';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
};
