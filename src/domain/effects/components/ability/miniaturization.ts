/**
 * Miniaturization (Ral Nel Consortium, Thunder's Edge): "Your structures can be transported by any ship; this does not
 * require or count against capacity. While your structures are in the space area, they cannot use their unit
 * abilities. At the end of your tactical actions: you may place your structures that are in space areas onto planets
 * you control in their respective systems."
 *
 * The rules forbid transporting a structure (85.3) and the replay warns of it for everyone (`structureAboard`); the
 * ability lifts that check. The rest needs nothing here: a structure on board takes no place in the count of capacity,
 * one left in a space area is not a dock or a PDS of any planet, and the entry itself puts it on a planet at its end.
 */
import structureAboard from '../../../rules/codes/structureAboard';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'ability:miniaturization';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  permit: [{ code: structureAboard.code, rule: 'Your structures can be transported by any ship; this does not require or count against capacity.' }],
};
