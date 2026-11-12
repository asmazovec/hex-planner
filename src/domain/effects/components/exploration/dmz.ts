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
import { attachCard } from '../../../replay/invasion';
import planetDemilitarized from '../../../rules/codes/planetDemilitarized';
import { violation } from '../../../rules/registry';
import { systemOfPlanet } from '../../../stacks';
import { planetsNamed } from '../../helpers/planetsNamed';
import type { ComponentEffect } from '../../types';

export const id = 'exploration:dmz';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  onGainControl: turn => {
    if (!turn.explores) return;
    const { state, planetId } = turn;
    // Structures go back to the reinforcements; the ground forces go up to the space area, and control stays (12.2).
    state.docks = state.docks.filter(dock => dock !== planetId);
    delete state.pds[planetId];
    const slot = systemOfPlanet(turn.game, planetId, turn.pack);
    const ground = state.ground[planetId] ?? {};
    if (slot !== undefined) {
      const space = (state.systems[slot] ??= {});
      for (const [unit, count] of Object.entries(ground)) space[unit as keyof typeof space] = (space[unit as keyof typeof space] ?? 0) + (count ?? 0);
    }
    delete state.ground[planetId];
    attachCard(turn.game, state, planetId, id, turn.pack, turn.warnings);
  },
  // "Units cannot be committed to, produced on, or placed on this planet": an attached card is in force for its planet
  // (`afterEntry` asks the attachments), for every player. The entry that plays the card has just cleared the planet.
  restrict: ({ entry, shared, warnings }) => {
    // The card names itself in `uses` (or as the action); `playedBy` is not imported, as the waivers load the registry that loads this file.
    if ((entry.type === 'component' && entry.componentId === id) || entry.uses?.includes(id) || entry.spends?.includes(id)) return;
    const named = planetsNamed(entry);
    for (const [planetId, cards] of Object.entries(shared.attachments ?? {})) {
      if (cards.includes(id) && named.has(planetId)) warnings.push(violation(planetDemilitarized.code, { planetId }));
    }
  },
};
