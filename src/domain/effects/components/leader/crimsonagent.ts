/**
 * Ahk Ravin (Crimson Rebellion, agent): "ACTION: Exhaust this card to choose 1 player. That player may swap the position
 * of 2 of their ships in any systems; they may transport units when they swap."
 *
 * Decided: a reminder of the component action. The replay already exhausts an agent its action plays (51.4). The swap
 * moves ships of a chosen player between two systems outside a tactical action; the editor of a component action has
 * no fields for it, and the player enters the new positions by hand. A swap is not a move (Ahk Ravin note 1), so no
 * check of movement would apply to it anyway.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:crimsonagent';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['component'] };
