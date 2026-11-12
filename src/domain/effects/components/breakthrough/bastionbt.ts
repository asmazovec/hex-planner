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
import { planetsOf } from '../../../replay/board';
import { othersIn } from '../../../replay/production';
import productionShipsAway from '../../../rules/codes/productionShipsAway';
import type { UnitId } from '../../../types';
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:bastionbt';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  landingOffer: { shipsAway: true },
  waive: [{
    code: productionShipsAway.code,
    rule: 'you may exhaust this card to place those ships in a system that contains 1 of your command tokens, at least 1 of your ground forces, and no other player\'s ships',
    // The three conditions of the system the ships were placed in, as the action leaves it.
    when: ({ params }, { game, pack, after }) => {
      const to = String(params.to);
      const isGround = (counts: Record<string, number | undefined> | undefined) => Object.entries(counts ?? {}).some(([unit, count]) => (count ?? 0) > 0 && pack.units[unit as UnitId]?.ground);
      const ground = planetsOf(game, to, pack).some(planetId => isGround(after.ground[planetId])) || isGround(after.systems[to]);
      return after.tokensOnMap.includes(to) && ground && !othersIn(game, after, to, pack);
    },
  }],
};
