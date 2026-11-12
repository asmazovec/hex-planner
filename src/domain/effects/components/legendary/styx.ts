/**
 * A Song Like Marrow (Styx, Thunder's Edge): "When you gain this card, gain 1 victory point. When you lose this card,
 * lose 1 victory point."
 *
 * Decided: `passive`, with the hook `onGainControl`: the entry that takes Styx gives 1 victory point. Not a `modify`
 * of `vp`: a game that begins with Styx already counts its point in the score entered by hand, so only a gain within
 * the plan changes the score.
 *
 * Not modelled (the base has no hook for it): the loss. An opponent's landing takes Styx from me in the replay of the
 * opponent's entry, where only that player's components are asked; no hook runs for a planet I lose, so the point is
 * not taken away.
 */
import type { ComponentEffect } from '../../types';

export const id = 'legendary:styx';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  onGainControl: turn => {
    if (turn.planetId === 'styx') turn.state.vp += 1;
  },
};
