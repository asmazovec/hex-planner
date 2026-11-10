/**
 * What a player holds of the game's components: where a game begins (`Game.start`), how a mark is set by hand, and
 * the one bridge from the technologies held to the unit upgrades the counts follow. The replay's side is in
 * `replay/holdings.ts`.
 */
import type { ComponentKind, DataPack, Game, Holdings, LeaderState, Plan, StartHoldings, UpgradeId } from './types';

export const emptyHoldings = (): Holdings =>
  ({ technologies: [], hand: [], relics: [], promissory: [], leaders: {}, scored: [], secrets: [], exhausted: [] });

/** The holdings a start gives, as a copy the replay may change. */
export function holdingsOf(start: StartHoldings = {}): Holdings {
  return {
    technologies: [...(start.technologies ?? [])], hand: [...(start.hand ?? [])], relics: [...(start.relics ?? [])],
    promissory: [...(start.promissory ?? [])], leaders: { ...start.leaders }, scored: [...(start.scored ?? [])],
    secrets: [...(start.secrets ?? [])], exhausted: [],
    ...(start.breakthrough ? { breakthrough: start.breakthrough } : {}),
  };
}

/** How many components a player holds: every list with its repeats, the leaders that are not locked, the breakthrough. */
export const holdingCount = (holdings: Holdings): number =>
  holdings.technologies.length + holdings.hand.length + holdings.relics.length + holdings.promissory.length
  + Object.keys(holdings.leaders).length + (holdings.breakthrough ? 1 : 0) + holdings.scored.length + holdings.secrets.length;

/** The kind an id names: ids are `<kind>:<source id>`. */
export const kindOf = (id: string): string => id.slice(0, Math.max(0, id.indexOf(':')));

const TECH = 'technology:';
const techDef = (pack: DataPack, id: string) => (id.startsWith(TECH) ? pack.technologies[id.slice(TECH.length)] : undefined);

/**
 * The units and structures whose upgrade technology is held, in the order held. This is the only place that turns
 * technologies into upgrades: every count that follows a unit's level asks it. An id the pack does not know is passed over.
 */
export function upgradesOf(holdings: Pick<Holdings, 'technologies'>, pack: DataPack): UpgradeId[] {
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

/** A player's start after their faction changed: the old faction's starting technologies go, the new one's come. */
export function startForFaction(start: StartHoldings = {}, from: string, to: string, pack: DataPack): StartHoldings {
  const gone = startingTechnologies(pack, from);
  const kept = (start.technologies ?? []).filter(id => !gone.includes(id));
  const technologies = [...kept, ...startingTechnologies(pack, to).filter(id => !kept.includes(id))];
  const { technologies: old, ...rest } = start;
  void old;
  return technologies.length > 0 ? { ...rest, technologies } : rest;
}

type ListField = 'technologies' | 'hand' | 'relics' | 'promissory' | 'scored' | 'secrets';
/** Where a component of a kind lies in the holdings; kinds not listed are not held as a list. */
export const HOLDING_FIELD: Partial<Record<ComponentKind, ListField>> = {
  technology: 'technologies', actionCard: 'hand', relic: 'relics', promissory: 'promissory', secretObjective: 'secrets', publicObjective: 'scored',
};

/**
 * The kinds of component a transaction hands over (94.3): promissory notes, and action cards, which only an ability
 * lets a player trade (94.3.1) and the app does not know abilities. A relic fragment is an exploration card, which no
 * player's holdings keep, so it is not here.
 */
export const TRANSACTION_KINDS: readonly ComponentKind[] = ['promissory', 'actionCard'];

/**
 * What a player can still hand over in a transaction: the promissory notes held and then the action cards in hand,
 * each id once, less the copies already `chosen` for it.
 */
export function tradable(holdings: Holdings, chosen: string[] = []): string[] {
  const left = [...chosen];
  const free = TRANSACTION_KINDS.flatMap(kind => holdings[HOLDING_FIELD[kind]!]).filter(id => {
    const at = left.indexOf(id);
    if (at >= 0) left.splice(at, 1);
    return at < 0;
  });
  return [...new Set(free)];
}

const playerStart = (game: Game, player: string): StartHoldings | undefined =>
  (player === 'me' ? game.start.me : game.opponents.some(o => o.id === player) ? game.start.opponents[player] ?? {} : undefined);

const withStart = (game: Game, player: string, start: StartHoldings): Game => ({
  ...game,
  start: player === 'me' ? { ...game.start, me: start } : { ...game.start, opponents: { ...game.start.opponents, [player]: start } },
});

/**
 * Marks by hand what a player (`me` or an opponent id) held when the plan begins. The kind of the id decides the place:
 * a hand of action cards keeps repeats and loses one copy at a time, everything else is held once. Leaders have `setLeader`.
 */
export function setStartHolding(game: Game, player: string, id: string, present: boolean): Game {
  const start = playerStart(game, player);
  if (!start) return game;
  const kind = kindOf(id) as ComponentKind;
  if (kind === 'breakthrough') {
    if ((start.breakthrough !== undefined) === present) return game;
    const { breakthrough, ...rest } = start;
    void breakthrough;
    return withStart(game, player, present ? { ...rest, breakthrough: 'held' } : rest);
  }
  const field = HOLDING_FIELD[kind];
  if (!field) return game;
  const list = start[field] ?? [];
  const at = list.indexOf(id);
  if (present ? at >= 0 && field !== 'hand' : at < 0) return game;
  return withStart(game, player, { ...start, [field]: present ? [...list, id] : list.filter((_, i) => i !== at) });
}

/** Marks by hand the state of a player's leader when the plan begins; `null` locks it again. */
export function setLeader(game: Game, player: string, id: string, state: LeaderState | null): Game {
  const start = playerStart(game, player);
  if (!start || (start.leaders?.[id] ?? null) === state) return game;
  const { [id]: old, ...leaders } = start.leaders ?? {};
  void old;
  return withStart(game, player, { ...start, leaders: state ? { ...leaders, [id]: state } : leaders });
}

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
