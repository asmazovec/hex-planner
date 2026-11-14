/**
 * The choices of a component for a turn, answered from the board just before it: the one function the editor, the plays
 * and the resolver ask. Each choice comes with the candidates its component computes (a planet you control, another
 * player) through the context of any ability, for the one whose turn it is, so a rival's entry is offered the rival's
 * planets and the other players as seen from the rival. The values are what an entry keeps under its `choices`:
 * planet ids, slots, `me` or an opponent id.
 */
import { UNIT_ORDER } from '../../domain/hexLayout';
import { effectOf } from '../../domain/effects/registry';
import type { ChoiceContext, ChoiceSlot, ChoiceSpec } from '../../domain/effects/types';
import type { Turn } from '../actions';
import { legacyEntry } from '../entry';
import { contextOf } from '../resolve/hooks';
import type { Board, DataPack, Table } from '../types';

/** One choice a component asks, with what the board offers for it. */
export interface ResolvedChoice {
  spec: ChoiceSpec;
  /** False while the choice depends on an earlier one that is not chosen so: nothing is computed for it. */
  shown: boolean;
  /** The candidates by the kind of the choice (none for a number or for counts). */
  options: string[];
  /** `counts` only: the places to choose at. */
  slots: ChoiceSlot[];
}

/** The slots of the map, the open Fracture's among them. */
const slotsOf = (ctx: ChoiceContext): string[] => Object.keys({ ...ctx.table.map, ...ctx.board.common.fracture.tiles });

/** The candidates of a choice, as values: the component's own `options`, or the default of its kind. */
export function optionsOf(spec: ChoiceSpec, ctx: ChoiceContext): string[] {
  if (spec.options) return spec.options(ctx);
  switch (spec.kind) {
    case 'planet': return [...new Set(slotsOf(ctx).flatMap(slot => ctx.planetsIn(slot)))];
    case 'system': return slotsOf(ctx);
    case 'player': {
      const own = ctx.key(ctx.holder);
      // `me` first, then the others in seat order, the order a player sees them in.
      return ctx.table.players.map(player => ctx.key(player.id)).sort((a, b) => Number(b === 'me') - Number(a === 'me')).filter(key => spec.self || key !== own);
    }
    case 'unit': return [...UNIT_ORDER];
    case 'number': {
      const [min, max] = spec.range ?? [0, 0];
      return Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => String(min + i));
    }
    default: return [];
  }
}

/** What the turn chose for the component `id`: the turn's own choices for its component action, `used` choices for any other. */
export function chosenOf(turn: Turn, id: string): Record<string, string | number> {
  const own = turn.action.kind === 'component' ? turn.action.component : undefined;
  const flat = own === id || own === undefined ? turn.choices : undefined;
  return { ...flat, ...turn.used.find(use => use.component === id)?.choices };
}

/** The choices component `id` asks of `turn`, with their candidates, over the board before the turn. */
export function choicesOf(table: Table, board: Board, turn: Turn, id: string, pack: DataPack): ResolvedChoice[] {
  const specs = effectOf(pack, id)?.choose;
  if (!specs || specs.length === 0) return [];
  const chosen = chosenOf(turn, id);
  const base = contextOf(table, board, pack, turn.player, id, { actor: turn.player, choices: chosen, entry: legacyEntry(table, turn) }, () => {});
  const ctx: ChoiceContext = Object.assign(Object.create(base) as object, { chosen }) as ChoiceContext;
  return specs.map(spec => {
    const shown = spec.when?.(chosen) ?? true;
    return { spec, shown, options: shown && spec.kind !== 'counts' ? optionsOf(spec, ctx) : [], slots: shown && spec.slots ? spec.slots(ctx) : [] };
  });
}

