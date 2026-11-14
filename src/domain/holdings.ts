/**
 * What a player holds of the game's components: where a game begins (`Game.start`), how a mark is set by hand, and
 * the one bridge from the technologies held to the unit upgrades the counts follow. The replay's side is in
 * `replay/holdings.ts`.
 */
import { componentsOf, noteAddress, noteBase, noteId, ownedBy } from './components';
import type { ComponentDef, ComponentKind, DataPack, LeaderState, Plan, StartHoldings, UpgradeId } from './types';
import type { Shelf } from './shelf';

/** The ability that purges its player's own Alliance note at setup, and the base id of that note. */
const HUBRIS = 'Hubris';
const ALLIANCE = /^promissory:.*_an$/;

export const emptyHoldings = (): Shelf =>
  ({ technologies: [], hand: [], relics: [], promissory: [], leaders: {}, scored: [], secrets: [], found: [], exhausted: [] });

/** The holdings a start gives, as a copy the replay may change. */
export function holdingsOf(start: StartHoldings = {}): Shelf {
  return {
    technologies: [...(start.technologies ?? [])], hand: [...(start.hand ?? [])], relics: [...(start.relics ?? [])],
    promissory: [...(start.promissory ?? [])], leaders: { ...start.leaders }, scored: [...(start.scored ?? [])],
    secrets: [...(start.secrets ?? [])], found: [...(start.found ?? [])], exhausted: [],
    ...(start.breakthrough ? { breakthrough: start.breakthrough } : {}),
  };
}

/** How many components a player holds: every list with its repeats, the leaders that are not locked, the breakthrough. */
export const holdingCount = (holdings: Shelf): number =>
  holdings.technologies.length + holdings.hand.length + holdings.relics.length + holdings.promissory.length
  + Object.keys(holdings.leaders).length + (holdings.breakthrough ? 1 : 0) + holdings.scored.length + holdings.secrets.length + holdings.found.length;

/** The groups the components drawer shows a player's holdings in, in the order of its tabs. */
export const COMPONENT_GROUPS = ['technologies', 'cards', 'faction', 'relics', 'objectives'] as const;
export type ComponentGroup = typeof COMPONENT_GROUPS[number];

/** How many components a player holds in each group; the laws of the game stand with the objectives. */
export const groupCounts = (holdings: Shelf, laws: string[] = []): Record<ComponentGroup, number> => ({
  technologies: holdings.technologies.length,
  cards: holdings.hand.length + holdings.promissory.length,
  faction: Object.keys(holdings.leaders).length + (holdings.breakthrough ? 1 : 0),
  relics: holdings.relics.length + holdings.found.length,
  objectives: holdings.scored.length + holdings.secrets.length + laws.length,
});

/** The kind an id names: ids are `<kind>:<source id>`. */
export const kindOf = (id: string): string => id.slice(0, Math.max(0, id.indexOf(':')));

const TECH = 'technology:';
const techDef = (pack: DataPack, id: string) => (id.startsWith(TECH) ? pack.technologies[id.slice(TECH.length)] : undefined);

/**
 * The units and structures whose upgrade technology is held, in the order held. This is the only place that turns
 * technologies into upgrades: every count that follows a unit's level asks it. An id the pack does not know is passed over.
 */
export function upgradesOf(holdings: Pick<Shelf, 'technologies'>, pack: DataPack): UpgradeId[] {
  const upgrades: UpgradeId[] = [];
  for (const id of holdings.technologies) {
    const upgrade = techDef(pack, id)?.upgrade;
    if (upgrade && !upgrades.includes(upgrade)) upgrades.push(upgrade);
  }
  return upgrades;
}

const FACTION_TECHS = new WeakMap<DataPack, Set<string>>();
function factionTechs(pack: DataPack): Set<string> {
  let ids = FACTION_TECHS.get(pack);
  if (!ids) FACTION_TECHS.set(pack, ids = new Set(Object.values(pack.factions).flatMap(f => (f.sheet?.techs ?? []).map(t => t.id))));
  return ids;
}

/** The technology that upgrades a unit or structure for a faction, as a component id: the faction's own before the common one. */
export function upgradeTech(pack: DataPack, factionId: string, kind: UpgradeId): string | undefined {
  const own = pack.factions[factionId]?.sheet?.techs.find(t => pack.technologies[t.id]?.upgrade === kind);
  if (own) return TECH + own.id;
  const shared = factionTechs(pack);
  const common = Object.values(pack.technologies).find(t => t.upgrade === kind && !shared.has(t.id));
  return common && TECH + common.id;
}

