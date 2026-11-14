/**
 * Letani Miasmiala, Ultrasonic Emitter (Arborec, hero): "ACTION: Produce any number of units in any number of systems
 * that contain 1 or more of your ground forces. Then, purge this card."
 *
 * A `play`: its component action carries a production (`effects.production`, placed and paid as a production is). No
 * unit uses PRODUCTION (Arborec note 3), so the need of a producing unit, its value and the place of the ground forces
 * are lifted, but only for a system that holds my ground forces; a system without them, ships among other players'
 * ships (note 2) and the cost (note 1) are still checked. The replay purges the hero.
 */
import { unitIds } from '../../../replay/state';
import type { Ability } from '../../../../game/abilities/types';
import type { PermitContext } from '../../../../game/abilities/types';

export const id = 'leader:arborechero';

const RULE = 'Produce any number of units in any number of systems that contain 1 or more of your ground forces';

/** The system holds one or more of my ground forces before the turn. */
const hasGround = (systemId: string, ctx: PermitContext): boolean =>
  ctx.planetsIn(systemId).some(planetId => unitIds(ctx.prior.my.unitsOn(planetId)).some(unit => ctx.pack.units[unit]?.ground));

/** The system the hero's production is made in. */
const producedIn = (ctx: PermitContext): string | undefined => (ctx.entry?.type === 'component' ? ctx.entry.effects?.production?.systemId : undefined);

export const ability: Ability = {
  holder: 'self',
  tier: 'play',
  rule: id,
  produces: true,
  permit: [
    { code: 'noProduction', rule: RULE, when: (warning, ctx) => hasGround(String(warning.params.systemId), ctx) },
    { code: 'productionOver', rule: RULE, when: (_warning, ctx) => { const system = producedIn(ctx); return system !== undefined && hasGround(system, ctx); } },
    { code: 'productionPlace', rule: RULE, when: (_warning, ctx) => { const system = producedIn(ctx); return system !== undefined && hasGround(system, ctx); } },
  ],
};
