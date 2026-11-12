/**
 * Inheritance Systems (L1Z1X Mindnet, faction technology): "You may exhaust this card and spend 2 resources when you
 * research a technology; ignore all of that technology's prerequisites."
 *
 * Decided: a `play` that waives a new check. Research does not check prerequisites yet (90.12); pass 2 adds that
 * check for everyone (code `researchPrerequisites`, step `card`), and this card, named in the `uses` of the
 * research, lifts it for that entry and adds 2 resources to its cost (faction note 1: paid apart from the research).
 *
 * Pass 1: the hint it is today; its tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:is';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
