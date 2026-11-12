/**
 * The Crown of Emphidia (agenda):
 * "The elected player gains this card and 1 victory point. A player gains this card and 1 victory point after they
 * gain control of a planet in the home system of this card's owner. Then, the previous owner of this card loses 1
 * victory point."
 *
 * A law of the elected player: they gain the card and 1 victory point when it is resolved (a `play`
 * of the agenda entry with `choices.elect`). Its passing when a player takes a planet of the owner's home system is
 * not modelled: the plan does not track who holds the card after it is resolved. Pass 1: still the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:crown_of_emphidia';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  // "The elected player gains this card and 1 victory point": once, when the law is resolved. Its passing after a
  // planet of the owner's home system is taken is not modelled.
  gained: ({ choices, entry, states, shared }) => {
    const elected = String(choices.elect ?? entry.owner ?? 'me');
    const who = states[elected] ?? (elected === 'me' ? shared : shared.rivals?.[elected]);
    if (who) who.vp += 1;
  },
  // "... the previous owner of this card loses 1 victory point": a law taken out of play by an entry of its owner.
  lost: ({ state }) => {
    state.vp -= 1;
  },
};
