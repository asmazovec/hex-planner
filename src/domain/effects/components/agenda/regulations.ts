/**
 * Fleet Regulations (agenda, law): "For: Each player cannot have more than 4 tokens in their fleet pool. Against: Each
 * player places 1 command token from their reinforcements in their fleet pool."
 *
 * Decided: modify. The rules put no limit on the tokens of the fleet pool; the law sets one of 4. The check counts
 * against a new point of the count (`fleetPoolMax`, no limit by itself) and warns when the fleet pool holds more
 * (`fleetPoolTokens`); the law changes the number to 4. Armada still adds 2 to the ships a system holds (Fleet
 * Regulations note 1), so the law does not touch `fleetLimit`. "Against" gives each player a token once, entered by
 * the player. Pass 1: the hint it is today.
 */
import '../../points/moments';
import type { ComponentEffect } from '../../types';

export const id = 'agenda:regulations';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  modify: { fleetPoolMax: value => Math.min(value, 4) },
};
