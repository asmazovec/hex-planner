/**
 * Unknown Relic Fragment (frontier exploration): "The card counts as a relic fragment of any type."
 *
 * A hint with no step. It is held in `Shelf.found` like any relic fragment, and the fragments' own ACTION counts it as a
 * fragment of any type (`fragmentsPlay`); it has no effect of its own.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'exploration:urf1';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
