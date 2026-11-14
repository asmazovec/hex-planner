/**
 * The Icon (Last Bastion, breakthrough): "When you produce ships, you may exhaust this card to place those ships in a
 * system that contains 1 of your command tokens, at least 1 of your ground forces, and no other player's ships."
 *
 * Decided: a `play` with a waiver. LRR 68.2: "When a player produces ships by using Production that player must place
 * them in the active system." A tactical action that builds ships may name another system for them; the replay warns
 * of it for everyone (a new code, 68.2, step production). The Icon, named in «Used» of that action (and so exhausted),
 * lifts the warning when the system named holds my command token, at least one of my ground forces (on a planet or in
 * its space area) and no other player's ships. The ships stand there whether or not the warning is lifted.
 *
 * The field is `shipsTo` of the tactical entry; the editor offers the systems with my command token while the card is in
 * force (`landingOffer.shipsAway`).
 */
import { holdsShips } from '../../../movement';
import { unitIds } from '../../../replay/state';
import productionShipsAway from '../../../rules/codes/productionShipsAway';
import type { UnitCounts } from '../../../types';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'breakthrough:bastionbt';

export const ability: Ability = {
  holder: 'self',
  tier: 'play',
  rule: id,
  landingOffer: { shipsAway: true },
  permit: [{
    code: productionShipsAway.code,
    rule: 'you may exhaust this card to place those ships in a system that contains 1 of your command tokens, at least 1 of your ground forces, and no other player\'s ships',
    // The three conditions of the system the ships were placed in, as the action leaves it.
    when: ({ params }, ctx) => {
      const to = String(params.to);
      const isGround = (counts: UnitCounts): boolean => unitIds(counts).some(unit => ctx.pack.units[unit]?.ground);
      const ground = ctx.planetsIn(to).some(planetId => isGround(ctx.my.unitsOn(planetId))) || isGround(ctx.my.unitsIn(to));
      const tokens = ctx.board.systems[to]?.tokens.includes(ctx.holder) ?? false;
      return tokens && ground && !ctx.table.players.some(player => player.id !== ctx.holder && holdsShips(ctx.of(player.id).unitsIn(to), ctx.pack));
    },
  }],
};
