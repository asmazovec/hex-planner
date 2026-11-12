/**
 * Arbiters (Emirates of Hacan): "When you are negotiating a transaction, action cards can be exchanged as part of
 * that transaction."
 *
 * Decided: a `passive` waiver of `transactionKind` (94.3: players "cannot exchange other types of cards"; 94.3.1: the
 * Hacan can also exchange action cards), narrowed with `when` to an action card. Today the replay lets every player
 * trade action cards without a warning (`TRANSACTION_KINDS` holds `actionCard`); the check must first warn for
 * everyone, then the ability lifts it for the Hacan's own transactions. Any other kind (a technology) still stands.
 * Pass 1: still the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:arbiters';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
