/**
 * JR-XS455-O (relic, an agent by the rulings): "ACTION: Exhaust this agent and choose a player, that player may spend 3
 * resources to place a structure on a planet they control. If they do not, they gain 1 trade good."
 *
 * Decided (pass 2): play. Chosen for myself: `choices.structure` and `choices.planetId` place the structure (warned of
 * on a planet I do not control), otherwise 1 trade good. The relic is exhausted by its play as an agent is; the replay
 * exhausts a relic only when its text says "exhaust this card". Pass 1 keeps it the hint it is today.
 */
import { tradeGoods } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import type { StructureKind } from '../../../types';
import type { ComponentEffect } from '../../types';

export const id = 'relic:titanprototype';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'player', kind: 'player', options: ctx => ctx.table.players.map(player => ctx.key(player.id)) },
    {
      key: 'structure', kind: 'option', options: () => ['pds', 'spacedock'],
      names: { pds: { ru: 'ПВО', en: 'PDS' }, spacedock: { ru: 'Космический док', en: 'Space dock' } },
    },
    { key: 'planetId', kind: 'planet', when: chosen => chosen.structure !== undefined },
  ],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    // Another player's structure or trade good belongs to their own state, which a rival's plan does not replay here.
    if (!ctx.held || ctx.playerOf(String(ctx.choices.player)) !== ctx.holder) return [];
    const kind = ctx.choices.structure as StructureKind | undefined;
    const planetId = String(ctx.choices.planetId ?? '');
    return kind && planetId ? ctx.buildStructures([{ kind, planetId }]) : [tradeGoods(ctx.holder, 1)];
  },
};
