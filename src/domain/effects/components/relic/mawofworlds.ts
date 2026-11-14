/**
 * Maw of Worlds (relic): "At the start of the agenda phase, you may purge this card and exhaust all of your planets to
 * gain any 1 technology."
 *
 * Decided (pass 2): play. The entry that names it in `uses` exhausts every planet I control; the technology is entered
 * as a gain of that entry (no prerequisites, Maw note 1); the replay already purges the relic. Pass 1 keeps it the hint
 * it is today.
 */
import { planet as planetEvents } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'relic:mawofworlds';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'self',
  play: ctx => (ctx.held ? ctx.my.planets().filter(planet => !planet.exhausted).map(planet => planetEvents.exhaust(ctx.holder, planet.id)) : []),
};
