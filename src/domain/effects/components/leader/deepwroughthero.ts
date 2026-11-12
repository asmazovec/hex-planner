/**
 * "ACTION: Purge this card and a non-unit upgrade technology you own or from your deck; then, purge all cards with
 * the same name owned by other players and in other players' decks. Then, each player that purged a technology
 * they owned researches another technology."
 *
 * Play, as a component action with the choice `technology`: that technology leaves every player's holdings (the
 * rivals' states are in `turn.states`). The technology each player researches instead is their choice and is entered
 * as a gain of the entry. The hero's own purge is the common rule of heroes (51.12).
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:deepwroughthero';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{
    key: 'technology',
    kind: 'component',
    label: { ru: 'Технология', en: 'Technology' },
    options: ({ pack }) => Object.entries(pack.technologies).filter(([, def]) => !def.upgrade).map(([key]) => `technology:${key}`),
  }],
  play: ({ choices, states }) => {
    const chosen = choices.technology;
    if (typeof chosen !== 'string' || chosen === '') return;
    for (const player of Object.values(states)) {
      player.holdings.technologies = player.holdings.technologies.filter(owned => owned !== chosen);
      player.holdings.exhausted = player.holdings.exhausted.filter(owned => owned !== chosen);
    }
  },
};
