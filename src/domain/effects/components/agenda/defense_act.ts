/**
 * Homeland Defense Act (agenda, law): "For: Each player can have any number of PDS units on planets they control.
 * Against: Each player destroys 1 of their PDS units."
 *
 * Decided: a waiver. A planet holds at most two PDS (63.3, 85.5); the replay warns of a third (`structureLimit` with
 * the planet). While the law is in play that check is lifted for PDS on a planet, for every player; the limit of the
 * reinforcements (six PDS, 24.4) and the number Construction places stand. "Against" is a one-off choice of a PDS to
 * destroy, entered by the player.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'agenda:defense_act';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  permit: [{
    code: 'structureLimit',
    rule: 'Each player can have any number of PDS units on planets they control.',
    // Only the count of PDS on one planet (63.3); the reinforcements' limit names no planet and stands.
    when: warning => warning.params?.kind === 'pds' && typeof warning.params?.planetId === 'string',
  }],
};
