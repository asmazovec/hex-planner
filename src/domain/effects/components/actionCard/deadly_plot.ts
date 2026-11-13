/**
 * Deadly Plot (action card, agenda phase). "During the agenda phase when an outcome would be resolved: If you voted for
 * or predicted another outcome, discard the agenda instead. The agenda is resolved with no effect and it is not
 * replaced. Then, exhaust all of your planets."
 *
 * Decided: a hint with no step. Votes and outcomes are not counted; the planets exhausted in the agenda phase are
 * readied at its end (Exhausted, note 1: "Planets will also ready at the end of each agenda phase") before the next action phase, so nothing the plan counts changes.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:deadly_plot';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
