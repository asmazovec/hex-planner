/**
 * The registry of effects: every component of the catalog by id. An effect is written in a file of its own,
 * `components/<kind>/<slug>.ts` (see `fileOf`), collected here so that writing one edits no shared file; the unit
 * upgrades are generated from the unit tables; everything else is a hint, listed by `hintsFor`, so no component is
 * left without an entry. A hint's step comes from the data where the data names one.
 */
import { componentById, componentsOf, noteAddress, noteBase } from '../components';
import type { ComponentDef, DataPack, Game, GameState, Holdings, RuleStep } from '../types';
import { defaultHolder, type HolderRule } from './holder';
import type { Ability, Modifiers } from './types';
import { unitUpgradeEffects } from './unitUpgrades';

/** What the file of a component exports: its catalogue id and its ability. */
export interface ComponentFile { id: string; ability: Ability }

/** The ability a component file exports. */
export const effectOfFile = (file: ComponentFile): Ability => file.ability;

const files = import.meta.glob<ComponentFile>(['./components/*/*.ts', '!./components/*/*.test.ts'], { eager: true });

/** Every effect file by its path as the collector sees it, for the contract test. */
export const COMPONENT_FILES: Readonly<Record<string, ComponentFile>> = files;

export { fileOf } from './files';

/** The windows of action cards by the step of the round they belong to; a window may speak of more than one. */
const WINDOWS: [RuleStep, (window: string) => boolean][] = [
  ['activation', window => /\bactivates? (a system|an anomaly)\b/i.test(window)],
  ['movement', window => /\bmoves ships\b/i.test(window)],
  // Ground combat is fought in the invasion; the rolls of unit abilities other than Bombardment belong to the battle in space.
  ['combat', window => (/\bcombat\b/i.test(window) && !/\bground (combat|forces)\b/i.test(window))
    || /SUSTAIN DAMAGE|SPACE CANNON|ANTI-FIGHTER BARRAGE|\bretreat/i.test(window) || /\bships?\b.*\bis destroyed\b/i.test(window)],
  ['invasion', window => /\binvasion\b|\bcommits units to land\b|BOMBARDMENT|\bground combat\b|\bgains? control of a planet\b/i.test(window)],
  ['production', window => /\bPRODUCTION\b/.test(window)],
  ['transaction', window => /\btransaction\b/i.test(window)],
  // A card headed "Action" is played as a component action (2.6.1).
  ['component', window => window === 'Action'],
];

/**
 * The steps an action card's timing speaks of, from its phase and the window printed in bold. The agenda and strategy
 * phases have no step, and neither has a window about turns or about other cards.
 */
export function stepsOfWindow(phase: string, window: string): RuleStep[] {
  if (phase === 'status') return ['status'];
  if (phase === 'agenda' || phase === 'strategy') return [];
  return WINDOWS.filter(([, matches]) => matches(window)).map(([step]) => step);
}

const hintOf = (component: ComponentDef): Ability => {
  const steps = component.kind === 'actionCard' ? stepsOfWindow(String(component.detail?.phase ?? ''), String(component.detail?.window ?? '')) : [];
  return { tier: 'hint', rule: component.id, ...(steps.length > 0 ? { hintAt: steps } : {}) };
};

/** The default of every component of the pack: a hint that shows its own text. */
export function hintsFor(pack: DataPack): [string, Ability][] {
  return componentsOf(pack).map(component => [component.id, hintOf(component)]);
}

/** A unit upgrade with a file of its own: the generated level first, then the file's change at each point, and everything else of the file. */
function merged(generated: Ability, file: Ability): Ability {
  type Change = (value: number, ctx: never) => number;
  const modify: Record<string, Change> = { ...(generated.modify as Record<string, Change>) };
  for (const [point, change] of Object.entries(file.modify ?? {}) as [string, Change][]) {
    const first = modify[point];
    modify[point] = first ? (value, ctx) => change(first(value, ctx), ctx) : change;
  }
  return { ...generated, ...file, tier: 'passive', modify: modify as Partial<Modifiers> };
}

