/**
 * Galactic Crisis Pact (directive): "Each player may perform the secondary ability of the elected strategy card
 * without spending a command token - command tokens placed by the ability are placed from a player's reinforcements
 * instead."
 *
 * Decided: mixed (play and waivers). Each player may resolve the elected card's secondary in the agenda phase without
 * spending a token: the token is not spent (a number of the count), and the secondary may come a second time in the
 * round or from the card's own holder, so secondaryRepeated and ownSecondary are lifted for that card. Pass 1 keeps it
 * a hint; the tests mark what it must do.
 */
import type { ComponentEffect } from '../../types';
import type { Hooked } from '../../../../game/abilities/types';

export const id = 'agenda:crisis';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const card = Number(ctx.choices.card);
    if (card) ctx.freeSecondaryFor(card);
    return [];
  },
  permit: [
    { code: 'secondaryRepeated', rule: 'Each player may perform the secondary ability of the elected strategy card', lasts: 'round' },
    { code: 'ownSecondary', rule: 'Each player may perform the secondary ability of the elected strategy card', lasts: 'round' },
  ],
};
