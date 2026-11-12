/**
 * Letani Miasmiala, Ultrasonic Emitter (Arborec, hero): "ACTION: Produce any number of units in any number of systems
 * that contain 1 or more of your ground forces. Then, purge this card."
 *
 * Pass 1: a hint as it is today. Pass 2 makes it a `play`: its component action carries a production, placed and paid
 * as a production is; no unit uses PRODUCTION (Arborec note 3), so neither the need of a producing unit nor its
 * value applies, while a system without my ground forces, ships among other players' ships (note 2) and the cost
 * (note 1) are still checked. The replay purges the hero.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:arborechero';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
