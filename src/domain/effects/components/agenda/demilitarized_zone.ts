/**
 * Demilitarized Zone (agenda):
 * "Attach this card to the elected planet's card. Then, destroy all units on that planet. Player's units cannot
 * land, be produced, or be placed on this planet."
 *
 * A law attached to the elected planet. It forbids what the rules allow: no unit lands, is produced or is
 * placed there. The replay is to warn of it for everyone with a new code (`planetClosed`) at the landing, the
 * production and the placing of structures; nothing lifts it. When resolved, every unit on the planet is destroyed.
 * Pass 1: still the hint it is today.
 */
import planetClosed from '../../../rules/codes/planetClosed';
import { violation } from '../../../rules/registry';
import type { Ability } from '../../../../game/abilities/types';
import type { GameEvent } from '../../../../game/abilities/types';
import { planetsNamed } from '../../helpers/planetsNamed';

export const id = 'agenda:demilitarized_zone';

/** The hooks written for the kernel: they read the board and return events. */
export const ability: Ability = {
  tier: 'passive',
  rule: id,
  holder: 'anyone',
  on: {
    // "Then, destroy all units on that planet": once, when the law is resolved, for every player.
    gained: ctx => {
      const planet = String(ctx.choices.elect ?? '');
      const events: GameEvent[] = [];
      for (const { id: player } of ctx.table.players) {
        const ground = ctx.of(player).unitsOn(planet);
        if (Object.values(ground).some(count => count)) events.push({ type: 'UnitsRemoved', player, at: { planet }, units: ground });
      }
      const held = ctx.board.planets[planet];
      if (held?.owner !== undefined && Object.values(held.structures).some(count => count)) events.push({ type: 'StructureRemoved', player: held.owner, at: { planet }, structures: held.structures });
      return events;
    },
    // "Player's units cannot land, be produced, or be placed on this planet": the replay allows all three, so the law adds the check.
    restrict: ctx => {
      if (ctx.entry === undefined) return;
      const closed = Object.entries(ctx.board.planets).filter(([, planet]) => planet.attached.includes(id)).map(([planet]) => planet);
      if (closed.length === 0) return;
      const named = planetsNamed(ctx.entry);
      for (const planetId of closed) if (named.has(planetId)) ctx.warn(violation(planetClosed.code, { planetId }));
    },
  },
};
