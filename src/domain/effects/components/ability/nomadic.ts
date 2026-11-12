/**
 * Nomadic (Clan of Saar, ability): "You can score objectives even if you do not control the planets in your home
 * system."
 *
 * Decided (pass 2 to build): a waiver of a new check. LRR 61.16: "A player cannot score public objectives if that
 * player does not control each planet in their home system." The replay does not check it yet: it must warn for
 * everyone first (a new code, `scoreWithoutHome`, step `status`), and Nomadic then lifts it without condition.
 *
 * Pass 1: the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:nomadic';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
