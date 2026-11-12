/**
 * Hel-Titan II (Titans of Ul, PDS upgrade): "PLANETARY SHIELD, SPACE CANNON 5, SUSTAIN DAMAGE, PRODUCTION 1. This unit
 * is treated as both a structure and a ground force. It cannot be transported. You may use this unit's SPACE CANNON
 * against ships that are adjacent to this unit's systems."
 *
 * Decided: `modify` of `productionValue` for a PDS: 1, so that a Hel-Titan produces where it stands even without a
 * space dock, its value pooled with the docks' (Titans of Ul, Hel-Titan note 2). "It cannot be transported" is the
 * check every structure already has (`structureAboard`); the cannon is combat. Pass 1: the generated upgrade only.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:ht2';

export const effect: ComponentEffect = { tier: 'passive', rule: '97.4' };
