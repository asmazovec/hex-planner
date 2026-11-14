/**
 * The choices a played component asks for: where an entry keeps them, and the candidates the interface offers. The
 * replay hands a component's `play` the choices of its own (`choicesFor`); the editors read the same function, so what
 * the player pressed and what the effect sees are one thing.
 */
import type { TurnFacts } from '../../game/turnFacts';
import type { ChoiceSpec } from './types';

type Chosen = Record<string, string | number>;

/**
 * What the entry chose for the component `id`. The component action takes the entry's `choices`; a component named in
 * `uses` takes them only on an entry with no component action of its own (a tactical action or a pass has no other
 * use for them). `useChoices[id]` is the entry's choices for that component alone and wins over them.
 */
export function choicesFor(entry: TurnFacts, id: string): Chosen {
  const own = entry.type === 'component' ? entry.componentId : undefined;
  const flat = own === id || own === undefined ? entry.choices : undefined;
  return { ...flat, ...entry.useChoices?.[id] };
}

/** The entry with `chosen` kept for the component `id`: in `choices` for its component action, in `useChoices` for any other. */
export function withChoices(entry: TurnFacts, id: string, chosen: Chosen): Pick<TurnFacts, 'choices' | 'useChoices'> {
  if (entry.type === 'component' && entry.componentId === id) return { choices: Object.keys(chosen).length > 0 ? chosen : undefined, useChoices: entry.useChoices };
  const rest = { ...entry.useChoices };
  if (Object.keys(chosen).length > 0) rest[id] = chosen;
  else delete rest[id];
  return { choices: entry.choices, useChoices: Object.keys(rest).length > 0 ? rest : undefined };
}

/** The choices of `specs` that stand on the screen given what is chosen: each shown while its `when` holds. */
export const shownChoices = (specs: readonly ChoiceSpec[], chosen: Chosen): ChoiceSpec[] => specs.filter(spec => spec.when?.(chosen) ?? true);
