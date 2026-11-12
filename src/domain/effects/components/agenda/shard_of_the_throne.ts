/**
 * Shard of the Throne (agenda):
 * "The elected player gains this card and 1 victory point. A player gains this card and 1 victory point when they
 * win a combat against the owner of this card. Then, the previous owner of this card loses 1 victory point."
 *
 * A law of the elected player: they gain the card and 1 victory point when it is resolved (a `play`
 * of the agenda entry with `choices.elect`). Who wins a combat is not counted, so the passing of the card is a hint at
 * the combat. Pass 1: still the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:shard_of_the_throne';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
