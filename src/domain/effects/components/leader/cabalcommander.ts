/**
 * That Which Molds Flesh (Vuil'raith Cabal, commander): "When you produce fighter or infantry units: Up to 2 of those
 * units do not count against your PRODUCTION limit."
 *
 * Decided: `passive` waiver of `productionOver`, narrowed with `when`: the production without up to 2 of its fighters
 * and infantry must fit the value. It is a waiver and not a modify: the limit stays, fewer units are counted against it.
 * Pass 1: still the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:cabalcommander';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