interface Registry { effects: Map<string, Ability>; order: Map<string, number> }
const REGISTRIES = new WeakMap<DataPack, Registry>();

export function registryOf(pack: DataPack): Registry {
  let registry = REGISTRIES.get(pack);
  if (!registry) {
    const hints = hintsFor(pack);
    const defaults = new Map(hints);
    // The written effects come first, in their own order: a unit upgrade sets the level the others then change.
    const written = new Map(unitUpgradeEffects(pack).filter(([id]) => defaults.has(id)));
    // The files follow in the order of their paths, the same on every machine.
    for (const path of Object.keys(files).sort()) {
      const id = files[path].id;
      const effect = effectOfFile(files[path]);
      if (!defaults.has(id)) continue;
      const generated = written.get(id);
      // A file of a unit upgrade adds to its generated numbers; a hint written without steps keeps those of the data.
      written.set(id, generated ? merged(generated, effect) : effect.tier === 'hint' ? { ...defaults.get(id), ...effect } : effect);
    }
    const effects = new Map<string, Ability>([...written, ...hints.filter(([id]) => !written.has(id))]);
    registry = { effects, order: new Map([...effects.keys()].map((id, index) => [id, index])) };
    REGISTRIES.set(pack, registry);
  }
  return registry;
}

/** Every component of the pack with its effect, in registry order. */
export const effectsOf = (pack: DataPack): ReadonlyMap<string, Ability> => registryOf(pack).effects;

/** The effect of a component; none for an id the pack does not have. */
export const effectOf = (pack: DataPack, id: string): Ability | undefined => registryOf(pack).effects.get(noteBase(id));

/** The place of a component in the registry, for the order effects are asked in. */
export const orderOf = (pack: DataPack, id: string): number => registryOf(pack).order.get(noteBase(id)) ?? Number.MAX_SAFE_INTEGER;

/**
 * The components a player has ready: technologies, relics, promissory notes, action cards in hand and unlocked
 * leaders, less what is exhausted. Each id once, in registry order; ids the pack does not know are left out. This is
 * what can still be used, so what the hints show; a passive effect does not ask it (`passivesOf`).
 */
export function readyComponents(pack: DataPack, holdings: Holdings): string[] {
  const { effects, order } = registryOf(pack);
  const leaders = Object.keys(holdings.leaders).filter(id => holdings.leaders[id] === 'unlocked');
  const ids = new Set([...holdings.technologies, ...holdings.relics, ...holdings.promissory, ...holdings.hand, ...holdings.secrets, ...leaders]);
  for (const id of holdings.exhausted) ids.delete(id);
  return [...ids].filter(id => effects.has(noteBase(id))).sort((a, b) => order.get(noteBase(a))! - order.get(noteBase(b))!);
}

/**
 * Whose components are asked. The holdings alone give the cards a player holds; with the faction come the abilities
 * and the mech of its sheet and its breakthrough, with `control` the legendary planets the player controls (their own
 * state's `control`), with `laws` the laws in play for the whole game.
 */
export interface Holder {
  holdings: Holdings; faction?: string; control?: GameState['control']; laws?: readonly string[];
  /** The holdings of every player by `me` or opponent id: what another player's component lends this one (an Alliance note brings its owner's commander). */
  others?: Readonly<Record<string, Holdings>>;
}

/** Whose components a count asks: the cards held alone, or a whole holder (faction sheet, planets controlled, laws in play). */
export type Who = Holdings | Holder;

/** The holder of `who`: holdings alone take the faction of the game, a holder keeps its own. */
export const holderFor = (who: Who, faction: string): Holder => ('holdings' in who ? (who.faction === undefined ? { ...who, faction } : who) : { holdings: who, faction });

