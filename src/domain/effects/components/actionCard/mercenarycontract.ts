/**
 * Mercenary Contract (action card, Thunder's Edge): "ACTION: Spend 2 trade goods to place 2 neutral infantry on any
 * non-home planet that contains no units; if that planet was owned by another player, they return its planet card to
 * the planet card deck."
 *
 * A `play` effect of its component action, for what the plan counts: the 2 trade goods spent (`shortTradeGoods` when the
 * player has fewer, as any payment in trade goods) and the planet chosen, `{ planet: '<planet id>' }`, which must be a
 * non-home planet with no units (`playTargetInvalid` otherwise). A planet of mine loses my control, a rival's likewise.
 * Neutral units are not modelled (no neutral player on the board), so the two infantry themselves are not placed.
 */
import { componentById } from '../../../components';
import { planetsOf, systemSlots, tileIdOf } from '../../../replay/board';
import { unitIds } from '../../../replay/state';
import { violation } from '../../../rules/registry';
import playTargetInvalid from '../../../rules/codes/playTargetInvalid';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:mercenarycontract';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{
    key: 'planet',
    kind: 'planet',
    options: ({ game, pack }) => [...new Set(systemSlots(game).flatMap(slot => (pack.tiles[tileIdOf(game, slot)]?.kind === 'home' ? [] : planetsOf(game, slot, pack))))],
  }],
  play: ({ game, state, shared, states, choices, pack, warnings }) => {
    if (state.tradeGoods < 2) warnings.push(violation('shortTradeGoods', { needed: 2, have: state.tradeGoods }, 'component'));
    state.tradeGoods = Math.max(0, state.tradeGoods - 2);
    const planet = String(choices.planet ?? '');
    if (!planet) return;
    const name = componentById(pack, id)?.name ?? id;
    const invalid = (reason: string): void => {
      warnings.push(violation(playTargetInvalid.code, { name, reason }, 'component'));
    };
    if (Object.values(pack.tiles).some(tile => tile.kind === 'home' && tile.planetIds.includes(planet))) invalid('home planet');
    const rivals = Object.values(shared.rivals ?? {});
    const occupied = [state, shared, ...rivals, ...Object.values(states)].some(
      view => unitIds(view.ground[planet] ?? {}).length > 0 || (view.pds[planet] ?? 0) > 0 || view.docks.includes(planet),
    ) || Object.values(game.enemyGround[planet] ?? {}).some(units => unitIds(units ?? {}).length > 0);
    if (occupied) invalid('units on it');
    for (const view of new Set([state, shared, ...rivals, ...Object.values(states)])) {
      if (view.control[planet] === 'me') delete view.control[planet];
    }
  },
};
