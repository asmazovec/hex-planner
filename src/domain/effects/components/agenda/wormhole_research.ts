/**
 * Wormhole Research (agenda):
 * "For: Each player who has 1 or more ships in a system that contains a wormhole may research 1 technology. Then,
 * destroy all ships in systems that contain an alpha or beta wormhole. Against: Each player that voted "Against"
 * removes 1 command token from their command sheet and returns it to their reinforcements."
 *
 * A directive: "For" destroys every ship in a system with an alpha or a beta wormhole, which the plan
 * counts, so it is to become a `play` of the agenda entry with its outcome. The technology a player may research is
 * entered in the entry's `gains` (90.9); the "Against" outcome depends on votes and is not counted. Pass 1: still a hint.
 */
import { removeUnits } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import type { ComponentEffect } from '../../types';

export const id = 'agenda:wormhole_research';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  // "Then, destroy all ships in systems that contain an alpha or beta wormhole": the "For" outcome only.
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    if (ctx.choices.outcome !== 'for') return [];
    const slots = Object.keys({ ...ctx.table.map, ...ctx.board.common.fracture.tiles }).filter(slot => ctx.wormholes(slot).some(hole => hole === 'alpha' || hole === 'beta'));
    return ctx.table.players.flatMap(({ id: player }) => slots.filter(slot => Object.values(ctx.of(player).unitsIn(slot)).some(n => (n ?? 0) > 0)).map(slot => removeUnits(player, { slot }, ctx.of(player).unitsIn(slot))));
  },
};
