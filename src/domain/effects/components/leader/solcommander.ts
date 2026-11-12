/**
 * Claire Gibson (Federation of Sol, commander): "At the start of a ground combat on a planet you control: You may
 * place 1 infantry from your reinforcements on that planet."
 *
 * A hint: the infantry is placed in a ground combat on a planet the Sol player controls, so in another player's invasion.
 * A waiver or a play is asked of the owner of the entry only (the known limits of the foundation), and the plan does not
 * model the defence of a planet; the reminder stands in the block of the invasion.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:solcommander';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['invasion'] };
