import type { AbilityContext, GameEvent } from '../../../../../game/abilities/types';
import type { AnyWarningCode } from '../../../../types';
import { violation } from '../../../../rules/registry';

/** Two codes the rules registry does not list yet: they are told by name. */
export const code = (name: string): AnyWarningCode => name as AnyWarningCode;

/** The planet an explored card goes with: the one named in `choices.planetId`, else the first planet the entry lands on. */
export function exploredPlanet(ctx: AbilityContext): string | undefined {
  const named = ctx.choices.planetId;
  if (typeof named === 'string') return named;
  return ctx.entry?.type === 'tactical' ? ctx.entry.landings[0]?.planetId : undefined;
}

/** The card joins the attachments of the planet it was explored with (LRR 35.8). */
export function attachExplored(ctx: AbilityContext): GameEvent[] {
  const planet = exploredPlanet(ctx);
  return planet === undefined ? [] : [{ type: 'CardAttached', planet, card: ctx.id }];
}

/**
 * The condition of the hazardous cards that read "if you have at least 1 mech on this planet, or if you remove 1
 * infantry from this planet" (35.2): the events of the removal when the card's gain is made. Without a planet it warns
 * as with no ground forces and returns nothing (undefined): the gain is not made.
 */
export function exploredCondition(ctx: AbilityContext): GameEvent[] | undefined {
  const planetId = exploredPlanet(ctx) ?? '';
  const here = ctx.my.unitsOn(planetId);
  if ((here.mech ?? 0) > 0) return [];
  if ((here.infantry ?? 0) > 0) return [{ type: 'UnitsRemoved', player: ctx.holder, at: { planet: planetId }, units: { infantry: 1 } }];
  ctx.warn(violation(code('explorationCondition'), { planetId }));
  return undefined;
}

/** One trade good or one commodity spent for an effect: what is not there is warned of and never taken. */
export function spendOne(ctx: AbilityContext, commodity: boolean): GameEvent[] {
  const have = commodity ? ctx.my.commodities : ctx.my.tradeGoods;
  if (have < 1) ctx.warn(violation(commodity ? 'shortCommodities' : 'shortTradeGoods', { needed: 1, have }, 'component'));
  const spent = Math.min(1, have);
  return spent === 0 ? [] : [{ type: commodity ? 'CommoditiesChanged' : 'TradeGoodsChanged', player: ctx.holder, delta: -spent }];
}

/** Commodities gained, no more than the commodity value allows (21.2). */
export function gainCommodities(ctx: AbilityContext, amount: number): GameEvent[] {
  const gained = Math.max(0, Math.min(amount, ctx.commodityValue(ctx.holder) - ctx.my.commodities));
  return gained === 0 ? [] : [{ type: 'CommoditiesChanged', player: ctx.holder, delta: gained }];
}
