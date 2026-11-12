/**
 * Mirik Aun Sissiri, Helix Protocol (Argent Flight, hero): "ACTION: Move any number of your ships from any systems to
 * any number of other systems that contain 1 of your command tokens and no other players' ships. Then, purge this card."
 *
 * Pass 1: a hint as it is today. Pass 2 makes it a `play`: its component action carries moves straight to their
 * destinations (Argent notes 4, 1, 2), so neither speed nor the route counts, and a destination without my command
 * token or with other players' ships is warned of. The replay purges the hero.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:argenthero';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
