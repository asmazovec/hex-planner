/**
 * Small readers the counting functions ask for instead of a whole per-player record: each names only the fields the
 * function really reads, so the kernel hands over what the board gives and tests may hand over any larger shape.
 */
import type { Shelf } from './shelf';
import type { UnitCounts } from './types';

/** Systems that carry one of the player's command tokens. */
export interface TokensOn { readonly tokensOnMap: readonly string[] }
/** The player's units: space by slot key, ground forces by planet id. */
export interface Pools { readonly systems: Record<string, UnitCounts>; readonly ground: Record<string, UnitCounts> }
/** Who controls a planet, as the player sees it. */
export interface ControlOf { readonly control: Record<string, 'me' | 'enemy'> }
/** What a player's own cards, control and the laws they are bound by say about their components. */
export interface Kept { readonly holdings: Shelf; readonly control?: ControlOf['control']; readonly laws?: readonly string[] }
/** The laws in play for the whole game, and the faction an `Elect Player` law binds. */
export interface LawsOf { readonly laws?: readonly string[]; readonly lawOwners?: Readonly<Record<string, string>> }
/** The laws, and every player's cards by id: what another player's component lends to this one. */
export interface SharedOf extends LawsOf { readonly holdings?: Shelf; readonly rivals?: Readonly<Record<string, { readonly holdings: Shelf }>> }
/** The laws and cards of the whole game, and what is attached to planets: what a payer's components may read of it. */
export interface PayShared extends SharedOf { readonly attachments?: Readonly<Record<string, readonly string[]>> }
/** A player paying: their cards, control and laws, the space docks on their planets, and the shared view. */
export type Payer = Kept & PayShared & { readonly docks: readonly string[] };
