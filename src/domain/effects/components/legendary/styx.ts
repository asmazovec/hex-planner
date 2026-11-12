/**
 * A Song Like Marrow (Styx, Thunder's Edge): "When you gain this card, gain 1 victory point. When you lose this card,
 * lose 1 victory point."
 *
 * Decided: `passive`, with the hook `onGainControl`: the entry that takes Styx gives 1 victory point. Not a `modify`
 * of `vp`: a game that begins with Styx already counts its point in the score entered by hand, so only a gain within
 * the plan changes the score.
 *
 * The loss is the hook `onControlLost` (points/moments.ts): an opponent's landing takes Styx from me, and one point goes.
 * The opponent's own point is not modelled: their scores move by their status entries.
 */
import '../../points/moments';
import type { ComponentEffect } from '../../types';

export const id = 'legendary:styx';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  onGainControl: turn => {
    if (turn.planetId === 'styx') turn.state.vp += 1;
  },
  onControlLost: turn => {
    if (turn.planetId === 'styx') turn.state.vp -= 1;
  },
};
