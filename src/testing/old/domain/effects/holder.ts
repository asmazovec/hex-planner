/**
 * The holder a player of an old game is, for the counting functions the old replay shares with the application: built
 * from the old per-player state. In it a state calls its own planets `me`, and the players are named by the old ids
 * (`me`, an opponent's id), which is also how the notes of an old state are addressed.
 */
import type { Holder } from '../../../../domain/effects/registry';
import type { Shelf } from '../../../../domain/shelf';

/** What a player's own cards, control and the laws they are bound by say about their components. */
export interface Kept { readonly holdings: Shelf; readonly control?: Record<string, 'me' | 'enemy'>; readonly laws?: readonly string[] }
/** The laws in play for the whole game, and the faction an `Elect Player` law binds. */
export interface LawsOf { readonly laws?: readonly string[]; readonly lawOwners?: Readonly<Record<string, string>> }
/** The laws, and every player's cards by id: what another player's component lends to this one. */
export interface SharedOf extends LawsOf { readonly holdings?: Shelf; readonly rivals?: Readonly<Record<string, { readonly holdings: Shelf }>> }

/**
 * `state` is the player's own, `shared` mine, which keeps the laws. A state of a view is shared and never changes, so
 * holders that come to the same holdings, control, laws and lent holdings are the one holder, and what is kept per
 * holder (what is in force, the passive effects) is worked out once.
 */
const HOLDER_KEPT = new WeakMap<object, { control: Kept['control']; holder: Holder }[]>();

const sameList = (a: readonly string[] | undefined, b: readonly string[] | undefined): boolean =>
  a === b || (a !== undefined && b !== undefined && a.length === b.length && a.every((id, i) => id === b[i]));
const sameOthers = (a: Holder['others'], b: Holder['others']): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => a[key] === b[key]);
};

export function holderOf(game: { faction: string }, state: Kept, shared: SharedOf = state): Holder {
  const built = holderBuilt(game, state, shared);
  let kept = HOLDER_KEPT.get(state.holdings);
  const same = kept?.find(k => k.holder.faction === built.faction && k.control === state.control && sameList(k.holder.laws, built.laws) && sameOthers(k.holder.others, built.others));
  if (same) return same.holder;
  if (!kept) HOLDER_KEPT.set(state.holdings, kept = []);
  if (kept.length >= 8) kept.shift();
  kept.push({ control: state.control, holder: built });
  return built;
}

const holderBuilt = (game: { faction: string }, state: Kept, shared: SharedOf): Holder => {
  const control = state.control;
  return {
    holdings: state.holdings, faction: game.faction, laws: lawsFor(shared, game.faction),
    ...(control ? { controls: (planetId: string) => control[planetId] === 'me' } : {}),
    ...('rivals' in shared || 'holdings' in shared ? { others: othersOf(shared as Pick<SharedOf, 'holdings' | 'rivals'>) } : {}),
  };
};

/** Every player's holdings by `me` or opponent id, from my state, which holds the opponents' in `rivals`. */
const othersOf = (shared: Pick<SharedOf, 'holdings' | 'rivals'>): Record<string, Shelf> =>
  ({ me: shared.holdings as Shelf, ...Object.fromEntries(Object.entries(shared.rivals ?? {}).map(([id, rival]) => [id, rival.holdings])) });

/** The laws that bind a faction: those of the whole game, and the `Elect Player` laws only for the player they elected. */
const lawsFor = (shared: LawsOf, faction: string): readonly string[] | undefined =>
  (shared.lawOwners && shared.laws ? shared.laws.filter(id => shared.lawOwners![id] === undefined || shared.lawOwners![id] === faction) : shared.laws);
