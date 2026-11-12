/**
 * "Other players must spend 1 influence to commit ground forces to the planet that contains this unit."
 *
 * Pass 1: a hint. Pass 2: a cost the mech imposes on other players: committing ground forces to its planet costs 1
 * influence per mech, warned of as the custodians token is (shortInfluence at the invasion), since the plan
 * records no influence spent on a landing.
 */
import type { ComponentEffect } from '../../types';

export const id = 'mech:keleres_mech';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
