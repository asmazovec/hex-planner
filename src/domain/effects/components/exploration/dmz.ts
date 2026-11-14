/**
 * Demilitarized Zone (cultural exploration, Prophecy of Kings): "Return all structures on this planet to your
 * reinforcements. Then, return all ground forces on this planet to the space area. Attach: Units cannot be committed
 * to, produced on, or placed on this planet. During the agenda phase, this planet's planet card can be traded as part
 * of a transaction."
 *
 * Decided: `play` plus a new check. Played in the `uses` of the tactical action whose landing takes control of the
 * planet: the player's structures there go back, the ground forces go up to the space area of the system (control of
 * the planet stays, 12.2), and the card is attached to the planet (`attachments`, 35.8). From then on a landing or a
 * production onto that planet is warned of for everyone with a new code (`planetDemilitarized`, the card's own text;
 * step invasion, asked of the attachments of the planets by `afterEntry`). Trading the planet card in the agenda phase is
 * not modelled (no agenda phase). Pass 2: written.
 */
import planetDemilitarized from '../../../rules/codes/planetDemilitarized';
import { violation } from '../../../rules/registry';
import { planetsNamed } from '../../helpers/planetsNamed';
import type { Ability } from '../../../../game/abilities/types';
import type { GameEvent } from '../../../../game/abilities/types';

export const id = 'exploration:dmz';

/** The hooks written for the kernel: they read the board and return events. */
export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'anyone',
  on: {
    onGainControl: (ctx, got) => {
      if (!got.explores) return;
      const { planetId } = got;
      const events: GameEvent[] = [];
      // Structures go back to the reinforcements; the ground forces go up to the space area, and control stays (12.2).
      const held = ctx.board.planets[planetId];
      if (held !== undefined && Object.values(held.structures).some(count => count)) events.push({ type: 'StructureRemoved', player: ctx.holder, at: { planet: planetId }, structures: held.structures });
      const ground = ctx.my.unitsOn(planetId);
      if (Object.values(ground).some(count => count)) {
        const slot = ctx.systemOf(planetId);
        events.push(slot === undefined ? { type: 'UnitsRemoved', player: ctx.holder, at: { planet: planetId }, units: ground } : { type: 'UnitsMoved', player: ctx.holder, from: { planet: planetId }, to: { slot }, units: ground });
      }
      return [...events, { type: 'CardAttached', planet: planetId, card: id }];
    },
    // "Units cannot be committed to, produced on, or placed on this planet": an attached card is in force for its planet
    // (`afterEntry` asks the attachments), for every player. The entry that plays the card has just cleared the planet.
    restrict: ctx => {
      const entry = ctx.entry;
      if (entry === undefined) return;
      // The card names itself in `uses` (or as the action); `playedBy` is not imported, as the waivers load the registry that loads this file.
      if ((entry.type === 'component' && entry.componentId === id) || entry.uses?.includes(id) || entry.spends?.includes(id)) return;
      const named = planetsNamed(entry);
      for (const [planetId, held] of Object.entries(ctx.board.planets)) {
        if (held.attached.includes(id) && named.has(planetId)) ctx.warn(violation(planetDemilitarized.code, { planetId }));
      }
    },
  },
};
