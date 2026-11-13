/**
 * What follows an entry for its owner, once its own steps and its gains are done: the hooks of the components it gained
 * or lost (`gained`, `lost`), the checks the components in force add (`restrict`), and the limits of the hand and of the
 * secret objectives (LRR 2.4, 61.21), which the components change through the `handLimit` and `secretLimit` points.
 */
import { componentById } from '../components';
import { choicesFor } from '../effects/choices';
import { appliedFor } from '../effects/entryApply';
import { breakthroughOf } from '../effects/breakthrough';
import { effectOf, effectsOf, holderOf, inForceOf } from '../effects/registry';
import type { EffectTurn } from '../effects/types';
import handOverLimit from '../rules/codes/handOverLimit';
import secretsOverLimit from '../rules/codes/secretsOverLimit';
import { violation } from '../rules/registry';
import type { DataPack, Entry, Game, GameState, Warning } from '../types';
import type { CardRound } from './cards/index';

/** The hand limit of the rules (LRR 2.4) and the secret objective limit (61.21). */
export const HAND_LIMIT = 7;
export const SECRET_LIMIT = 3;

/** What an entry chose for the components it plays, by the names their effects ask for: a component's `choices`, an agenda's outcome and election. */
export const choicesOf = (entry: Entry): Record<string, string | number> =>
  ('choices' in entry ? entry.choices : undefined) ?? {};

/** The ids of the pack's components with a given hook: most boards ask none of them. */
const WITH = new WeakMap<DataPack, Set<'restrict' | 'gained' | 'lost'>>();
function hooked(pack: DataPack): Set<'restrict' | 'gained' | 'lost'> {
  let found = WITH.get(pack);
  if (!found) {
    found = new Set();
    for (const [, effect] of effectsOf(pack)) {
      if (effect.restrict) found.add('restrict');
      if (effect.gained) found.add('gained');
      if (effect.lost) found.add('lost');
    }
    WITH.set(pack, found);
  }
  return found;
}

export interface AfterEntry {
  game: Game;
  /** The owner's state after the entry. */
  state: GameState;
  /** My state. */
  shared: GameState;
  /** The owner's state before the entry, for who holds what ready. */
  before?: GameState;
  entry: Entry;
  pack: DataPack;
  cards?: CardRound;
  warnings: Warning[];
  /** Every player's state by `me` or opponent id; the owner's alone when not given. */
  states?: Record<string, GameState>;
}

const turnOf = (a: AfterEntry, id: string): EffectTurn => ({
  game: a.game, state: a.state, shared: a.shared, entry: a.entry, id, player: a.entry.owner ?? 'me',
  states: a.states ?? { [a.entry.owner ?? 'me']: a.state }, choices: choicesFor(a.entry, id), held: true, pack: a.pack, warnings: a.warnings,
  ...(a.cards ? { cards: a.cards } : {}),
});

/** The hooks and the checks the components in force add that follow an entry; the limits are `entryLimits`. */
export function afterEntryHooks(a: AfterEntry): void {
  const { game, state, shared, entry, pack } = a;
  const hooks = hooked(pack);
  const known = (ids: string[] | undefined): string[] => (ids ?? []).filter(id => componentById(pack, id) !== undefined);
  // The breakthrough of another faction is not gained by the owner: nothing it says when gained runs.
  const gainable = (id: string): boolean => !id.startsWith('breakthrough:') || id === breakthroughOf(pack, game.faction);
  if (hooks.has('gained')) for (const id of known(entry.gains).filter(gainable)) effectOf(pack, id)?.gained?.(turnOf(a, id));
  if (hooks.has('lost')) for (const id of known(entry.spends)) effectOf(pack, id)?.lost?.(turnOf(a, id));
  if (hooks.has('restrict')) {
    const forced = inForceOf(pack, holderOf(game, state, shared), effect => effect.restrict !== undefined);
    for (const id of forced) effectOf(pack, id)?.restrict?.(turnOf(a, id));
    // A card attached to a planet (an exploration card) is in force for that planet, whoever the entry's owner is.
    const attached = new Set(Object.values(shared.attachments ?? {}).flat());
    for (const id of attached) if (!forced.includes(id)) effectOf(pack, id)?.restrict?.(turnOf(a, id));
  }
}

/** The limits of the hand and of the secret objectives, asked once the entry has gained what it gains. */
export function entryLimits(a: AfterEntry): Warning[] {
  const { game, state, shared, entry, pack } = a;
  const warnings: Warning[] = [];
  const holder = holderOf(game, state, shared);
  // The hand grew: no more action cards than the limit (2.4, 2.4.1).
  if ((entry.gains ?? []).some(id => id.startsWith('actionCard:'))) {
    const limit = appliedFor(pack, holder, entry, 'handLimit', HAND_LIMIT, { faction: game.faction }, a.before).value;
    if (state.holdings.hand.length > limit) warnings.push(violation(handOverLimit.code, { cards: state.holdings.hand.length, limit }));
  }
  // A secret objective was drawn: no more than the limit, scored and unscored together (61.21).
  if ((entry.gains ?? []).some(id => id.startsWith('secretObjective:'))) {
    const limit = appliedFor(pack, holder, entry, 'secretLimit', SECRET_LIMIT, { faction: game.faction }, a.before).value;
    const secrets = state.holdings.secrets.length + state.holdings.scored.filter(id => id.startsWith('secretObjective:')).length;
    if (secrets > limit) warnings.push(violation(secretsOverLimit.code, { secrets, limit }));
  }
  return warnings;
}

/** The hooks, checks and limits that follow an entry. */
export function afterEntry(a: AfterEntry): void {
  afterEntryHooks(a);
  a.warnings.push(...entryLimits(a));
}
