/**
 * Signal Jamming (action card, Action): "Choose 1 non-home system that contains or is adjacent to 1 of your ships.
 * Place a command token from another player's reinforcements in that system."
 *
 * A `play` of a component action with the choices `systemId` and `player`: that player's command token comes from
 * their reinforcements into the system (their pools do not change). The card's own condition (a non-home system that
 * contains or is adjacent to one of my ships) is warned of when it is not met.
 */
import type { ComponentEffect } from '../../types';
import { adjacentSlots, isHomeSlot, shipsIn, unmet } from '../../helpers/cardPlay';

export const id = 'actionCard:jamming';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'systemId', kind: 'system' },
    { key: 'player', kind: 'player' },
  ],
  play: turn => {
    const slot = turn.choices.systemId === undefined ? undefined : String(turn.choices.systemId);
    if (slot === undefined) return;
    const near = shipsIn(turn, turn.state, slot) > 0 || adjacentSlots(turn, slot).some(next => shipsIn(turn, turn.state, next) > 0);
    if (isHomeSlot(turn, slot) || !near) unmet(turn);
    const target = turn.states[String(turn.choices.player)];
    if (target && target !== turn.state && !target.tokensOnMap.includes(slot)) target.tokensOnMap.push(slot);
  },
};
