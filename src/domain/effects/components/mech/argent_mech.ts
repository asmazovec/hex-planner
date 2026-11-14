/**
 * Aerie Sentinel (Argent Flight, mech): "This unit does not count against capacity if it is being transported or if
 * it is in a space area with 1 or more of your ships that have capacity values."
 *
 * The capacity checks (16.1 of a moving group, 16.3 of a system) count every ground force; this one is not counted.
 * The check is lifted where the load without the mechs fits the capacity, and only where the ships have a capacity
 * value at all: an Aerie Sentinel is not carried by a ship without one (Argent Flight, Aerie Sentinel note 1).
 */
import type { Ability } from '../../../../game/abilities/types';
import type { PermitContext } from '../../../../game/abilities/types';
import type { Warning } from '../../../types';

export const id = 'mech:argent_mech';

const fits = (warning: Warning, mechs: number, ctx: PermitContext): boolean => {
  const capacity = Number(warning.params.capacity);
  const places = mechs * (ctx.pack.units.mech?.capacityUsed ?? 1);
  return capacity > 0 && mechs > 0 && Number(warning.params.load) - places <= capacity;
};

/** The slot a move leaves from: a planet is the system it lies in. */
const slotOf = (from: string, ctx: PermitContext): string => (from in ctx.pack.planets ? ctx.systemOf(from) ?? from : from);

/** The mechs of the group that left from: what its moves and its pickups carry. */
function mechsOfGroup(from: string, ctx: PermitContext): number {
  const { entry } = ctx;
  if (entry?.type !== 'tactical') return 0;
  return entry.moves.filter(move => (move.pickupOf ?? slotOf(move.from, ctx)) === from).reduce((sum, move) => sum + (move.units.mech ?? 0), 0);
}

/** The mechs in the space area of a system during the entry: those left there after it, and in its active system those it then landed or lost. */
function mechsInSpace(systemId: string, ctx: PermitContext): number {
  const { entry } = ctx;
  const there = ctx.my.unitsIn(systemId).mech ?? 0;
  if (entry?.type !== 'tactical' || entry.systemId !== systemId) return there;
  return there + entry.landings.reduce((sum, landing) => sum + (landing.units.mech ?? 0), 0) + (entry.losses?.mech ?? 0);
}

const RULE = 'This unit does not count against capacity if it is being transported or if it is in a space area with 1 or more of your ships that have capacity values.';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  permit: [
    { code: 'capacityGroup', rule: RULE, when: (warning, ctx) => fits(warning, mechsOfGroup(String(warning.params.from), ctx), ctx) },
    { code: 'capacitySystem', rule: RULE, when: (warning, ctx) => fits(warning, mechsInSpace(String(warning.params.systemId), ctx), ctx) },
  ],
};
