/**
 * Magmus (Embers of Muaat, commander): "After you spend a token from your strategy pool: You may gain 1 trade good."
 *
 * Decided: `passive`. While the commander is unlocked, every token the Muaat spends from the strategy pool (a
 * secondary ability, Star Forge, a technology's cost) gives one trade good after it is spent (Muaat note 1); a
 * secondary that costs no token gives none. Gaining a trade good is never a loss, so "may" is taken as used. It needs
 * a point of the count asked where a strategy token is spent. Pass 1: still the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:muaatcommander';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