/**
 * The holder a player of a game is: `state` is their own, `shared` mine, which keeps the laws. A state of a view is
 * shared and never changes, so holders that come to the same holdings, control, laws and lent holdings are the one
 * holder, and what is kept per holder (what is in force, the passive effects) is worked out once.
 */
const HOLDER_KEPT = new WeakMap<object, Holder[]>();

const sameList = (a: readonly string[] | undefined, b: readonly string[] | undefined): boolean =>
  a === b || (a !== undefined && b !== undefined && a.length === b.length && a.every((id, i) => id === b[i]));
const sameOthers = (a: Holder['others'], b: Holder['others']): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => a[key] === b[key]);
};

export function holderOf(
  game: Pick<Game, 'faction'>, state: Pick<GameState, 'holdings' | 'control' | 'laws'>,
  shared: Pick<GameState, 'laws' | 'lawOwners'> | Pick<GameState, 'laws' | 'lawOwners' | 'holdings' | 'rivals'> = state,
): Holder {
  const built = holderBuilt(game, state, shared);
  let kept = HOLDER_KEPT.get(state.holdings);
  const same = kept?.find(k => k.faction === built.faction && k.control === built.control && sameList(k.laws, built.laws) && sameOthers(k.others, built.others));
  if (same) return same;
  if (!kept) HOLDER_KEPT.set(state.holdings, kept = []);
  if (kept.length >= 8) kept.shift();
  kept.push(built);
  return built;
}

const holderBuilt = (
  game: Pick<Game, 'faction'>, state: Pick<GameState, 'holdings' | 'control' | 'laws'>,
  shared: Pick<GameState, 'laws' | 'lawOwners'> | Pick<GameState, 'laws' | 'lawOwners' | 'holdings' | 'rivals'>,
): Holder =>
  ({
    holdings: state.holdings, faction: game.faction, control: state.control, laws: lawsFor(shared, game.faction),
    ...('rivals' in shared || 'holdings' in shared ? { others: othersOf(shared as Pick<GameState, 'holdings' | 'rivals'>) } : {}),
  });

/** Every player's holdings by `me` or opponent id, from my state, which holds the opponents' in `rivals`. */
const othersOf = (shared: Pick<GameState, 'holdings' | 'rivals'>): Record<string, Holdings> =>
  ({ me: shared.holdings, ...Object.fromEntries(Object.entries(shared.rivals ?? {}).map(([id, rival]) => [id, rival.holdings])) });

/** The laws that bind a faction: those of the whole game, and the `Elect Player` laws only for the player they elected. */
const lawsFor = (shared: Pick<GameState, 'laws' | 'lawOwners'>, faction: string): readonly string[] | undefined =>
  (shared.lawOwners && shared.laws ? shared.laws.filter(id => shared.lawOwners![id] === undefined || shared.lawOwners![id] === faction) : shared.laws);

/** What a faction sheet brings by itself: the abilities and the mech; the breakthrough apart, as it must be held. */
interface Sheet { always: string[]; breakthrough?: string }
const SHEETS = new WeakMap<DataPack, Map<string, Sheet>>();
function sheetOf(pack: DataPack, faction: string): Sheet {
  let sheets = SHEETS.get(pack);
  if (!sheets) SHEETS.set(pack, sheets = new Map());
  let found = sheets.get(faction);
  if (!found) {
    const { effects } = registryOf(pack);
    const sheet = pack.factions[faction]?.sheet;
    const known = (ids: string[]) => ids.filter(id => effects.has(id));
    const breakthrough = sheet?.breakthrough ? known([`breakthrough:${sheet.breakthrough.id}`])[0] : undefined;
    found = {
      always: sheet ? known([...sheet.abilities.map(item => `ability:${item.id}`), ...sheet.mechs.map(item => `mech:${item.id}`)]) : [],
      ...(breakthrough ? { breakthrough } : {}),
    };
    sheets.set(faction, found);
  }
  return found;
}

