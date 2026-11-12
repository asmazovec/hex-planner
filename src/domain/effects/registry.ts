/**
 * The registry of effects: every component of the catalog by id. An effect is written in a file of its own,
 * `components/<kind>/<slug>.ts` (see `fileOf`), collected here so that writing one edits no shared file; the unit
 * upgrades are generated from the unit tables; everything else is a hint, listed by `hintsFor`, so no component is
 * left without an entry. A hint's step comes from the data where the data names one.
 */
import { componentById, componentsOf, noteBase } from '../components';
import type { ComponentDef, DataPack, Game, GameState, Holdings, RuleStep } from '../types';
import type { ComponentEffect, Modifiers } from './types';
import { unitUpgradeEffects } from './unitUpgrades';

/** What the file of a component exports: its catalogue id and its effect. */
export interface ComponentFile { id: string; effect: ComponentEffect }

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

const hintOf = (component: ComponentDef): ComponentEffect => {
  const steps = component.kind === 'actionCard' ? stepsOfWindow(String(component.detail?.phase ?? ''), String(component.detail?.window ?? '')) : [];
  return { tier: 'hint', rule: component.id, ...(steps.length > 0 ? { hintAt: steps } : {}) };
};

/** The default of every component of the pack: a hint that shows its own text. */
export function hintsFor(pack: DataPack): [string, ComponentEffect][] {
  return componentsOf(pack).map(component => [component.id, hintOf(component)]);
}

/** A unit upgrade with a file of its own: the generated level first, then the file's change at each point, and everything else of the file. */
function merged(generated: ComponentEffect, file: ComponentEffect): ComponentEffect {
  type Change = (value: number, ctx: never) => number;
  const modify: Record<string, Change> = { ...(generated.modify as Record<string, Change>) };
  for (const [point, change] of Object.entries(file.modify ?? {}) as [string, Change][]) {
    const first = modify[point];
    modify[point] = first ? (value, ctx) => change(first(value, ctx), ctx) : change;
  }
  return { ...generated, ...file, tier: 'passive', modify: modify as Partial<Modifiers> };
}

interface Registry { effects: Map<string, ComponentEffect>; order: Map<string, number> }
const REGISTRIES = new WeakMap<DataPack, Registry>();

function registryOf(pack: DataPack): Registry {
  let registry = REGISTRIES.get(pack);
  if (!registry) {
    const hints = hintsFor(pack);
    const defaults = new Map(hints);
    // The written effects come first, in their own order: a unit upgrade sets the level the others then change.
    const written = new Map(unitUpgradeEffects(pack).filter(([id]) => defaults.has(id)));
    // The files follow in the order of their paths, the same on every machine.
    for (const path of Object.keys(files).sort()) {
      const { id, effect } = files[path];
      if (!defaults.has(id)) continue;
      const generated = written.get(id);
      // A file of a unit upgrade adds to its generated numbers; a hint written without steps keeps those of the data.
      written.set(id, generated ? merged(generated, effect) : effect.tier === 'hint' ? { ...defaults.get(id), ...effect } : effect);
    }
    const effects = new Map<string, ComponentEffect>([...written, ...hints.filter(([id]) => !written.has(id))]);
    registry = { effects, order: new Map([...effects.keys()].map((id, index) => [id, index])) };
    REGISTRIES.set(pack, registry);
  }
  return registry;
}

/** Every component of the pack with its effect, in registry order. */
export const effectsOf = (pack: DataPack): ReadonlyMap<string, ComponentEffect> => registryOf(pack).effects;

/** The effect of a component; none for an id the pack does not have. */
export const effectOf = (pack: DataPack, id: string): ComponentEffect | undefined => registryOf(pack).effects.get(noteBase(id));

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
  const ids = new Set([...holdings.technologies, ...holdings.relics, ...holdings.promissory, ...holdings.hand, ...leaders]);
  for (const id of holdings.exhausted) ids.delete(id);
  return [...ids].filter(id => effects.has(noteBase(id))).sort((a, b) => order.get(noteBase(a))! - order.get(noteBase(b))!);
}

/**
 * Whose components are asked. The holdings alone give the cards a player holds; with the faction come the abilities
 * and the mech of its sheet and its breakthrough, with `control` the legendary planets the player controls (their own
 * state's `control`), with `laws` the laws in play for the whole game.
 */
export interface Holder { holdings: Holdings; faction?: string; control?: GameState['control']; laws?: readonly string[] }

/** The holder a player of a game is: `state` is their own, `shared` mine, which keeps the laws. */
export const holderOf = (game: Pick<Game, 'faction'>, state: Pick<GameState, 'holdings' | 'control' | 'laws'>, shared: Pick<GameState, 'laws'> = state): Holder =>
  ({ holdings: state.holdings, faction: game.faction, control: state.control, laws: shared.laws });

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
export function inForceOf(pack: DataPack, holder: Holder, only?: (effect: ComponentEffect) => boolean): string[] {
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
  if (holder.control) for (const planetId in holder.control) if (holder.control[planetId] === 'me') ask(`legendary:${planetId}`);
  for (const id of holder.laws ?? []) ask(id);
  return found.length > 1 ? found.sort((a, b) => order.get(noteBase(a))! - order.get(noteBase(b))!) : found;
}

/** The same for a player of a game: `state` is their own, `shared` mine, which keeps the laws. */
export const inForce = (pack: DataPack, game: Pick<Game, 'faction'>, state: GameState, shared: GameState = state): string[] =>
  inForceOf(pack, holderOf(game, state, shared));

const isHolder = (who: Holdings | Holder): who is Holder => 'holdings' in who;
const isPassive = (effect: ComponentEffect): boolean => effect.tier === 'passive';

/** The passive effects in force for a player, in registry order (`inForceOf`); holdings alone give only the cards held. */
export function passivesOf(pack: DataPack, who: Holdings | Holder): [string, ComponentEffect][] {
  const { effects } = registryOf(pack);
  // Asked at every point of the count: only the passive ones are gathered and put in order.
  return inForceOf(pack, isHolder(who) ? who : { holdings: who }, isPassive).map(id => [id, effects.get(noteBase(id))!]);
}

/**
 * The reminders of a step: the hint components with that step which the named players (`me` or an opponent id) hold
 * ready, in hand or in play. A component held by several of them, or in several copies, is given once.
 */
export function hintsAt(pack: DataPack, board: GameState, step: RuleStep, players: string[]): ComponentDef[] {
  const { order } = registryOf(pack);
  const ids = new Set<string>();
  for (const player of players) {
    const holdings = player === 'me' ? board.holdings : board.rivals?.[player]?.holdings;
    if (!holdings) continue;
    for (const id of readyComponents(pack, holdings)) {
      const effect = effectOf(pack, id);
      if (effect?.tier === 'hint' && effect.hintAt?.includes(step)) ids.add(id);
    }
  }
  return [...ids].sort((a, b) => order.get(noteBase(a))! - order.get(noteBase(b))!).flatMap(id => componentById(pack, id) ?? []);
}
