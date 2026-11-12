/**
 * Economic Equality (agenda, directive): "For: Each player returns all of their trade goods to the supply. Then, each
 * player gains 5 trade goods. Against: Each player returns all of their trade goods to the supply."
 *
 * Decided: play. The "For" outcome sets the trade goods the plan counts to 5, whatever there were; an agenda entry
 * that resolves it (gains the directive) does it. "Against" sets them to 0 and needs the outcome chosen, which an entry
 * has no field for yet. Pass 1: the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:economic_equality';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