/**
 * The components in force for a player without being played, each id once, in registry order: the technologies,
 * relics, promissory notes and leaders they hold (an exhausted card keeps its passive abilities, LRR 34.4.1; only a
 * purged leader is gone, and a locked one is not held), the abilities and the mech of their faction sheet, their
 * breakthrough once held, the legendary planets they control and the laws in play. A flagship's printed ability is
 * not a component of the catalogue and is not here. `only` keeps the components whose effect it accepts.
 */
export function inForceOf(pack: DataPack, holder: Holder, only?: (effect: Ability) => boolean): string[] {
  const { effects, order } = registryOf(pack);
  const { holdings } = holder;
  const found: string[] = [];
  const ask = (id: string): void => {
    const effect = effects.get(noteBase(id));
    if (effect && (!only || only(effect)) && !found.includes(id)) found.push(id);
  };
  for (const id of holdings.technologies) ask(id);
  for (const id of holdings.relics) ask(id);
  for (const id of holdings.promissory) ask(id);
  for (const id in holdings.leaders) if (holdings.leaders[id] !== 'purged') ask(id);
  if (holder.faction !== undefined) {
    const sheet = sheetOf(pack, holder.faction);
    for (const id of sheet.always) ask(id);
    if (sheet.breakthrough && holdings.breakthrough !== undefined) ask(sheet.breakthrough);
  }
  // An Alliance note held brings its owner's commander, while it is unlocked (the owner's holdings are in `others`).
  for (const id of holdings.promissory) {
    const owner = noteAddress(id);
    if (owner === undefined || !/^promissory:.*_an$/.test(noteBase(id))) continue;
    const lent = holder.others?.[owner]?.leaders ?? {};
    for (const leader in lent) if (lent[leader] === 'unlocked' && componentById(pack, leader)?.detail?.type === 'commander') ask(leader);
  }
  if (holder.control) for (const planetId in holder.control) if (holder.control[planetId] === 'me') ask(`legendary:${planetId}`);
  for (const id of holder.laws ?? []) ask(id);
  // A law in force may take other components out of force (Articles of War: the mechs).
  const suppressors = (holder.laws ?? []).flatMap(id => effects.get(noteBase(id))?.suppresses ?? []);
  if (suppressors.length > 0) {
    const kept = found.filter(id => !suppressors.some(suppresses => suppresses(id)));
    found.length = 0;
    found.push(...kept);
  }
  return found.length > 1 ? found.sort((a, b) => order.get(noteBase(a))! - order.get(noteBase(b))!) : found;
}

const isHolder = (who: Holdings | Holder): who is Holder => 'holdings' in who;
const isPassive = (effect: Ability): boolean => effect.tier === 'passive';

/** The passive effects in force for a player, in registry order (`inForceOf`); holdings alone give only the cards held. */
const PASSIVES = new WeakMap<object, { pack: DataPack; list: [string, Ability][] }>();
export function passivesOf(pack: DataPack, who: Holdings | Holder): [string, Ability][] {
  const kept = PASSIVES.get(who);
  if (kept && kept.pack === pack) return kept.list;
  const list = passivesBuilt(pack, who);
  PASSIVES.set(who, { pack, list });
  return list;
}
function passivesBuilt(pack: DataPack, who: Holdings | Holder): [string, Ability][] {
  const { effects } = registryOf(pack);
  // Asked at every point of the count: only the passive ones are gathered and put in order.
  return inForceOf(pack, isHolder(who) ? who : { holdings: who }, isPassive).map(id => [id, effects.get(noteBase(id))!]);
}

/** The kinds that come with a faction sheet or a planet: they are in force without being held as cards, and their reminders are asked of the holder. */
export const SHEET_KIND = /^(ability|mech|breakthrough|legendary):/;

/** On whose action a component speaks: what its file declares, else what its card prints (`holder.ts`). */
export function holderRuleOf(pack: DataPack, id: string): HolderRule {
  const declared = effectOf(pack, id)?.holder;
  if (declared) return declared;
  const def = componentById(pack, id);
  return def ? defaultHolder(def) : 'self';
}
