/**
 * Strategize (action card, Thunder's Edge, four copies): "ACTION: Perform the secondary ability of any readied or
 * unchosen strategy card."
 *
 * A waiver of `ownSecondary` (LRR 83.4, 82.1) for the secondary entry that names the card in `uses`, narrowed to a card
 * that is still readied: one of my own cards whose primary I have not resolved earlier this round. A card of another
 * player or an unchosen one breaks nothing to begin with. The ruling (tirules2 components/action-cards.md, Strategize 2)
 * keeps the cost: "The active player must still spend a command token to perform the secondary ability, other than for
 * Leadership", so the strategy token is spent as for any secondary. Only the entry: no `lasts`.
 *
 * Not modelled: the secondary performed this way is the player's action (a component action), so it should also be a
 * turn of the round (actionAfterPass); a secondary entry is not a turn today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:strategize1';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
  waive: [{
    code: 'ownSecondary',
    rule: 'Perform the secondary ability of any readied or unchosen strategy card.',
    // Readied: the primary of this card has not been resolved by the player earlier in the round.
    when: (_warning, { game, entry, primaries }) => {
      if (entry?.type === 'secondary' && primaries) return entry.card === undefined || !primaries.includes(entry.card);
      if (entry?.type !== 'secondary') return true;
      const plan = game.plans.find(candidate => candidate.id === game.activePlanId);
      const round = plan?.rounds.find(candidate => candidate.entries.some(other => other.id === entry.id));
      if (!round) return true;
      const earlier = round.entries.slice(0, round.entries.findIndex(other => other.id === entry.id));
      return !earlier.some(other => other.type === 'strategic' && other.card === entry.card && (other.owner ?? 'me') === (entry.owner ?? 'me'));
    },
  }],
};
