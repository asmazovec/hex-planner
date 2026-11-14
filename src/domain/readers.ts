/**
 * Small readers the counting functions ask for instead of a whole per-player record: each names only the fields the
 * function really reads, so the kernel hands over what the board gives and tests may hand over any larger shape.
 */
import type { UnitCounts } from './types';

/** Systems that carry one of the player's command tokens. */
export interface TokensOn { readonly tokensOnMap: readonly string[] }
/** The player's units: space by slot key, ground forces by planet id. */
export interface Pools { readonly systems: Record<string, UnitCounts>; readonly ground: Record<string, UnitCounts> }
/** Who controls a planet, as the player sees it. */
export interface ControlOf { readonly control: Record<string, 'me' | 'enemy'> }
