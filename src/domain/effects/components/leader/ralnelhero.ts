/**
 * Director Nel, Signal Intrusion (Ral Nel Consortium, hero): "After the last player passes: You may choose to no longer
 * be passed; if you do, gain 2 command tokens, draw 1 action card, and purge this card."
 *
 * Decided: `play`. The hero is named in the `uses` of the Ral Nel's pass (it may be triggered by their own pass, Ral
 * Nel, Director Nel note 1); the replay purges a hero when it is played. From that entry to the end of the round the
 * check of a turn after a pass (3.3, `actionAfterPass`) is lifted for its player: they may take any number of turns
 * before they pass again (note 2). Its `play` gains 2 command tokens. The action card drawn is entered in «Taken and
 * discarded» like any card drawn. "After the last player passes" speaks of the other players' passes, which the plan
 * does not hold, so it is not checked.

 * The tokens go to the tactic pool: the pass has no field for choosing a pool yet.
 */
import { gainTokens } from '../../../replay/status';
import type { ComponentEffect } from '../../types';
import type { Hooked } from '../../../../game/abilities/types';

export const id = 'leader:ralnelhero';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: turn => gainTokens(turn, { tactic: 2 }),
};

export const ability: Hooked = {
  holder: 'self',
  permit: [{
    code: 'actionAfterPass',
    rule: 'You may choose to no longer be passed',
    lasts: 'round',
  }],
};
