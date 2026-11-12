/**
 * Representative Government (agenda):
 * "For: Players cannot exhaust planets to cast votes during the agenda phase. Each player may cast 1 vote on each
 * agenda instead. Against: At the start of the next strategy phase, each player that voted "Against" exhausts all
 * of their cultural planets."
 *
 * Hint only: "For" changes how votes are cast, and the plan counts no votes; "Against" exhausts the
 * cultural planets of those who voted against, which depends on the votes and is entered by hand. Nothing is validated.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:representative_government';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
