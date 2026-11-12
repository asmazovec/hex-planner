/**
 * Absolute Synergy (Naaz-Rokha Alliance, breakthrough): "When you have 4 mechs in the same system, you may return 3 of
 * those mechs to your reinforcements to flip this card and place it on top of your mech card."
 *
 * A hint. The plan holds a breakthrough as held or exhausted, not flipped, and an entry that uses a component names no
 * system, so the three mechs returned are removed by hand. The flipped side, Eidolon Maximum, is `mech:naaz_voltron`.
 */
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:naazbt';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