/** The technologies a faction always begins with, as component ids; none for a faction that chooses them. */
export const startingTechnologies = (pack: DataPack, factionId: string): string[] =>
  (pack.factions[factionId]?.startingTech ?? []).map(id => TECH + id);

const leadersOf = (pack: DataPack, factionId: string): ComponentDef[] =>
  componentsOf(pack).filter(c => c.kind === 'leader' && ownedBy(c, factionId));

/** The agents of a faction, as component ids: an agent needs no unlocking and begins the game readied (LRR 51.4). None without Prophecy of Kings. */
export const startingAgents = (pack: DataPack, factionId: string): string[] =>
  leadersOf(pack, factionId).filter(c => c.detail?.type === 'agent').map(c => c.id);

const notesOf = (pack: DataPack, player: string, mine: (def: ComponentDef) => boolean): string[] =>
  componentsOf(pack).filter(c => c.kind === 'promissory' && mine(c)).map(c => noteId(c.id, player));

/** The generic notes a player (`me` or an opponent id) begins with, addressed to them (69): four in the base game, Alliance with Prophecy of Kings. */
export const genericNotes = (pack: DataPack, player: string): string[] => notesOf(pack, player, c => c.faction === undefined);

/** The notes of a faction, addressed to the player who plays it; none without a faction. */
export const factionNotes = (pack: DataPack, factionId: string, player: string): string[] =>
  (factionId === '' ? [] : notesOf(pack, player, c => c.faction === factionId));

/** A note of a player and the player who holds it now, `me` or an opponent id; nobody when it is out of the game. */
export interface NotePlace { id: string; holder: string | undefined }

/** A start without the notes of a player who left the game. */
export function withoutNotesOf(start: StartHoldings, player: string): StartHoldings {
  const promissory = start.promissory?.filter(id => noteAddress(id) !== player);
  return promissory === undefined || promissory.length === start.promissory?.length ? start : { ...start, promissory };
}

/**
 * A player's start after their faction changed: the old faction's starting technologies, leaders and notes go, the new
 * one's starting technologies and notes come, and its agents come unlocked. `player` is whose start it is.
 */
export function startForFaction(start: StartHoldings = {}, from: string, to: string, pack: DataPack, player = 'me'): StartHoldings {
  const gone = startingTechnologies(pack, from);
  const kept = (start.technologies ?? []).filter(id => !gone.includes(id));
  const technologies = [...kept, ...startingTechnologies(pack, to).filter(id => !kept.includes(id))];
  const left = new Set(leadersOf(pack, from).map(c => c.id));
  const leaders: Record<string, LeaderState> = Object.fromEntries(Object.entries(start.leaders ?? {}).filter(([id]) => !left.has(id)));
  for (const id of startingAgents(pack, to)) leaders[id] = 'unlocked';
  const lost = factionNotes(pack, from, player);
  // Hubris (Mahact): the player's own Alliance is purged at setup; leaving that faction brings it back.
  const purges = (faction: string): boolean => pack.factions[faction]?.abilities.includes(HUBRIS) === true;
  const alliance = genericNotes(pack, player).filter(id => ALLIANCE.test(noteBase(id)));
  const purged = purges(to) ? alliance : [];
  const notes = (start.promissory ?? []).filter(id => !lost.includes(id) && !purged.includes(id));
  const regained = purges(from) && !purges(to) ? alliance.filter(id => !notes.includes(id)) : [];
  const promissory = [...notes, ...regained, ...factionNotes(pack, to, player).filter(id => !notes.includes(id))];
  const { technologies: old, leaders: before, promissory: held, ...rest } = start;
  void old;
  void before;
  void held;
  return {
    ...rest, ...(technologies.length > 0 ? { technologies } : {}), ...(Object.keys(leaders).length > 0 ? { leaders } : {}),
    ...(promissory.length > 0 ? { promissory } : {}),
  };
}

