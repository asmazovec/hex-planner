/**
 * What the movement, transport and activation steps ask of the components, added to the contract of `../types` by
 * declaration merging so that no shared file is edited. The reference for the files of the components is
 * docs/phase4/infra/movement.md.
 *
 * Points of the count (`applied(pack, holder, point, base, ctx)`):
 *  - `nebulaStart`: the move value of a ship that starts its move in a nebula (base 1, 59.2);
 *  - `gravityRift`: whether a system is a gravity rift for the mover (base 1 for a rift tile, 0 otherwise; 41.1);
 *  - `dockFighters`: the fighters one space dock keeps in its system apart from capacity (base 3);
 *  - `excessFighters`: the flying fighters beyond the capacity left, counted against the fleet pool.
 *
 * Fields of an effect (any tier; the contract test limits only `modify`, `play` and `hintAt`):
 *  - `modifyWhenNamed`: changes of a point that hold for the entry that names the component (a `play` or `hint`
 *    effect cannot have `modify`); asked at `speed`, once however many copies are named;
 *  - `links`: systems the component joins as adjacent (a wormhole law, Quantum Entanglement, Lazax Gate Folding);
 *  - `onActivate`: what happens when anyone activates a system, asked of every player's components in force;
 *  - `playAt`: a `play` of a tactical action that runs in the middle of it, not after its end.
 */
import type { MoveAt } from '../../movement';
import type { MapSource } from '../../replay/board';
import type { DataPack, UnitId } from '../../types';

declare module '../types' {
  interface ModifierContext {
    /** The move value of a ship starting in a nebula: 1, or the ship's own value for a component that lifts it (Voidborn). `speed` is the value it would have elsewhere. */
    nebulaStart: { faction: string; unit?: UnitId; speed: number; from: string; pack: DataPack };
    /** A system a path enters counts as a gravity rift when the value is above 0; base 1 for a rift tile. */
    gravityRift: { faction: string; systemId: string; pack: DataPack; at?: MoveAt };
    /** The flying fighters beyond the capacity that count against the fleet pool (the base is that number). */
    excessFighters: { faction: string };
  }
  interface Ability {
    /** `play`/`hint`: changes of the points of the count for the entry that names the component, once per component. */
    modifyWhenNamed?: Partial<Modifiers>;
    /** Pairs of systems the component makes adjacent (in force, or named by the entry). */
    links?: (ctx: LinkContext) => Array<readonly [string, string]>;
    /** `play` only: run in the middle of a tactical action that names the component, not after it. */
    playAt?: 'activation' | 'combat';
  }
}

/** What a component that joins systems is asked with. */
export interface LinkContext {
  game: MapSource;
  pack: DataPack;
  /** The faction of the owner; none of the cards of one player where the question is asked of no one in particular. */
  faction: string;
  /** Whether the owner controls the planet. */
  controls: (planetId: string) => boolean;
  /** The wormhole tokens of the game: the token's type, then the slot. */
  tokens?: Record<string, string>;
  /** The tactical action of the owner (the route and its reach), or the neighbours of a transaction. */
  during: 'tactical' | 'neighbors';
}


