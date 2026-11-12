/**
 * Imperial Arms Vault (Hope's End, legendary planet): "You may exhaust this card at the end of your turn to place 1
 * mech from your reinforcements on any planet you control or draw 1 action card"
 *
 * To be a `play` effect: any entry of my turn names the card in `uses` with `choices.hopesend` = 'mech' and
 * `choices.hopesendPlanet`; the mech stands on that planet after the entry. The other branch draws an unknown card,
 * entered with `gains`, and changes nothing else. Pass 1: the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'legendary:hopesend';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
