/**
 * Representative Government (law): "For: Players cannot exhaust planets to cast votes during the agenda phase. each
 * player may cast 1 vote on each agenda instead. Players cannot cast additional votes. Against: At the start of the
 * next strategy phase, each player that voted "Against" exhausts all of their cultural planets."
 *
 * Decided: hint. "For" is about votes, which the plan does not count. "Against" exhausts the cultural planets of those
 * who voted against, and the plan does not know the votes; the player marks them exhausted by hand.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:rep_govt';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
