/**
 * Valefar Assimilator X (Nekro Virus, technology): "When you would gain another player's technology using 1 of your
 * faction abilities, you may place the "X" assimilator token on a faction technology owned by that player instead.
 * While that token is on a technology, this card gains that technology's text. ..."
 *
 * A hint with no step: the plan does not keep where the token lies, so it cannot know whose text the card copies.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:vax';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