type ListField = 'technologies' | 'hand' | 'relics' | 'promissory' | 'scored' | 'secrets' | 'found';
/** Where a component of a kind lies in the holdings; kinds not listed are not held as a list. */
export const HOLDING_FIELD: Partial<Record<ComponentKind, ListField>> = {
  technology: 'technologies', actionCard: 'hand', relic: 'relics', promissory: 'promissory', secretObjective: 'secrets', publicObjective: 'scored', exploration: 'found',
};

const LIST_FIELDS: ListField[] = ['technologies', 'hand', 'relics', 'promissory', 'scored', 'secrets', 'found'];

/** The lists that keep repeats: a hand of action cards, and the relic fragments found. */
export const COPIED: ListField[] = ['hand', 'found'];

/** The exploration cards that are not resolved and discarded but kept faceup in the play area, besides the fragments. */
const FACEUP = ['exploration:ed1'];

/**
 * Whether an exploration card stays with the player who explored: a relic fragment (35.9) or a card that says so. The
 * rest attach to a planet, become a token or are resolved at once, so no player holds them.
 */
export const staysInPlay = (def: Pick<ComponentDef, 'id' | 'kind' | 'detail'>): boolean =>
  def.kind === 'exploration' && (def.detail?.resolution === 'fragment' || FACEUP.includes(def.id));

/**
 * What an entry can discard or lose: everything its owner held as a card before it, a hand with its repeats, and what
 * the entry itself brings, less what it already loses, a copy at a time.
 */
export function losable(holdings: Shelf, entry: { gains?: string[]; spends?: string[] }): string[] {
  const all = [...LIST_FIELDS.flatMap(field => holdings[field]), ...(entry.gains ?? [])];
  for (const id of entry.spends ?? []) {
    const at = all.indexOf(id);
    if (at >= 0) all.splice(at, 1);
  }
  return all;
}

/** What a player holds and cannot hold twice: everything held as a card but the hand of action cards. */
export const heldOnce = (holdings: Shelf): Set<string> =>
  new Set(LIST_FIELDS.filter(field => !COPIED.includes(field)).flatMap(field => holdings[field]));

/**
 * The kinds of component a transaction hands over (94.3): promissory notes, and action cards, which only an ability
 * lets a player trade (94.3.1) and the app does not know abilities. Relic fragments are exploration cards kept in the
 * play area and may be exchanged (35.9.2); the other exploration cards are held by no one.
 */
export const TRANSACTION_KINDS: readonly ComponentKind[] = ['promissory', 'actionCard', 'exploration'];

/**
 * What a player can still hand over in a transaction: the promissory notes held and then the action cards in hand,
 * each id once, less the copies already `chosen` for it.
 */
export function tradable(holdings: Shelf, chosen: string[] = [], kinds: readonly ComponentKind[] = TRANSACTION_KINDS): string[] {
  const left = [...chosen];
  const free = kinds.flatMap(kind => holdings[HOLDING_FIELD[kind]!]).filter(id => {
    const at = left.indexOf(id);
    if (at >= 0) left.splice(at, 1);
    return at < 0;
  });
  return [...new Set(free)];
}

/**
 * What a transaction offers, with the promissory notes of `player` first: a note goes back to its owner more often
 * than anywhere else, so the owner's side finds its own without a search. The rest keeps its order.
 */
export const notesOfFirst = (ids: string[], player: string): string[] =>
  [...ids.filter(id => noteAddress(id) === player), ...ids.filter(id => noteAddress(id) !== player)];

/**
 * The first round whose entries bring each component, by player (`me` or an opponent id): gains, research and scored
 * objectives; done entries for `now`, planned ones too for `forecast`. What is held from the start is not listed.
 */
export function holdingRounds(plan: Plan, filter: 'now' | 'forecast'): Record<string, Record<string, number>> {
  const rounds: Record<string, Record<string, number>> = {};
  for (const round of [...plan.rounds].sort((a, b) => a.number - b.number)) {
    for (const entry of round.entries) {
      if (entry.status === 'cancelled' || (filter === 'now' && entry.status !== 'done')) continue;
      const ids = [
        ...(entry.gains ?? []),
        ...(entry.type === 'strategic' || entry.type === 'secondary' ? entry.effects?.researched ?? [] : []),
        ...(entry.type === 'statusTokens' ? entry.scored ?? [] : []),
      ];
      if (ids.length === 0) continue;
      const mine = (rounds[entry.owner ?? 'me'] ??= {});
      for (const id of ids) mine[id] ??= round.number;
    }
  }
  return rounds;
}
