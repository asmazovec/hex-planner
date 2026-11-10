/**
 * The registry of effects: every component of the catalog by id. The effects the app applies by itself are written
 * out (so far the unit upgrades, generated from the unit tables); everything else is a hint, listed by `hintsFor`,
 * so no component is left without an entry. A hint's step comes from the data where the data names one.
 */
import { componentById, componentsOf } from '../components';
import type { ComponentDef, DataPack, GameState, Holdings, RuleStep } from '../types';
import type { ComponentEffect } from './types';
import { unitUpgradeEffects } from './unitUpgrades';

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

interface Registry { effects: Map<string, ComponentEffect>; order: Map<string, number> }
const REGISTRIES = new WeakMap<DataPack, Registry>();

function registryOf(pack: DataPack): Registry {
  let registry = REGISTRIES.get(pack);
  if (!registry) {
    const hints = hintsFor(pack);
    const known = new Set(hints.map(([id]) => id));
    // The written effects come first, in their own order: a unit upgrade sets the level the others then change.
    const written = new Map(unitUpgradeEffects(pack).filter(([id]) => known.has(id)));
    const effects = new Map<string, ComponentEffect>([...written, ...hints.filter(([id]) => !written.has(id))]);
    registry = { effects, order: new Map([...effects.keys()].map((id, index) => [id, index])) };
    REGISTRIES.set(pack, registry);
  }
  return registry;
}

/** Every component of the pack with its effect, in registry order. */
export const effectsOf = (pack: DataPack): ReadonlyMap<string, ComponentEffect> => registryOf(pack).effects;

/** The effect of a component; none for an id the pack does not have. */
export const effectOf = (pack: DataPack, id: string): ComponentEffect | undefined => registryOf(pack).effects.get(id);

/** The place of a component in the registry, for the order effects are asked in. */
export const orderOf = (pack: DataPack, id: string): number => registryOf(pack).order.get(id) ?? Number.MAX_SAFE_INTEGER;

/**
 * The components a player has ready: technologies, relics, promissory notes, action cards in hand and unlocked
 * leaders, less what is exhausted. Each id once, in registry order; ids the pack does not know are left out.
 */
export function readyComponents(pack: DataPack, holdings: Holdings): string[] {
  const { effects, order } = registryOf(pack);
  const leaders = Object.keys(holdings.leaders).filter(id => holdings.leaders[id] === 'unlocked');
  const ids = new Set([...holdings.technologies, ...holdings.relics, ...holdings.promissory, ...holdings.hand, ...leaders]);
  for (const id of holdings.exhausted) ids.delete(id);
  return [...ids].filter(id => effects.has(id)).sort((a, b) => order.get(a)! - order.get(b)!);
}

/**
 * The passive effects a player has in force, in registry order: of the technologies, relics, promissory notes and
 * unlocked leaders they hold, less what is exhausted.
 */
export function passivesOf(pack: DataPack, holdings: Holdings): [string, ComponentEffect][] {
  const { effects, order } = registryOf(pack);
  const found: [string, ComponentEffect][] = [];
  const ask = (id: string): void => {
    const effect = effects.get(id);
    if (effect?.tier === 'passive' && !holdings.exhausted.includes(id) && !found.some(([known]) => known === id)) found.push([id, effect]);
  };
  for (const id of holdings.technologies) ask(id);
  for (const id of holdings.relics) ask(id);
  for (const id of holdings.promissory) ask(id);
  for (const id in holdings.leaders) if (holdings.leaders[id] === 'unlocked') ask(id);
  return found.length > 1 ? found.sort((a, b) => order.get(a[0])! - order.get(b[0])!) : found;
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
  return [...ids].sort((a, b) => order.get(a)! - order.get(b)!).flatMap(id => componentById(pack, id) ?? []);
}
