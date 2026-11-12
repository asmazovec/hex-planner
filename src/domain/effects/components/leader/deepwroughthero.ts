/**
 * "ACTION: Purge this card and a non-unit upgrade technology you own or from your deck; then, purge all cards with
 * the same name owned by other players and in other players' decks. Then, each player that purged a technology
 * they owned researches another technology."
 *
 * Pass 1: a hint. Pass 2: play, as a component action with the choice `technology`: that technology leaves my
 * holdings and every other player's; the technology researched instead is entered as a gain.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:deepwroughthero';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
