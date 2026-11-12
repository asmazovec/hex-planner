/**
 * Uprising (action card, Action): "Exhaust 1 non-home planet controlled by another player. Then gain trade goods
 * equal to its resource value."
 *
 * A `play` of a component action with the choice `planetId`: the other player's planet is exhausted and I gain trade
 * goods equal to its resources. A home planet, a planet of mine or an exhausted one is warned of; a planet of mine
 * changes nothing, the others are counted as entered.
 */
import type { ComponentEffect } from '../../types';
import { exhaust, rivalStateOf, unmet } from '../../helpers/cardPlay';

export const id = 'actionCard:uprising';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'planetId', kind: 'planet' }],
  play: turn => {
    if (turn.choices.planetId === undefined) return;
    const planetId = String(turn.choices.planetId);
    const owner = rivalStateOf(turn, planetId);
    const home = Object.values(turn.pack.tiles).some(tile => tile.kind === 'home' && tile.planetIds.includes(planetId));
    if (!owner || home || owner.exhausted.includes(planetId)) unmet(turn);
    if (!owner) return;
    exhaust(owner, planetId);
    turn.state.tradeGoods += turn.pack.planets[planetId]?.resources ?? 0;
  },
};
