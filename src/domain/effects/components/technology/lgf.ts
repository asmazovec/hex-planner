/**
 * Lazax Gate Folding (Winnu, technology): "During your tactical actions, if you do not control Mecatol Rex, treat its
 * system as if it has both an alpha and beta wormhole. ACTION: If you control Mecatol Rex, exhaust this card to place
 * 1 infantry from your reinforcements on Mecatol Rex."
 *
 * Decided: a mix. The wormholes change adjacency (40, 101): the route graph of the player's tactical actions joins the
 * Mecatol Rex system to every alpha and beta wormhole while Mecatol Rex is not theirs; this reaches the highlight of
 * where ships can fly (`routeReach`), not a warning, as a jump between marked systems is never warned of. The ACTION is
 * a `play`: one infantry on Mecatol Rex when the player controls it (the replay exhausts the card).
 *
 * Pass 1: the hint it is today; the tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:lgf';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
