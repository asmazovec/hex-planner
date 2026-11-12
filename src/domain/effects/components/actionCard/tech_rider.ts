/**
 * Technology Rider (action card, After an agenda is revealed): "You cannot vote on this agenda. Predict aloud an
 * outcome of this agenda. If your prediction is correct, research 1 technology."
 *
 * A `play` in the agenda phase (an entry of the component kind that is not a turn): the plan does not count votes, so
 * the player enters the technology researched when the prediction came true (`technology`); without it nothing
 * happens. The research is made as any other (`researchTechnologies`): a technology already owned or one whose
 * prerequisites are lacking is warned of.
 */
import type { ComponentEffect } from '../../types';
import { componentsOf } from '../../../components';
import { researchTechnologies } from '../../../replay/research';
import { textOf } from '../../helpers/cardPlay';

export const id = 'actionCard:tech_rider';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{
    key: 'technology', kind: 'component',
    options: ctx => componentsOf(ctx.pack).filter(component => component.kind === 'technology').map(component => component.id),
  }],
  play: turn => {
    const technology = textOf(turn, 'technology');
    if (technology) researchTechnologies(turn.game, turn.state, turn.shared, [technology], turn.pack, turn.warnings);
  },
};
