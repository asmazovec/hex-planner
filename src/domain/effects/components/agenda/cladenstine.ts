/**
 * Clandestine Operations (directive): "For: Each player removes 2 command tokens from their command sheet and returns
 * those tokens to their reinforcements. Against: Each player removes 1 command token from their fleet pool and
 * returns that token to their reinforcements."
 *
 * Decided: play. The outcome changes the command sheet, which the plan counts: "For" takes 2 tokens from the pools the
 * player chooses, "Against" takes 1 from the fleet pool, after which a system may hold more ships than the pool allows
 * (37.3). Pass 1 keeps it a hint; the tests mark what the play must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:cladenstine';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
