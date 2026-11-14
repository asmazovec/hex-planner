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
import { tradeGoods } from '../../../../game/abilities/emit';
import type { GameEvent, Hooked } from '../../../../game/abilities/types';
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
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const have = ctx.my.tradeGoods;
    if (have < 2) ctx.warn(violation('shortTradeGoods', { needed: 2, have }, 'component'));
    const events: GameEvent[] = have > 0 ? [tradeGoods(ctx.holder, -Math.min(2, have))] : [];
    const planet = String(ctx.choices.planet ?? '');
    if (!planet) return events;
    const name = componentById(ctx.pack, id)?.name ?? id;
    const invalid = (reason: string): void => {
      ctx.warn(violation(playTargetInvalid.code, { name, reason }, 'component'));
    };
    if (Object.values(ctx.pack.tiles).some(tile => tile.kind === 'home' && tile.planetIds.includes(planet))) invalid('home planet');
    const here = ctx.board.planets[planet];
    const occupied = Object.values(here?.ground ?? {}).some(units => unitIds(units ?? {}).length > 0) || (here?.structures.pds ?? 0) > 0 || (here?.structures.spacedock ?? 0) > 0;
    if (occupied) invalid('units on it');
    if (here?.owner === ctx.holder) events.push({ type: 'PlanetLost', planet });
    return events;
  },
};
