/**
 * Small readers the counting functions ask for instead of a whole record of a player: each names only the fields the
 * function really reads, so the kernel hands over what the board gives.
 */
import type { UnitCounts } from './types';

/** Systems that carry one of the player's command tokens. */
export interface TokensOn { readonly tokensOnMap: readonly string[] }
/** The player's units: space by slot key, ground forces by planet id. */
export interface Pools { readonly systems: Record<string, UnitCounts>; readonly ground: Record<string, UnitCounts> }
/** The faction of the player a count is made for: what a unit of theirs is, by their sheet. */
export interface OfFaction { readonly faction: string }
