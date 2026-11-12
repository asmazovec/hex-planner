/**
 * The Codex (relic): "ACTION: Purge this card to take up to 3 action cards of your choice from the action card discard
 * pile."
 *
 * A hint: the cards taken are entered as gains of the component action, and the replay already purges a relic whose
 * text purges it. The plan keeps no discard pile, so "up to 3" of it cannot be checked.
 */
import type { ComponentEffect } from '../../types';

export const id = 'relic:codex';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
