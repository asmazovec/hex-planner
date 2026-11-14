/**
 * Colonial Redistribution (agenda, directive): "Destroy each unit on the elected planet. Then, the player who controls
 * that planet chooses 1 player with the fewest victory points - that player may place 1 infantry from their
 * reinforcements on that planet."
 *
 * Decided: play. The units on the elected planet, ground forces and structures alike, leave the board the plan counts;
 * the planet is the entry's choice (`choices.planet`). The infantry placed then is another player's choice and is not
 * modelled.
 */
import { removeUnits, structures } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import type { GameEvent } from '../../../../game/events';

export const id = 'agenda:redistribution';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'planet', kind: 'planet' }],
  holder: 'self',
  play: ctx => {
    const planet = String(ctx.choices.planet ?? '');
    if (planet === '') return [];
    const events: GameEvent[] = [];
    const here = ctx.board.planets[planet];
    for (const [player, units] of Object.entries(here?.ground ?? {})) if (Object.values(units).some(n => (n ?? 0) > 0)) events.push(removeUnits(player, { planet }, units));
    if (here?.owner !== undefined && Object.values(here.structures).some(n => (n ?? 0) > 0)) events.push(structures.remove(here.owner, planet, here.structures));
    return events;
  },
};
