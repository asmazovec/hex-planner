/**
 * Exchange Program (action card, Thunder's Edge): "ACTION: Choose another player. You and that player may agree to
 * place 1 infantry from each of your reinforcements into coexistence on a planet the other player controls that
 * contains their ground forces; if no agreement is reached, you each discard 1 token from your fleet pool."
 *
 * A hint: the text is shown in the block of its step (component, from the card's window), and nothing is counted or
 * lifted. The outcome is an agreement with another player, unknown when planning, and coexistence of ground forces on
 * one planet is not modelled; the token discarded from the fleet pool is an adjustment entered by hand.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:exchangeprogram';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
